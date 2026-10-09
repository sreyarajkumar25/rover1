"""Simulation core loop, state machine, dynamic events, and snapshot generation."""

from __future__ import annotations
from dataclasses import dataclass, field
import random
from typing import Any, Dict, List, Optional, Tuple

from backend.engine.environment import CellType, Environment
from backend.engine.metrics import RunMetrics, compute_run_metrics
from backend.engine.pathfinding import a_star
from backend.engine.rover import Rover, RoverConfig, RoverMode
from backend.engine.safety import evaluate_return_safety, SafetyAssessment
from backend.engine.sensing import SensingManager
from backend.engine.strategies import get_strategy
from backend.engine.strategies.base import BaseStrategy


@dataclass
class SimulationConfig:
    seed: int = 42
    width: int = 25
    height: int = 25
    strategy: str = "greedy"
    max_energy: int = 220
    sensor_radius: int = 4
    block_rate: float = 0.04
    safety_margin: int = 6
    hazard_density: float = 0.08
    obstacle_density: float = 0.20
    num_data_sites: int = 6
    num_comm_zones: int = 2
    hard_mode: bool = False
    use_line_of_sight: bool = True


class Simulation:
    """Manages the full lifecycle and step execution of a rover exploration mission."""

    def __init__(self, config: SimulationConfig = SimulationConfig()) -> None:
        self.config = config
        self.rng = random.Random(config.seed)

        self.environment = Environment(
            width=config.width,
            height=config.height,
            seed=config.seed,
            obstacle_density=config.obstacle_density,
            hazard_density=config.hazard_density,
            num_data_sites=config.num_data_sites,
            num_comm_zones=config.num_comm_zones,
            hard_mode=config.hard_mode,
        )

        rover_cfg = RoverConfig(
            max_energy=config.max_energy,
            move_open_cost=1,
            move_hazard_cost=4,
            collect_cost=2,
            upload_cost=2,
        )
        self.rover = Rover(start_pos=self.environment.start_pos, config=rover_cfg)

        self.sensing = SensingManager(
            width=config.width,
            height=config.height,
            sensor_radius=config.sensor_radius,
            use_line_of_sight=config.use_line_of_sight,
        )

        self.strategy: BaseStrategy = get_strategy(config.strategy)

        self.step_count: int = 0
        self.replans: int = 0
        self.blocked_events: int = 0
        self.time_to_first_upload: Optional[int] = None
        self.total_data_collected: int = 0

        self.planned_path: List[Tuple[int, int]] = []
        self.current_target: Optional[Tuple[int, int]] = None

        # Sense initial environment around start position
        self.sensing.sense(self.rover.pos, self.environment)

        # Track diffs of true_map if modified dynamically
        self.map_diffs: List[Dict[str, Any]] = []

    def get_snapshot(self, full_map: bool = False, events: Optional[List[str]] = None) -> Dict[str, Any]:
        """Constructs a snapshot adhering strictly to the shared API contract."""
        events = events or []

        # True map: send full 2D grid only when full_map=True (first step)
        true_map_payload: Optional[List[List[int]]] = (
            self.environment.grid if full_map else None
        )

        # Known map: 2D array of (int | None)
        known_map_payload = [
            [cell for cell in row] for row in self.sensing.known_map
        ]

        safety = evaluate_return_safety(
            self.rover, self.sensing, self.environment, self.config.safety_margin
        )

        metrics = {
            "explored_pct": self.sensing.get_explored_percentage(),
            "replans": self.replans,
            "energy_used": self.rover.energy_used,
            "data_collected": self.total_data_collected,
        }

        snapshot: Dict[str, Any] = {
            "step": self.step_count,
            "grid_size": [self.environment.width, self.environment.height],
            "true_map": true_map_payload,
            "known_map": known_map_payload,
            "rover": {
                "pos": [self.rover.x, self.rover.y],
                "energy": self.rover.energy,
                "max_energy": self.rover.max_energy,
                "data_carried": self.rover.data_carried,
                "data_uploaded": self.rover.data_uploaded,
                "mode": self.rover.mode.value,
            },
            "planned_path": [[x, y] for (x, y) in self.planned_path],
            "trail": [[x, y] for (x, y) in self.rover.trail],
            "frontiers": [[x, y] for (x, y) in self.sensing.get_frontiers()],
            "return_cost": safety.return_cost if safety.return_cost < 999999 else -1,
            "events": events,
            "metrics": metrics,
        }

        # Include diffs if any cells changed dynamically and full map wasn't sent
        if not full_map and self.map_diffs:
            snapshot["map_diffs"] = list(self.map_diffs)
            self.map_diffs.clear()

        return snapshot

    def step(self) -> Dict[str, Any]:
        """Executes a single simulation tick."""
        if self.rover.is_terminal():
            return self.get_snapshot(full_map=False, events=[])

        self.step_count += 1
        events: List[str] = []

        # 1. Evaluate Return Safety
        safety = evaluate_return_safety(
            self.rover, self.sensing, self.environment, self.config.safety_margin
        )

        # 2. Check Comm Zone Upload & Return Terminal Condition
        is_at_comm = self.environment.is_comm_zone(self.rover.x, self.rover.y)

        if is_at_comm and self.rover.data_carried > 0:
            uploaded = self.rover.upload_data()
            events.append(f"upload:{uploaded}")
            if self.time_to_first_upload is None:
                self.time_to_first_upload = self.step_count

        # Check if returning rover safely reached base and finished mission
        all_sites_cleared = len(self.environment.collected_sites) >= len(self.environment.data_values)
        if is_at_comm and (self.rover.mode == RoverMode.RETURNING or all_sites_cleared):
            if self.rover.data_carried == 0 and (all_sites_cleared or not safety.is_safe or not self.sensing.get_frontiers()):
                self.rover.set_mode(RoverMode.SUCCESS)
                events.append("mode_change:SUCCESS")
                return self.get_snapshot(full_map=False, events=events)

        # Force RETURNING mode if safety rule is violated
        if not safety.is_safe and self.rover.mode != RoverMode.RETURNING:
            self.rover.set_mode(RoverMode.RETURNING)
            events.append(f"mode_change:RETURNING")
            events.append(f"safety_trigger:energy_{self.rover.energy}_cost_{safety.return_cost}")
            # Replan path immediately towards nearest comm zone
            if safety.return_path:
                self.planned_path = safety.return_path
                self.current_target = safety.nearest_comm_zone
            else:
                self.planned_path = []
                self.current_target = None
            self.replans += 1
            events.append("replan")

        # 3. Dynamic Obstacle Blocking Event
        blocked_coord = self.environment.trigger_dynamic_blocking(
            self.rng, self.config.block_rate, rover_pos=self.rover.pos
        )
        if blocked_coord is not None:
            bx, by = blocked_coord
            self.blocked_events += 1
            events.append(f"blocked:[{bx},{by}]")
            self.map_diffs.append({"pos": [bx, by], "val": CellType.OBSTACLE})

            # If rover has already explored this cell, update known_map
            if self.sensing.is_known(bx, by):
                self.sensing.known_map[by][bx] = CellType.OBSTACLE

            # If blocked cell intersects current planned path, invalidate path
            if (bx, by) in self.planned_path:
                self.planned_path = []
                self.current_target = None
                self.replans += 1
                events.append("replan:path_blocked")

        # 4. Check Data Site Collection
        if (self.rover.x, self.rover.y) in self.environment.data_values:
            val = self.environment.collect_data_at(self.rover.x, self.rover.y)
            if val > 0:
                self.rover.collect_data(val)
                self.total_data_collected += val
                events.append(f"collect:{val}")
                # Remove from known_data_sites once collected
                self.sensing.known_data_sites.pop((self.rover.x, self.rover.y), None)
                if self.rover.mode != RoverMode.RETURNING:
                    self.rover.set_mode(RoverMode.COLLECTING)

        # 5. Path Planning / Replanning
        # Ensure planned path is aligned with current rover pos
        if self.planned_path and self.planned_path[0] == self.rover.pos:
            self.planned_path.pop(0)

        need_new_target = (
            not self.planned_path
            or self.current_target is None
            or self.current_target == self.rover.pos
        )

        if need_new_target:
            if self.rover.mode == RoverMode.RETURNING:
                target_comm = safety.nearest_comm_zone or self.environment.start_pos
                path, _ = a_star(
                    self.rover.pos,
                    target_comm,
                    self.sensing.known_map,
                    allow_unknown=True,
                    move_open_cost=self.rover.config.move_open_cost,
                    move_hazard_cost=self.rover.config.move_hazard_cost,
                )
                if path:
                    self.planned_path = path[1:] if path[0] == self.rover.pos else path
                    self.current_target = target_comm
                    self.replans += 1
                    events.append("replan:return_path")
            else:
                target = self.strategy.select_target(
                    self.rover, self.sensing, self.environment, safety
                )
                if target is None:
                    # Switch to returning
                    self.rover.set_mode(RoverMode.RETURNING)
                    events.append("mode_change:RETURNING")
                    target = safety.nearest_comm_zone or self.environment.start_pos

                path, _ = a_star(
                    self.rover.pos,
                    target,
                    self.sensing.known_map,
                    allow_unknown=False,
                    move_open_cost=self.rover.config.move_open_cost,
                    move_hazard_cost=self.rover.config.move_hazard_cost,
                )
                if not path:
                    # Try allowing unknown cells
                    path, _ = a_star(
                        self.rover.pos,
                        target,
                        self.sensing.known_map,
                        allow_unknown=True,
                        move_open_cost=self.rover.config.move_open_cost,
                        move_hazard_cost=self.rover.config.move_hazard_cost,
                    )

                if path:
                    self.planned_path = path[1:] if path[0] == self.rover.pos else path
                    self.current_target = target
                    self.replans += 1
                    events.append("replan")
                    if self.rover.mode not in (RoverMode.COLLECTING, RoverMode.RETURNING):
                        self.rover.set_mode(RoverMode.EXPLORING)

        # 6. Execute Movement Step
        if self.planned_path:
            next_pos = self.planned_path.pop(0)
            target_cell = self.environment.get_cell(next_pos[0], next_pos[1])

            # Safety collision check
            if target_cell == CellType.OBSTACLE:
                # Path unexpectedly blocked! Put position back, force replan next tick
                self.sensing.known_map[next_pos[1]][next_pos[0]] = CellType.OBSTACLE
                self.planned_path = []
                self.replans += 1
                events.append("replan:obstacle_encountered")
            else:
                self.rover.move_to(next_pos[0], next_pos[1], target_cell)

        # 7. Sense from new position
        self.sensing.sense(self.rover.pos, self.environment)

        # 8. Terminal Check (Energy Depletion)
        if self.rover.energy <= 0:
            if self.environment.is_comm_zone(self.rover.x, self.rover.y):
                # Managed to upload at the last breath
                if self.rover.data_carried > 0:
                    self.rover.upload_data()
                self.rover.set_mode(RoverMode.SUCCESS)
                events.append("mode_change:SUCCESS")
            else:
                self.rover.set_mode(RoverMode.LOST)
                events.append("mode_change:LOST")

        return self.get_snapshot(full_map=False, events=events)

    def run_to_completion(self, max_steps: int = 1500) -> Tuple[List[Dict[str, Any]], RunMetrics]:
        """Runs the entire simulation until terminal state or max_steps reached."""
        snapshots: List[Dict[str, Any]] = []
        # First snapshot includes full true_map
        first_snap = self.get_snapshot(full_map=True, events=["mission_start"])
        snapshots.append(first_snap)

        while not self.rover.is_terminal() and self.step_count < max_steps:
            snap = self.step()
            snapshots.append(snap)

        # If ended without reaching terminal mode, conclude outcome
        if not self.rover.is_terminal():
            if self.environment.is_comm_zone(self.rover.x, self.rover.y):
                self.rover.set_mode(RoverMode.SUCCESS)
            else:
                self.rover.set_mode(RoverMode.LOST)

        final_metrics = compute_run_metrics(
            explored_pct=self.sensing.get_explored_percentage(),
            data_collected=self.total_data_collected,
            data_uploaded=self.rover.data_uploaded,
            energy_used=self.rover.energy_used,
            energy_remaining=self.rover.energy,
            steps=self.step_count,
            replans=self.replans,
            blocked_events=self.blocked_events,
            mission_outcome=self.rover.mode.value,
            time_to_first_upload=self.time_to_first_upload,
        )

        return snapshots, final_metrics
