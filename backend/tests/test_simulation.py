"""Unit tests for simulation determinism, obstacle avoidance, and mission state transitions."""

import pytest
from backend.engine.environment import CellType
from backend.engine.simulation import Simulation, SimulationConfig


def test_simulation_determinism():
    """Two simulations initialized with the identical seed and config must produce identical results."""
    cfg1 = SimulationConfig(seed=1337, strategy="frontier", width=20, height=20, max_energy=150)
    cfg2 = SimulationConfig(seed=1337, strategy="frontier", width=20, height=20, max_energy=150)

    sim1 = Simulation(cfg1)
    sim2 = Simulation(cfg2)

    snaps1, metrics1 = sim1.run_to_completion()
    snaps2, metrics2 = sim2.run_to_completion()

    assert len(snaps1) == len(snaps2)
    assert metrics1.steps == metrics2.steps
    assert metrics1.data_uploaded == metrics2.data_uploaded
    assert metrics1.energy_used == metrics2.energy_used
    assert metrics1.mission_outcome == metrics2.mission_outcome

    # Verify every rover position matches identically
    for s1, s2 in zip(snaps1, snaps2):
        assert s1["rover"]["pos"] == s2["rover"]["pos"]
        assert s1["rover"]["energy"] == s2["rover"]["energy"]
        assert s1["rover"]["mode"] == s2["rover"]["mode"]


def test_rover_never_moves_into_obstacles():
    """Ensure rover never steps into an obstacle during movement."""
    # Test on map without dynamic blocking to check trail against static terrain
    cfg = SimulationConfig(seed=42, strategy="greedy", width=25, height=25, block_rate=0.0)
    sim = Simulation(cfg)
    snaps, metrics = sim.run_to_completion()

    for x, y in sim.rover.trail:
        cell = sim.environment.get_cell(x, y)
        assert cell != CellType.OBSTACLE, f"Rover entered obstacle at ({x}, {y})!"

    # Also test with active dynamic blocking: step-by-step verification
    cfg2 = SimulationConfig(seed=99, strategy="risk_aware", width=25, height=25, block_rate=0.1)
    sim2 = Simulation(cfg2)
    sim2.get_snapshot(full_map=True)
    while not sim2.rover.is_terminal() and sim2.step_count < 100:
        sim2.step()
        curr_cell = sim2.environment.get_cell(sim2.rover.x, sim2.rover.y)
        assert curr_cell != CellType.OBSTACLE, f"Rover moved onto obstacle at {sim2.rover.pos}!"


def test_data_upload_transfers_carried_data():
    """Carried data must become uploaded data when rover reaches a comm zone."""
    cfg = SimulationConfig(seed=77, strategy="value_aware", width=22, height=22, max_energy=250)
    sim = Simulation(cfg)
    snaps, metrics = sim.run_to_completion()

    if metrics.data_collected > 0 and metrics.mission_outcome == "SUCCESS":
        assert metrics.data_uploaded > 0
        assert sim.rover.data_carried == 0
