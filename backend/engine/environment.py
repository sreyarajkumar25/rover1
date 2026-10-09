"""Environment module for Rover Mission Control.

Provides grid representation, cellular automata terrain generation, reachability
guarantees, hard-mode hazard placement, and dynamic mid-mission obstacle blocking.
"""

from __future__ import annotations
from enum import IntEnum
import random
from collections import deque
from typing import Dict, List, Optional, Set, Tuple


class CellType(IntEnum):
    OPEN = 0
    OBSTACLE = 1
    HAZARD = 2
    COMM_ZONE = 3
    DATA_SITE = 4


class Environment:
    """2D Grid world with terrain generation, reachability guarantees, and dynamic events."""

    def __init__(
        self,
        width: int = 30,
        height: int = 30,
        seed: int = 42,
        obstacle_density: float = 0.22,
        hazard_density: float = 0.08,
        num_data_sites: int = 5,
        num_comm_zones: int = 2,
        hard_mode: bool = False,
    ) -> None:
        self.width = width
        self.height = height
        self.seed = seed
        self.obstacle_density = obstacle_density
        self.hazard_density = hazard_density
        self.num_data_sites = num_data_sites
        self.num_comm_zones = max(1, num_comm_zones)
        self.hard_mode = hard_mode

        self.rng = random.Random(seed)
        self.start_pos: Tuple[int, int] = (1, 1)

        # 2D grid: grid[y][x]
        self.grid: List[List[int]] = [
            [CellType.OPEN for _ in range(width)] for _ in range(height)
        ]

        # Coordinates -> data value
        self.data_values: Dict[Tuple[int, int], int] = {}
        # Track collected data site coordinates
        self.collected_sites: Set[Tuple[int, int]] = set()

        # Comm zone coordinates
        self.comm_zones: List[Tuple[int, int]] = []

        self._generate_terrain()
        self._ensure_reachability()

    def in_bounds(self, x: int, y: int) -> bool:
        """Check if coordinates (x, y) lie within the grid boundaries."""
        return 0 <= x < self.width and 0 <= y < self.height

    def get_cell(self, x: int, y: int) -> int:
        """Get cell type at (x, y)."""
        if not self.in_bounds(x, y):
            return CellType.OBSTACLE
        return self.grid[y][x]

    def set_cell(self, x: int, y: int, cell_type: int) -> None:
        """Set cell type at (x, y)."""
        if self.in_bounds(x, y):
            self.grid[y][x] = int(cell_type)

    def _generate_terrain(self) -> None:
        """Generates natural-looking terrain using cellular automata smoothing."""
        # 1. Random noise initialization for obstacles
        raw_grid = [
            [
                CellType.OBSTACLE
                if self.rng.random() < self.obstacle_density
                else CellType.OPEN
                for _ in range(self.width)
            ]
            for _ in range(self.height)
        ]

        # 2. Cellular Automata smoothing passes (2 iterations)
        for _ in range(2):
            next_grid = [
                [CellType.OPEN for _ in range(self.width)]
                for _ in range(self.height)
            ]
            for y in range(self.height):
                for x in range(self.width):
                    # Count obstacle neighbors in 3x3 window
                    wall_count = 0
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            nx, ny = x + dx, y + dy
                            if not (0 <= nx < self.width and 0 <= ny < self.height):
                                wall_count += 1
                            elif raw_grid[ny][nx] == CellType.OBSTACLE:
                                wall_count += 1
                    # 4-5 rule for cave/crater formation
                    next_grid[y][x] = (
                        CellType.OBSTACLE if wall_count >= 5 else CellType.OPEN
                    )
            raw_grid = next_grid

        self.grid = raw_grid

        # Clear perimeter borders or keep open
        for x in range(self.width):
            self.grid[0][x] = CellType.OBSTACLE
            self.grid[self.height - 1][x] = CellType.OBSTACLE
        for y in range(self.height):
            self.grid[y][0] = CellType.OBSTACLE
            self.grid[y][self.width - 1] = CellType.OBSTACLE

        # Ensure start position is open
        sx, sy = self.start_pos
        self.grid[sy][sx] = CellType.OPEN
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = sx + dx, sy + dy
            if self.in_bounds(nx, ny) and (nx != 0 and ny != 0):
                self.grid[ny][nx] = CellType.OPEN

        # 3. Add Hazard zones (radiation/quicksand)
        open_cells = [
            (x, y)
            for y in range(1, self.height - 1)
            for x in range(1, self.width - 1)
            if self.grid[y][x] == CellType.OPEN and (x, y) != self.start_pos
        ]
        self.rng.shuffle(open_cells)

        num_hazard_seeds = max(1, int(len(open_cells) * self.hazard_density * 0.4))
        hazard_seeds = open_cells[:num_hazard_seeds]
        hazard_cells: Set[Tuple[int, int]] = set(hazard_seeds)

        # Grow hazard clusters
        for hx, hy in hazard_seeds:
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                if self.rng.random() < 0.5:
                    nx, ny = hx + dx, hy + dy
                    if (
                        self.in_bounds(nx, ny)
                        and self.grid[ny][nx] == CellType.OPEN
                        and (nx, ny) != self.start_pos
                    ):
                        hazard_cells.add((nx, ny))

        for hx, hy in hazard_cells:
            self.grid[hy][hx] = CellType.HAZARD

        # 4. Place Comm Zones
        # First comm zone is placed at start position to guarantee return basecamp
        self.comm_zones = [self.start_pos]
        self.grid[self.start_pos[1]][self.start_pos[0]] = CellType.COMM_ZONE

        # Additional comm zones placed strategically further out
        available_open = [
            (x, y)
            for y in range(1, self.height - 1)
            for x in range(1, self.width - 1)
            if self.grid[y][x] in (CellType.OPEN, CellType.HAZARD)
            and (x, y) not in self.comm_zones
            and abs(x - sx) + abs(y - sy) > 8
        ]
        self.rng.shuffle(available_open)

        for _ in range(self.num_comm_zones - 1):
            if available_open:
                cz = available_open.pop()
                self.comm_zones.append(cz)
                self.grid[cz[1]][cz[0]] = CellType.COMM_ZONE

        # 5. Place Data Sites with values
        candidate_sites = [
            (x, y)
            for y in range(1, self.height - 1)
            for x in range(1, self.width - 1)
            if self.grid[y][x] in (CellType.OPEN, CellType.HAZARD)
            and (x, y) not in self.comm_zones
            and (x, y) != self.start_pos
        ]
        self.rng.shuffle(candidate_sites)

        site_values = [15, 25, 40, 60, 100, 150, 200]

        for i in range(min(self.num_data_sites, len(candidate_sites))):
            pos = candidate_sites.pop()
            val = (
                site_values[i % len(site_values)]
                if i < len(site_values)
                else (i + 1) * 20
            )
            self.data_values[pos] = val
            self.grid[pos[1]][pos[0]] = CellType.DATA_SITE

        # 6. Apply Hard Mode configuration if enabled
        if self.hard_mode and self.data_values:
            self._apply_hard_mode()

    def _apply_hard_mode(self) -> None:
        """In hard mode: the highest-value data site is placed far away and surrounded by hazards."""
        # Find highest value site
        highest_site = max(self.data_values.items(), key=lambda item: item[1])[0]
        # Remove old position from grid
        val = self.data_values.pop(highest_site)
        self.grid[highest_site[1]][highest_site[0]] = CellType.OPEN

        # Find position farthest from start/comm zones
        best_pos = None
        max_dist = -1
        for y in range(2, self.height - 2):
            for x in range(2, self.width - 2):
                if (x, y) not in self.comm_zones and (x, y) not in self.data_values:
                    min_comm_dist = min(
                        abs(x - cx) + abs(y - cy) for cx, cy in self.comm_zones
                    )
                    if min_comm_dist > max_dist:
                        max_dist = min_comm_dist
                        best_pos = (x, y)

        if best_pos:
            hx, hy = best_pos
            self.grid[hy][hx] = CellType.DATA_SITE
            self.data_values[best_pos] = val

            # Surround with hazard ring to create strategic trade-off
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    rx, ry = hx + dx, hy + dy
                    if self.in_bounds(rx, ry) and (rx, ry) not in self.comm_zones:
                        self.grid[ry][rx] = CellType.HAZARD

    def _ensure_reachability(self) -> None:
        """Guarantee reachability: flood fill from start pos; carve open paths if any target is disconnected."""
        sx, sy = self.start_pos
        reachable = self._get_reachable_cells(sx, sy)

        targets_to_connect = list(self.comm_zones) + list(self.data_values.keys())

        for tx, ty in targets_to_connect:
            if (tx, ty) not in reachable:
                # Carve an open path from nearest reachable cell to (tx, ty)
                nearest_reachable = min(
                    reachable, key=lambda c: abs(c[0] - tx) + abs(c[1] - ty)
                )
                self._carve_path(nearest_reachable, (tx, ty))
                # Update reachable set
                reachable = self._get_reachable_cells(sx, sy)

    def _get_reachable_cells(self, start_x: int, start_y: int) -> Set[Tuple[int, int]]:
        """BFS flood fill to find all traversable cells reachable from (start_x, start_y)."""
        visited: Set[Tuple[int, int]] = set()
        queue = deque([(start_x, start_y)])
        visited.add((start_x, start_y))

        while queue:
            cx, cy = queue.popleft()
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = cx + dx, cy + dy
                if (
                    self.in_bounds(nx, ny)
                    and (nx, ny) not in visited
                    and self.grid[ny][nx] != CellType.OBSTACLE
                ):
                    visited.add((nx, ny))
                    queue.append((nx, ny))
        return visited

    def _carve_path(self, from_pos: Tuple[int, int], to_pos: Tuple[int, int]) -> None:
        """Carves a passable corridor from from_pos to to_pos by clearing obstacles."""
        fx, fy = from_pos
        tx, ty = to_pos
        curr_x, curr_y = fx, fy

        while curr_x != tx:
            curr_x += 1 if tx > curr_x else -1
            if (curr_x, curr_y) not in self.comm_zones and (curr_x, curr_y) not in self.data_values:
                self.grid[curr_y][curr_x] = CellType.OPEN

        while curr_y != ty:
            curr_y += 1 if ty > curr_y else -1
            if (curr_x, curr_y) not in self.comm_zones and (curr_x, curr_y) not in self.data_values:
                self.grid[curr_y][curr_x] = CellType.OPEN

    def trigger_dynamic_blocking(
        self, rng: random.Random, block_rate: float, rover_pos: Optional[Tuple[int, int]] = None
    ) -> Optional[Tuple[int, int]]:
        """Dynamic mid-mission event: with probability block_rate, blocks an open cell."""
        if rng.random() > block_rate:
            return None

        # Find candidates: open or hazard cells that are not comm zones, data sites, or rover's current pos
        candidates = [
            (x, y)
            for y in range(1, self.height - 1)
            for x in range(1, self.width - 1)
            if self.grid[y][x] in (CellType.OPEN, CellType.HAZARD)
            and (x, y) not in self.comm_zones
            and (x, y) not in self.data_values
            and (x, y) != self.start_pos
            and (rover_pos is None or (x, y) != rover_pos)
        ]

        if not candidates:
            return None

        blocked_pos = rng.choice(candidates)
        bx, by = blocked_pos
        self.grid[by][bx] = CellType.OBSTACLE
        return blocked_pos

    def collect_data_at(self, x: int, y: int) -> int:
        """Collect data from (x, y). Returns value collected and marks as collected."""
        pos = (x, y)
        if pos in self.data_values and pos not in self.collected_sites:
            self.collected_sites.add(pos)
            val = self.data_values[pos]
            # Once collected, site remains open terrain
            self.grid[y][x] = CellType.OPEN
            return val
        return 0

    def is_comm_zone(self, x: int, y: int) -> bool:
        """Check if (x, y) is a communication zone."""
        return (x, y) in self.comm_zones or self.get_cell(x, y) == CellType.COMM_ZONE
