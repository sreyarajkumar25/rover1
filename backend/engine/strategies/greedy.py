"""Greedy Strategy: navigates to the nearest uncollected data site or nearest frontier cell."""

from __future__ import annotations
from typing import Optional, Tuple
from backend.engine.environment import Environment
from backend.engine.pathfinding import a_star
from backend.engine.rover import Rover
from backend.engine.safety import SafetyAssessment
from backend.engine.sensing import SensingManager
from backend.engine.strategies.base import BaseStrategy


class GreedyStrategy(BaseStrategy):
    name = "greedy"
    description = "Greedy selection prioritizing the closest reachable data site or nearest frontier."

    def select_target(
        self,
        rover: Rover,
        sensing: SensingManager,
        environment: Environment,
        safety: SafetyAssessment,
    ) -> Optional[Tuple[int, int]]:
        # 1. Check known uncollected data sites
        uncollected_data_sites = [
            pos
            for pos, val in sensing.known_data_sites.items()
            if pos not in environment.collected_sites
        ]

        if uncollected_data_sites:
            best_target = None
            lowest_cost = 999999
            for site in uncollected_data_sites:
                path, cost = a_star(
                    rover.pos,
                    site,
                    sensing.known_map,
                    allow_unknown=False,
                    move_open_cost=rover.config.move_open_cost,
                    move_hazard_cost=rover.config.move_hazard_cost,
                )
                if path is not None and cost < lowest_cost:
                    lowest_cost = cost
                    best_target = site

            if best_target is not None:
                return best_target

        # 2. Target the nearest frontier to explore more of the unknown world
        frontiers = sensing.get_frontiers()
        if frontiers:
            best_frontier = None
            lowest_f_cost = 999999
            for frontier in frontiers:
                path, cost = a_star(
                    rover.pos,
                    frontier,
                    sensing.known_map,
                    allow_unknown=False,
                    move_open_cost=rover.config.move_open_cost,
                    move_hazard_cost=rover.config.move_hazard_cost,
                )
                if path is not None and cost < lowest_f_cost:
                    lowest_f_cost = cost
                    best_frontier = frontier

            if best_frontier is not None:
                return best_frontier

        # 3. If no frontiers or data sites remaining, target nearest comm zone
        return safety.nearest_comm_zone
