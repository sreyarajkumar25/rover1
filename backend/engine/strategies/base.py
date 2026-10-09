"""Base interface for Rover Exploration Strategies."""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from backend.engine.environment import Environment
from backend.engine.rover import Rover
from backend.engine.safety import SafetyAssessment
from backend.engine.sensing import SensingManager


class BaseStrategy(ABC):
    """Abstract Strategy interface defining target selection logic."""

    name: str = "base"
    description: str = "Base Strategy"

    @abstractmethod
    def select_target(
        self,
        rover: Rover,
        sensing: SensingManager,
        environment: Environment,
        safety: SafetyAssessment,
    ) -> Optional[Tuple[int, int]]:
        """Selects the next grid coordinate (x, y) the rover should navigate towards.

        Returns None if no viable target exists or if the mission should return.
        """
        pass
