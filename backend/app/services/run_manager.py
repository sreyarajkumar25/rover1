"""Simulation execution and run lifecycle orchestration."""

import uuid
from typing import Any, Dict, List, Optional, Tuple
from backend.app.schemas.config import RunConfig
from backend.app.services.run_store import run_store
from backend.engine.simulation import Simulation, SimulationConfig


class RunManager:
    """Coordinates simulation runs, storage, and retrieval."""

    def __init__(self) -> None:
        self.active_simulations: Dict[str, Simulation] = {}

    def create_and_run(self, config: RunConfig) -> Tuple[str, Dict[str, Any], List[Dict[str, Any]]]:
        """Creates a simulation from config, executes it to completion, and stores results."""
        run_id = str(uuid.uuid4())[:8]

        sim_config = SimulationConfig(
            seed=config.seed,
            width=config.size,
            height=config.size,
            strategy=config.strategy,
            max_energy=config.max_energy,
            sensor_radius=config.sensor_radius,
            block_rate=config.block_rate,
            safety_margin=config.safety_margin,
            hard_mode=config.hard_mode,
        )

        sim = Simulation(sim_config)
        self.active_simulations[run_id] = sim

        snapshots, metrics = sim.run_to_completion()

        record = {
            "run_id": run_id,
            "status": "COMPLETED",
            "config": config.model_dump(),
            "metrics": metrics.to_dict(),
        }

        run_store.save_run(run_id, record)
        run_store.save_snapshots(run_id, snapshots)

        return run_id, record, snapshots

    def get_or_create_sim(self, run_id: str, config: Optional[RunConfig] = None) -> Simulation:
        """Retrieves active simulation for interactive streaming, or creates new from store."""
        if run_id in self.active_simulations:
            return self.active_simulations[run_id]

        record = run_store.get_run(run_id)
        if record and "config" in record:
            cfg_dict = record["config"]
            cfg = SimulationConfig(
                seed=cfg_dict.get("seed", 42),
                width=cfg_dict.get("size", 25),
                height=cfg_dict.get("size", 25),
                strategy=cfg_dict.get("strategy", "greedy"),
                max_energy=cfg_dict.get("max_energy", 220),
                sensor_radius=cfg_dict.get("sensor_radius", 4),
                block_rate=cfg_dict.get("block_rate", 0.04),
                safety_margin=cfg_dict.get("safety_margin", 6),
                hard_mode=cfg_dict.get("hard_mode", False),
            )
            sim = Simulation(cfg)
            self.active_simulations[run_id] = sim
            return sim

        # Fallback to default
        sim = Simulation()
        self.active_simulations[run_id] = sim
        return sim


run_manager = RunManager()
