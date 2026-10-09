"""Sensing module for partial observability, fog of war, line of sight, and frontier tracking."""

from __future__ import annotations
import math
from typing import Dict, List, Optional, Set, Tuple
from backend.engine.environment import CellType, Environment


def bresenham_line(x0: int, y0: int, x1: int, y1: int) -> List[Tuple[int, int]]:
    """Generates coordinates along a line using Bresenham's algorithm."""
    points = []
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy

    cx, cy = x0, y0
    while True:
        points.append((cx, cy))
        if cx == x1 and cy == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            cx += sx
        if e2 < dx:
            err += dx
            cy += sy
    return points


class SensingManager:
    """Manages rover perception, fog of war, line of sight, and frontier extraction."""

    def __init__(
        self,
        width: int,
        height: int,
        sensor_radius: int = 4,
        use_line_of_sight: bool = True,
    ) -> None:
        self.width = width
        self.height = height
        self.sensor_radius = sensor_radius
        self.use_line_of_sight = use_line_of_sight

        # known_map: None for unknown, int (CellType) for explored
        self.known_map: List[List[Optional[int]]] = [
            [None for _ in range(width)] for _ in range(height)
        ]

        self.explored_cells: Set[Tuple[int, int]] = set()
        self.known_comm_zones: Set[Tuple[int, int]] = set()
        self.known_data_sites: Dict[Tuple[int, int], int] = {}

    def is_known(self, x: int, y: int) -> bool:
        """Returns True if the cell has been explored."""
        return (x, y) in self.explored_cells

    def get_known_cell(self, x: int, y: int) -> Optional[int]:
        """Returns known cell type or None if unknown."""
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.known_map[y][x]
        return CellType.OBSTACLE

    def sense(
        self, rover_pos: Tuple[int, int], environment: Environment
    ) -> List[Tuple[Tuple[int, int], int]]:
        """Scans the local environment from rover_pos.

        Returns list of newly discovered ((x, y), cell_type) tuples.
        """
        rx, ry = rover_pos
        newly_revealed: List[Tuple[Tuple[int, int], int]] = []
        r = self.sensor_radius
        r_squared = r * r

        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy > r_squared:
                    continue

                tx, ty = rx + dx, ry + dy
                if not environment.in_bounds(tx, ty):
                    continue

                # Check Line of Sight if enabled
                if self.use_line_of_sight and (tx, ty) != (rx, ry):
                    blocked = False
                    line = bresenham_line(rx, ry, tx, ty)
                    # Check intermediate cells for obstacles
                    for cx, cy in line[1:-1]:
                        if environment.get_cell(cx, cy) == CellType.OBSTACLE:
                            blocked = True
                            break
                    if blocked:
                        continue

                # If visible, update known map
                actual_val = environment.get_cell(tx, ty)
                if (tx, ty) not in self.explored_cells:
                    self.explored_cells.add((tx, ty))
                    self.known_map[ty][tx] = actual_val
                    newly_revealed.append(((tx, ty), actual_val))

                    # Track special locations
                    if actual_val == CellType.COMM_ZONE:
                        self.known_comm_zones.add((tx, ty))
                    elif actual_val == CellType.DATA_SITE:
                        val = environment.data_values.get((tx, ty), 0)
                        self.known_data_sites[(tx, ty)] = val
                else:
                    # Update dynamic changes (e.g. dynamic obstacle blocks)
                    if self.known_map[ty][tx] != actual_val:
                        self.known_map[ty][tx] = actual_val
                        newly_revealed.append(((tx, ty), actual_val))

        return newly_revealed

    def get_frontiers(self) -> List[Tuple[int, int]]:
        """Identifies frontier cells: known passable cells adjacent to at least one unexplored cell."""
        frontiers: Set[Tuple[int, int]] = set()

        for (x, y) in self.explored_cells:
            cell = self.known_map[y][x]
            if cell is None or cell == CellType.OBSTACLE:
                continue

            # Check 4-connected neighbors
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < self.width and 0 <= ny < self.height:
                    if self.known_map[ny][nx] is None:
                        frontiers.add((x, y))
                        break

        return sorted(list(frontiers))

    def count_unknown_in_radius(self, center: Tuple[int, int], radius: int) -> int:
        """Counts unexplored cells within radius of center, useful for frontier scoring."""
        cx, cy = center
        count = 0
        r_squared = radius * radius
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                if dx * dx + dy * dy <= r_squared:
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < self.width and 0 <= ny < self.height:
                        if self.known_map[ny][nx] is None:
                            count += 1
        return count

    def get_explored_percentage(self) -> float:
        """Returns the percentage of total grid cells that have been explored."""
        total = self.width * self.height
        if total == 0:
            return 0.0
        return round((len(self.explored_cells) / total) * 100.0, 2)
