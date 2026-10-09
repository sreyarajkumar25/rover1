"""Unit tests for A* pathfinding optimality, obstacle routing, and energy weighting."""

import pytest
from backend.engine.environment import CellType
from backend.engine.pathfinding import a_star


def test_straight_line_path_optimality():
    # 5x5 open grid
    grid = [[CellType.OPEN for _ in range(5)] for _ in range(5)]
    start = (1, 1)
    goal = (1, 4)
    path, cost = a_star(start, goal, grid, move_open_cost=1)
    assert path is not None
    assert len(path) == 4  # (1,1), (1,2), (1,3), (1,4)
    assert cost == 3


def test_obstacle_avoidance():
    # 5x5 grid with a vertical wall between x=1 and x=3, with a gap at y=4
    grid = [[CellType.OPEN for _ in range(5)] for _ in range(5)]
    grid[0][2] = CellType.OBSTACLE
    grid[1][2] = CellType.OBSTACLE
    grid[2][2] = CellType.OBSTACLE
    grid[3][2] = CellType.OBSTACLE
    # Gap at (2, 4) is OPEN

    start = (1, 1)
    goal = (3, 1)
    path, cost = a_star(start, goal, grid, move_open_cost=1)
    assert path is not None
    # Path must detour through the gap (2, 4)
    assert (2, 4) in path
    assert cost > 2


def test_energy_cost_hazard_avoidance():
    """Rover prefers a longer detour through open terrain rather than crossing high-cost hazard."""
    # 5x5 grid: direct route through (2, 1) has HAZARD (cost 6), detour around has cost 3
    grid = [[CellType.OPEN for _ in range(5)] for _ in range(5)]
    grid[1][2] = CellType.HAZARD  # direct cell

    start = (1, 1)
    goal = (3, 1)
    # Open cost = 1, Hazard cost = 8
    path, cost = a_star(start, goal, grid, move_open_cost=1, move_hazard_cost=8)
    assert path is not None
    # Detour path: (1,1) -> (1,2) -> (2,2) -> (3,2) -> (3,1) = 4 steps * 1 = 4 cost
    # Direct path: (1,1) -> (2,1) [hazard: 8] -> (3,1) [open: 1] = 9 cost
    assert (2, 1) not in path
    assert cost == 4


def test_unreachable_goal():
    grid = [[CellType.OPEN for _ in range(5)] for _ in range(5)]
    grid[1][3] = CellType.OBSTACLE
    grid[3][3] = CellType.OBSTACLE
    grid[2][2] = CellType.OBSTACLE
    grid[2][4] = CellType.OBSTACLE
    # (3, 2) is completely boxed in
    start = (0, 0)
    goal = (3, 2)
    path, cost = a_star(start, goal, grid)
    assert path is None
    assert cost >= 999999
