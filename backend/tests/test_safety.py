"""Unit tests for return-safety rule evaluation and strand prevention."""

import pytest
from backend.engine.environment import CellType, Environment
from backend.engine.rover import Rover, RoverConfig, RoverMode
from backend.engine.safety import evaluate_return_safety
from backend.engine.sensing import SensingManager


def test_safety_rule_allows_exploration_with_abundant_energy():
    env = Environment(width=20, height=20, seed=42)
    rover = Rover(start_pos=env.start_pos, config=RoverConfig(max_energy=200))
    sensing = SensingManager(width=20, height=20, sensor_radius=4)
    sensing.sense(rover.pos, env)

    assessment = evaluate_return_safety(rover, sensing, env, safety_margin=5)
    assert assessment.is_safe is True
    assert assessment.return_cost == 0  # At comm zone
    assert assessment.buffer_remaining > 0


def test_safety_rule_triggers_returning_when_buffer_exhausted():
    env = Environment(width=20, height=20, seed=42)
    # Rover located at (5, 5), return cost is approximately 8-10
    rover = Rover(start_pos=(5, 5), config=RoverConfig(max_energy=200))
    rover.energy = 10  # Very low energy remaining
    sensing = SensingManager(width=20, height=20, sensor_radius=10)
    sensing.sense(rover.pos, env)

    assessment = evaluate_return_safety(rover, sensing, env, safety_margin=6)
    # If return cost is 8, 10 <= 8 + 6, so safety must be False!
    assert assessment.is_safe is False
    assert assessment.return_path is not None
    assert assessment.nearest_comm_zone is not None


def test_rover_never_strands_when_return_is_feasible():
    """Run a mission simulation and verify that if return is feasible, the rover returns safely."""
    from backend.engine.simulation import Simulation, SimulationConfig
    for seed in [10, 25, 42, 99]:
        cfg = SimulationConfig(
            seed=seed,
            strategy="risk_aware",
            width=20,
            height=20,
            max_energy=180,
            safety_margin=8,
            block_rate=0.0,  # test deterministic path safety
        )
        sim = Simulation(cfg)
        snapshots, metrics = sim.run_to_completion()
        # Rover must not end LOST if sufficient energy was provided
        assert metrics.mission_outcome == "SUCCESS"
        assert metrics.energy_remaining >= 0
