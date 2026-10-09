"""A* Pathfinding implementation with energy-weighted costs and unknown terrain penalties."""

from __future__ import annotations
import heapq
from typing import Dict, List, Optional, Sequence, Set, Tuple
from backend.engine.environment import CellType


def heuristic(pos: Tuple[int, int], goal: Tuple[int, int], min_cost: int = 1) -> int:
    """Manhattan distance heuristic scaled by minimum movement cost (admissible & consistent)."""
    return (abs(pos[0] - goal[0]) + abs(pos[1] - goal[1])) * min_cost


def a_star(
    start: Tuple[int, int],
    goal: Tuple[int, int],
    known_map: Sequence[Sequence[Optional[int]]],
    allow_unknown: bool = False,
    move_open_cost: int = 1,
    move_hazard_cost: int = 4,
    unknown_penalty: int = 2,
    hazard_penalty_multiplier: float = 1.0,
) -> Tuple[Optional[List[Tuple[int, int]]], int]:
    """Finds optimal energy-cost path from start to goal using A*.

    Args:
        start: Starting (x, y) coordinate.
        goal: Destination (x, y) coordinate.
        known_map: 2D grid containing CellType or None (unknown).
        allow_unknown: If True, unknown cells are treated as traversable with penalty.
        move_open_cost: Energy cost for open/comm/data cells.
        move_hazard_cost: Energy cost for hazard cells.
        unknown_penalty: Cost assigned to unknown cells when allow_unknown is True.
        hazard_penalty_multiplier: Scaling factor for risk-averse strategies.

    Returns:
        (path, total_cost) where path is list of coordinates from start to goal,
        or (None, infinity) if no path is feasible.
    """
    if start == goal:
        return [start], 0

    height = len(known_map)
    if height == 0:
        return None, 999999
    width = len(known_map[0])

    gx, gy = goal
    if not (0 <= gx < width and 0 <= gy < height):
        return None, 999999

    # Goal cell check: if known obstacle, unreachable
    if known_map[gy][gx] == CellType.OBSTACLE:
        return None, 999999

    # Priority queue stores: (f_score, g_score, count, (x, y))
    counter = 0
    open_set: List[Tuple[float, int, int, Tuple[int, int]]] = []
    h_start = heuristic(start, goal, move_open_cost)
    heapq.heappush(open_set, (float(h_start), 0, counter, start))

    came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
    g_score: Dict[Tuple[int, int], int] = {start: 0}
    closed_set: Set[Tuple[int, int]] = set()

    while open_set:
        _, current_g, _, current = heapq.heappop(open_set)

        if current == goal:
            # Reconstruct path
            path = [current]
            curr = current
            while curr in came_from:
                curr = came_from[curr]
                path.append(curr)
            path.reverse()
            return path, current_g

        if current in closed_set:
            continue
        closed_set.add(current)

        cx, cy = current
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if not (0 <= nx < width and 0 <= ny < height):
                continue

            neighbor = (nx, ny)
            if neighbor in closed_set:
                continue

            cell_val = known_map[ny][nx]

            # Obstacle handling
            if cell_val == CellType.OBSTACLE:
                continue

            # Unknown cell handling
            if cell_val is None:
                if not allow_unknown:
                    continue
                step_cost = unknown_penalty
            elif cell_val == CellType.HAZARD:
                step_cost = int(move_hazard_cost * hazard_penalty_multiplier)
            else:
                # Open, Comm zone, Data site
                step_cost = move_open_cost

            tentative_g = current_g + step_cost
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                g_score[neighbor] = tentative_g
                h = heuristic(neighbor, goal, move_open_cost)
                f = tentative_g + h
                came_from[neighbor] = current
                counter += 1
                heapq.heappush(open_set, (float(f), tentative_g, counter, neighbor))

    return None, 999999


def find_path(
    start: Tuple[int, int],
    goal: Tuple[int, int],
    known_map: Sequence[Sequence[Optional[int]]],
    allow_unknown: bool = False,
    move_open_cost: int = 1,
    move_hazard_cost: int = 4,
    unknown_penalty: int = 2,
    hazard_penalty_multiplier: float = 1.0,
) -> Tuple[Optional[List[Tuple[int, int]]], int]:
    """Convenience wrapper for a_star."""
    return a_star(
        start=start,
        goal=goal,
        known_map=known_map,
        allow_unknown=allow_unknown,
        move_open_cost=move_open_cost,
        move_hazard_cost=move_hazard_cost,
        unknown_penalty=unknown_penalty,
        hazard_penalty_multiplier=hazard_penalty_multiplier,
    )


def find_path_to_nearest_goal(
    start: Tuple[int, int],
    goals: Sequence[Tuple[int, int]],
    known_map: Sequence[Sequence[Optional[int]]],
    allow_unknown: bool = False,
    move_open_cost: int = 1,
    move_hazard_cost: int = 4,
    hazard_penalty_multiplier: float = 1.0,
) -> Tuple[Optional[List[Tuple[int, int]]], int, Optional[Tuple[int, int]]]:
    """Finds the lowest cost path to any goal among a set of candidate goals."""
    best_path: Optional[List[Tuple[int, int]]] = None
    best_cost = 999999
    best_goal: Optional[Tuple[int, int]] = None

    for goal in goals:
        path, cost = a_star(
            start=start,
            goal=goal,
            known_map=known_map,
            allow_unknown=allow_unknown,
            move_open_cost=move_open_cost,
            move_hazard_cost=move_hazard_cost,
            hazard_penalty_multiplier=hazard_penalty_multiplier,
        )
        if path is not None and cost < best_cost:
            best_cost = cost
            best_path = path
            best_goal = goal

    return best_path, best_cost, best_goal
