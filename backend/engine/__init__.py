"""Lost in Space - Rover Mission Control Simulation Engine."""

from backend.engine.environment import Environment, CellType
from backend.engine.rover import Rover, RoverMode
from backend.engine.sensing import SensingManager
from backend.engine.pathfinding import find_path, a_star
from backend.engine.safety import evaluate_return_safety
from backend.engine.simulation import Simulation, SimulationConfig
from backend.engine.metrics import RunMetrics, compute_run_metrics
from backend.engine.batch import run_batch_comparison

__all__ = [
    "Environment",
    "CellType",
    "Rover",
    "RoverMode",
    "SensingManager",
    "find_path",
    "a_star",
    "evaluate_return_safety",
    "Simulation",
    "SimulationConfig",
    "RunMetrics",
    "compute_run_metrics",
    "run_batch_comparison",
]
