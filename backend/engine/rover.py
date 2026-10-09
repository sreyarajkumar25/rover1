"""Rover state and energy model for Rover Mission Control."""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Tuple
from backend.engine.environment import CellType


class RoverMode(str, Enum):
    EXPLORING = "EXPLORING"
    COLLECTING = "COLLECTING"
    RETURNING = "RETURNING"
    UPLOADING = "UPLOADING"
    SUCCESS = "SUCCESS"
    LOST = "LOST"


@dataclass
class RoverConfig:
    max_energy: int = 250
    move_open_cost: int = 1
    move_hazard_cost: int = 4
    sense_cost: int = 0
    collect_cost: int = 2
    upload_cost: int = 2
    carrying_capacity: int = 9999  # unlimited by default


class Rover:
    """Represents the rover state, energy consumption, and mission mode transitions."""

    def __init__(
        self,
        start_pos: Tuple[int, int] = (1, 1),
        config: RoverConfig = RoverConfig(),
    ) -> None:
        self.config = config
        self.x, self.y = start_pos
        self.energy = config.max_energy
        self.max_energy = config.max_energy
        self.data_carried: int = 0
        self.data_uploaded: int = 0
        self.mode: RoverMode = RoverMode.EXPLORING

        self.trail: List[Tuple[int, int]] = [(self.x, self.y)]
        self.energy_used: int = 0

    @property
    def pos(self) -> Tuple[int, int]:
        return (self.x, self.y)

    def consume_energy(self, amount: int) -> None:
        """Deducts energy and increments total energy_used."""
        actual = min(self.energy, amount)
        self.energy -= actual
        self.energy_used += actual

    def get_move_cost(self, cell_type: int) -> int:
        """Determines the energy cost required to traverse into cell_type."""
        if cell_type == CellType.HAZARD:
            return self.config.move_hazard_cost
        return self.config.move_open_cost

    def move_to(self, new_x: int, new_y: int, cell_type: int) -> int:
        """Moves rover to (new_x, new_y), deducting the corresponding energy cost."""
        cost = self.get_move_cost(cell_type)
        self.consume_energy(cost)
        self.x = new_x
        self.y = new_y
        self.trail.append((self.x, self.y))
        return cost

    def can_carry(self, value: int) -> bool:
        """Checks if rover has capacity for additional data."""
        return (self.data_carried + value) <= self.config.carrying_capacity

    def collect_data(self, value: int) -> int:
        """Picks up data at a data site, consuming collection energy."""
        self.consume_energy(self.config.collect_cost)
        self.data_carried += value
        return value

    def upload_data(self) -> int:
        """Uploads carried data at a comm zone, transferring to data_uploaded."""
        self.consume_energy(self.config.upload_cost)
        uploaded = self.data_carried
        self.data_uploaded += uploaded
        self.data_carried = 0
        return uploaded

    def set_mode(self, mode: RoverMode) -> None:
        """Updates the mission mode."""
        self.mode = mode

    def is_lost(self) -> bool:
        return self.energy <= 0 and self.mode != RoverMode.SUCCESS

    def is_terminal(self) -> bool:
        return self.mode in (RoverMode.SUCCESS, RoverMode.LOST)
