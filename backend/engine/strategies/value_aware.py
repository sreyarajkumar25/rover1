"""Value-Aware Strategy: calculates expected net utility and ROI of data sites against round-trip costs."""

from __future__ import annotations
from typing import Optional, Tuple
from backend.engine.environment import Environment
from backend.engine.pathfinding import a_star
from backend.engine.rover import Rover
from backend.engine.safety import SafetyAssessment
from backend.engine.sensing import SensingManager
from backend.engine.strategies.base import BaseStrategy


class ValueAwareStrategy(BaseStrategy):
    name = "value_aware"
    description = "Value-aware optimization evaluating expected data value against round-trip energy expenditure."

    def select_target(
        self,
        rover: Rover,
        sensing: SensingManager,
        environment: Environment,
        safety: SafetyAssessment,
    ) -> Optional[Tuple[int, int]]:
        comm_candidates = list(sensing.known_comm_zones) or [environment.start_pos]
        uncollected_data = [
            pos
            for pos, val in sensing.known_data_sites.items()
            if pos not in environment.collected_sites
        ]

        best_site: Optional[Tuple[int, int]] = None
        best_efficiency = -1.0

        # Evaluate ROI for each known data site
        for site in uncollected_data:
            path_to_site, cost_to_site = a_star(
                rover.pos,
                site,
                sensing.known_map,
                allow_unknown=False,
                move_open_cost=rover.config.move_open_cost,
                move_hazard_cost=rover.config.move_hazard_cost,
            )
            if path_to_site is None:
                continue

            # Estimate cost from site to nearest comm zone
            min_site_to_comm = 999999
            for comm in comm_candidates:
                _, c_comm = a_star(
                    site,
                    comm,
                    sensing.known_map,
                    allow_unknown=False,
                    move_open_cost=rover.config.move_open_cost,
                    move_hazard_cost=rover.config.move_hazard_cost,
                )
                if c_comm < min_site_to_comm:
                    min_site_to_comm = c_comm

            total_roundtrip = cost_to_site + min_site_to_comm + rover.config.collect_cost + rover.config.upload_cost

            # Check if rover has sufficient energy to reach site and return safely
            if rover.energy >= (total_roundtrip + safety.safety_margin):
                value = sensing.known_data_sites.get(site, 20)
                # Value density: value gained per energy unit invested
                efficiency = float(value) / max(1.0, float(total_roundtrip))
                if efficiency > best_efficiency:
                    best_efficiency = efficiency
                    best_site = site

        if best_site is not None:
            return best_site

        # If carrying substantial data and energy is moderate, prioritize comm zone upload first
        if rover.data_carried >= 50 and safety.nearest_comm_zone is not None:
            return safety.nearest_comm_zone

        # Otherwise, explore frontiers with highest info gain per cost
        frontiers = sensing.get_frontiers()
        best_frontier = None
        best_f_score = -1.0

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

            if (rover.energy - cost) > (safety.return_cost + safety.safety_margin):
                gain = sensing.count_unknown_in_radius(frontier, sensing.sensor_radius)
                score = float(gain) / (cost + 1.0)
                if score > best_f_score:
                    best_f_score = score
                    best_frontier = frontier

        if best_frontier is not None:
            return best_frontier

        return safety.nearest_comm_zone
