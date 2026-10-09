"""Safety and return guarantee module.

Evaluates return-safety condition each step:
  energy_remaining >= cost_to_nearest_comm_zone + safety_margin
Forcing the rover into RETURNING mode before it becomes stranded.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Tuple
from backend.engine.environment import Environment
from backend.engine.pathfinding import a_star
from backend.engine.rover import Rover
from backend.engine.sensing import SensingManager


@dataclass
class SafetyAssessment:
    is_safe: bool
    return_cost: int
    nearest_comm_zone: Optional[Tuple[int, int]]
    return_path: Optional[List[Tuple[int, int]]]
    safety_margin: int
    buffer_remaining: int
    reason: str


def evaluate_return_safety(
    rover: Rover,
    sensing: SensingManager,
    environment: Environment,
    safety_margin: int = 5,
) -> SafetyAssessment:
    """Evaluates whether current rover energy is sufficient to guarantee safe return.

    Finds the shortest reachable communication zone on known terrain (falling back to
    cautious exploration across unknown cells if essential). If energy is at or below
    (return_cost + safety_margin), returns is_safe = False.
    """
    comm_candidates = list(sensing.known_comm_zones)
    if not comm_candidates:
        # Guarantee fallback to known start position (which is always a comm zone)
        comm_candidates = [environment.start_pos]

    best_cost = 999999
    best_path: Optional[List[Tuple[int, int]]] = None
    best_comm: Optional[Tuple[int, int]] = None

    # First attempt: find path strictly through known passable terrain
    for comm in comm_candidates:
        path, cost = a_star(
            start=rover.pos,
            goal=comm,
            known_map=sensing.known_map,
            allow_unknown=False,
            move_open_cost=rover.config.move_open_cost,
            move_hazard_cost=rover.config.move_hazard_cost,
        )
        if path is not None and cost < best_cost:
            best_cost = cost
            best_path = path
            best_comm = comm

    # Fallback attempt: if no pure known path exists, allow cautious traversal of unknown cells
    if best_path is None:
        for comm in comm_candidates:
            path, cost = a_star(
                start=rover.pos,
                goal=comm,
                known_map=sensing.known_map,
                allow_unknown=True,
                move_open_cost=rover.config.move_open_cost,
                move_hazard_cost=rover.config.move_hazard_cost,
                unknown_penalty=rover.config.move_open_cost * 2,
            )
            if path is not None and cost < best_cost:
                best_cost = cost
                best_path = path
                best_comm = comm

    if best_comm is None or best_path is None:
        # Trapped with no feasible path
        return SafetyAssessment(
            is_safe=False,
            return_cost=999999,
            nearest_comm_zone=None,
            return_path=None,
            safety_margin=safety_margin,
            buffer_remaining=-999999,
            reason="No known passable route to any communication zone.",
        )

    buffer_remaining = rover.energy - (best_cost + safety_margin)
    is_safe = buffer_remaining > 0

    reason = (
        f"Safe: energy {rover.energy} > return cost {best_cost} + margin {safety_margin} (buffer: {buffer_remaining})"
        if is_safe
        else f"Returning forced: energy {rover.energy} <= return cost {best_cost} + margin {safety_margin}"
    )

    return SafetyAssessment(
        is_safe=is_safe,
        return_cost=best_cost,
        nearest_comm_zone=best_comm,
        return_path=best_path,
        safety_margin=safety_margin,
        buffer_remaining=buffer_remaining,
        reason=reason,
    )
