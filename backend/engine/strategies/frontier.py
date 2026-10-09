"""Frontier-based Strategy: maximizes expected information gain per unit energy path cost."""

from __future__ import annotations
from typing import Optional, Tuple
from backend.engine.environment import Environment
from backend.engine.pathfinding import a_star
from backend.engine.rover import Rover
from backend.engine.safety import SafetyAssessment
from backend.engine.sensing import SensingManager
from backend.engine.strategies.base import BaseStrategy


class FrontierStrategy(BaseStrategy):
    name = "frontier"
    description = "Frontier-based exploration maximizing information gain over energy cost."

    def select_target(
        self,
        rover: Rover,
        sensing: SensingManager,
        environment: Environment,
        safety: SafetyAssessment,
    ) -> Optional[Tuple[int, int]]:
        frontiers = sensing.get_frontiers()
        uncollected_data = [
            pos
            for pos, val in sensing.known_data_sites.items()
            if pos not in environment.collected_sites
        ]

        best_target: Optional[Tuple[int, int]] = None
        best_score: float = -1.0

        # Evaluate candidate frontiers
        for frontier in frontiers:
            path, cost = a_star(
                rover.pos,
                frontier,
                sensing.known_map,
                allow_unknown=False,
                move_open_cost=rover.config.move_open_cost,
                move_hazard_cost=rover.config.move_hazard_cost,
            )
            if path is None or cost == 0:
                continue

            info_gain = sensing.count_unknown_in_radius(
                frontier, sensing.sensor_radius
            )
            score = float(info_gain) / (cost + 1.0)

            if score > best_score:
                best_score = score
                best_target = frontier

        # Also evaluate known data sites with a high utility weight
        for site in uncollected_data:
            path, cost = a_star(
                rover.pos,
                site,
                sensing.known_map,
                allow_unknown=False,
                move_open_cost=rover.config.move_open_cost,
                move_hazard_cost=rover.config.move_hazard_cost,
            )
            if path is None:
                continue

            val = sensing.known_data_sites.get(site, 20)
            data_score = (val * 1.5) / (cost + 1.0)
            if data_score > best_score:
                best_score = data_score
                best_target = site

        if best_target is not None:
            return best_target

        return safety.nearest_comm_zone
