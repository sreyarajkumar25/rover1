"""Risk-Aware Strategy: penalizes hazards, avoids uncertain paths, and adapts safety margin."""

from __future__ import annotations
from typing import Optional, Tuple
from backend.engine.environment import CellType, Environment
from backend.engine.pathfinding import a_star
from backend.engine.rover import Rover
from backend.engine.safety import SafetyAssessment
from backend.engine.sensing import SensingManager
from backend.engine.strategies.base import BaseStrategy


class RiskAwareStrategy(BaseStrategy):
    name = "risk_aware"
    description = "Risk-averse exploration heavily penalizing hazards and using adaptive safety buffers."

    def select_target(
        self,
        rover: Rover,
        sensing: SensingManager,
        environment: Environment,
        safety: SafetyAssessment,
    ) -> Optional[Tuple[int, int]]:
        # Compute adaptive safety margin
        # Buffer increases with distance from comm zone and proximity to hazards
        distance_to_comm = safety.return_cost
        local_hazards = 0
        rx, ry = rover.pos
        for dy in (-2, -1, 0, 1, 2):
            for dx in (-2, -1, 0, 1, 2):
                nx, ny = rx + dx, ry + dy
                if 0 <= nx < sensing.width and 0 <= ny < sensing.height:
                    if sensing.known_map[ny][nx] == CellType.HAZARD:
                        local_hazards += 1

        adaptive_buffer_needed = safety.safety_margin + int(distance_to_comm * 0.15) + local_hazards
        if rover.energy <= (safety.return_cost + adaptive_buffer_needed):
            # Preemptively return
            return safety.nearest_comm_zone

        # Evaluate targets with hazard penalty multiplier
        hazard_penalty = 3.0
        frontiers = sensing.get_frontiers()
        uncollected_data = [
            pos
            for pos, val in sensing.known_data_sites.items()
            if pos not in environment.collected_sites
        ]

        best_target = None
        best_score = -1e9

        # Evaluate data sites first if safe
        for site in uncollected_data:
            path, cost = a_star(
                rover.pos,
                site,
                sensing.known_map,
                allow_unknown=False,
                move_open_cost=rover.config.move_open_cost,
                move_hazard_cost=int(rover.config.move_hazard_cost * hazard_penalty),
            )
            if path is None:
                continue

            # Ensure round trip back to comm zone is safe
            if (rover.energy - cost) > (safety.return_cost + adaptive_buffer_needed):
                val = sensing.known_data_sites.get(site, 25)
                score = val * 2.0 - cost
                if score > best_score:
                    best_score = score
                    best_target = site

        if best_target is not None:
            return best_target

        # Evaluate frontiers with strict safety margin
        for frontier in frontiers:
            path, cost = a_star(
                rover.pos,
                frontier,
                sensing.known_map,
                allow_unknown=False,
                move_open_cost=rover.config.move_open_cost,
                move_hazard_cost=int(rover.config.move_hazard_cost * hazard_penalty),
            )
            if path is None or cost == 0:
                continue

            # Check if rover can safely explore frontier and still return
            if (rover.energy - cost) <= (safety.return_cost + adaptive_buffer_needed):
                continue

            info_gain = sensing.count_unknown_in_radius(frontier, sensing.sensor_radius)
            score = float(info_gain) / (cost + 1.0)
            if score > best_score:
                best_score = score
                best_target = frontier

        if best_target is not None:
            return best_target

        return safety.nearest_comm_zone
