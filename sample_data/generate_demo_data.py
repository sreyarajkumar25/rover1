"""Generates sample_data/snapshots_demo.json and sample_data/comparison_demo.json."""

import json
import os
import sys

# Ensure backend is in path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.engine.batch import run_batch_comparison
from backend.engine.simulation import Simulation, SimulationConfig


def generate():
    sample_dir = os.path.join(project_root, "sample_data")
    os.makedirs(sample_dir, exist_ok=True)

    print("[*] Generating snapshots_demo.json...")
    cfg = SimulationConfig(
        seed=42,
        strategy="value_aware",
        width=25,
        height=25,
        max_energy=220,
        sensor_radius=4,
        block_rate=0.04,
        safety_margin=6,
        hard_mode=False,
    )
    sim = Simulation(cfg)
    snapshots, metrics = sim.run_to_completion()

    demo_run = {
        "config": {
            "seed": cfg.seed,
            "strategy": cfg.strategy,
            "size": cfg.width,
            "max_energy": cfg.max_energy,
            "sensor_radius": cfg.sensor_radius,
            "block_rate": cfg.block_rate,
            "safety_margin": cfg.safety_margin,
            "hard_mode": cfg.hard_mode,
        },
        "metrics": metrics.to_dict(),
        "total_snapshots": len(snapshots),
        "snapshots": snapshots,
    }

    snapshots_path = os.path.join(sample_dir, "snapshots_demo.json")
    with open(snapshots_path, "w", encoding="utf-8") as f:
        json.dump(demo_run, f, indent=2)
    print(f"    Saved {len(snapshots)} snapshots to {snapshots_path}")

    print("[*] Generating comparison_demo.json...")
    benchmarks = run_batch_comparison(
        strategies=["greedy", "frontier", "risk_aware", "value_aware"],
        seeds=[42, 101, 202, 303, 404],
        base_config={
            "width": 25,
            "height": 25,
            "max_energy": 220,
            "sensor_radius": 4,
            "block_rate": 0.04,
            "safety_margin": 6,
        },
    )

    comparison_path = os.path.join(sample_dir, "comparison_demo.json")
    with open(comparison_path, "w", encoding="utf-8") as f:
        json.dump(benchmarks, f, indent=2)
    print(f"    Saved benchmark comparison to {comparison_path}")


if __name__ == "__main__":
    generate()
