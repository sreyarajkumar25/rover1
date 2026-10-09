"""Unit tests for Environment: terrain generation, reachability guarantees, and dynamic blocking."""

import pytest
from collections import deque
from backend.engine.environment import CellType, Environment


def test_terrain_dimensions_and_border_obstacles():
    env = Environment(width=20, height=20, seed=123)
    assert env.width == 20
    assert env.height == 20
    # Outer borders should be obstacles
    for x in range(20):
        assert env.get_cell(x, 0) == CellType.OBSTACLE
        assert env.get_cell(x, 19) == CellType.OBSTACLE
    for y in range(20):
        assert env.get_cell(0, y) == CellType.OBSTACLE
        assert env.get_cell(19, y) == CellType.OBSTACLE


def test_reachability_guarantee_for_all_targets():
    """Verify that every single data site and comm zone is strictly reachable from start."""
    for seed in [1, 42, 99, 555]:
        env = Environment(
            width=25, height=25, seed=seed, num_data_sites=6, num_comm_zones=2
        )
        sx, sy = env.start_pos
        assert env.get_cell(sx, sy) in (CellType.OPEN, CellType.COMM_ZONE)

        # BFS from start_pos
        visited = set()
        queue = deque([(sx, sy)])
        visited.add((sx, sy))

        while queue:
            cx, cy = queue.popleft()
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = cx + dx, cy + dy
                if (
                    env.in_bounds(nx, ny)
                    and (nx, ny) not in visited
                    and env.get_cell(nx, ny) != CellType.OBSTACLE
                ):
                    visited.add((nx, ny))
                    queue.append((nx, ny))

        # Check all comm zones are visited
        for cz in env.comm_zones:
            assert cz in visited, f"Comm zone {cz} not reachable in seed {seed}!"

        # Check all data sites are visited
        for ds in env.data_values.keys():
            assert ds in visited, f"Data site {ds} not reachable in seed {seed}!"


def test_hard_mode_hazard_generation():
    env = Environment(width=25, height=25, seed=77, hard_mode=True)
    assert env.hard_mode is True
    # Highest value data site should exist
    highest_val = max(env.data_values.values())
    highest_pos = [p for p, v in env.data_values.items() if v == highest_val][0]
    # Check that at least some neighbors of highest_pos are hazards
    hx, hy = highest_pos
    hazard_neighbors = [
        (hx + dx, hy + dy)
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]
        if env.get_cell(hx + dx, hy + dy) == CellType.HAZARD
    ]
    assert len(hazard_neighbors) > 0


def test_dynamic_blocking():
    import random
    env = Environment(width=20, height=20, seed=42)
    rng = random.Random(42)
    blocked = env.trigger_dynamic_blocking(rng, block_rate=1.0)
    assert blocked is not None
    bx, by = blocked
    assert env.get_cell(bx, by) == CellType.OBSTACLE
    # Blocked cell cannot be a comm zone
    assert (bx, by) not in env.comm_zones
