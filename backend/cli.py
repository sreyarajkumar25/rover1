"""Command-line interface for headless Rover Mission Control runs and batch comparisons."""

from __future__ import annotations
import argparse
import json
import os
import sys
from typing import Any, Dict

# Ensure backend root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.engine.batch import run_batch_comparison
from backend.engine.simulation import Simulation, SimulationConfig
from backend.engine.strategies import STRATEGY_REGISTRY


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Lost in Space: Rover Mission Control CLI Engine"
    )
    parser.add_argument(
        "--seed", type=int, default=42, help="RNG seed for simulation (default: 42)"
    )
    parser.add_argument(
        "--strategy",
        type=str,
        default="greedy",
        choices=list(STRATEGY_REGISTRY.keys()),
        help="Exploration strategy to execute",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=25,
        help="Square grid size (e.g. 25 for 25x25, default: 25)",
    )
    parser.add_argument(
        "--energy",
        type=int,
        default=220,
        help="Rover starting energy (default: 220)",
    )
    parser.add_argument(
        "--block-rate",
        type=float,
        default=0.04,
        help="Probability of dynamic obstacle event per step",
    )
    parser.add_argument(
        "--safety-margin",
        type=int,
        default=6,
        help="Energy safety buffer required for return trip",
    )
    parser.add_argument(
        "--hard-mode",
        action="store_true",
        help="Enable hard terrain mode with shielded high-value targets",
    )
    parser.add_argument(
        "--compare",
        action="store_true",
        help="Run batch comparison across all strategies",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=5,
        help="Number of random seeds to evaluate during --compare",
    )
    parser.add_argument(
        "--export",
        type=str,
        default=None,
        help="Filepath to export results (JSON)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-step events",
    )
    return parser.parse_args()


def print_comparison_table(results: Dict[str, Any]) -> None:
    table = results.get("table", [])
    print("\n" + "=" * 95)
    print(f"{'STRATEGY BATCH COMPARISON RESULTS':^95}")
    print("=" * 95)
    headers = ["Strategy", "Success Rate", "Explored %", "Uploaded Data", "Energy Used", "Steps", "Replans"]
    row_fmt = "{:<14} | {:<12} | {:<16} | {:<16} | {:<14} | {:<10} | {:<10}"
    print(row_fmt.format(*headers))
    print("-" * 95)
    for row in table:
        print(
            row_fmt.format(
                row["strategy"],
                row["success_rate"],
                row["explored_pct"],
                row["data_uploaded"],
                row["energy_used"],
                row["steps"],
                row["replans"],
            )
        )
    print("=" * 95 + "\n")


def main() -> None:
    args = parse_args()

    if args.compare:
        print(f"\n[+] Executing batch comparison across {len(STRATEGY_REGISTRY)} strategies over {args.runs} seeds...")
        seeds = [42 + i * 17 for i in range(args.runs)]
        base_cfg = {
            "width": args.size,
            "height": args.size,
            "max_energy": args.energy,
            "block_rate": args.block_rate,
            "safety_margin": args.safety_margin,
            "hard_mode": args.hard_mode,
        }
        results = run_batch_comparison(
            strategies=list(STRATEGY_REGISTRY.keys()),
            seeds=seeds,
            base_config=base_cfg,
        )
        print_comparison_table(results)

        if args.export:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2)
            print(f"[+] Comparison results saved to {args.export}")
        return

    # Single simulation run
    print(f"\n[+] Starting Rover Mission Simulation (Seed: {args.seed}, Strategy: {args.strategy})")
    cfg = SimulationConfig(
        seed=args.seed,
        strategy=args.strategy,
        width=args.size,
        height=args.size,
        max_energy=args.energy,
        block_rate=args.block_rate,
        safety_margin=args.safety_margin,
        hard_mode=args.hard_mode,
    )
    sim = Simulation(cfg)

    snapshots, metrics = sim.run_to_completion()

    print("\n" + "=" * 50)
    print(f"{'MISSION REPORT':^50}")
    print("=" * 50)
    print(f"Outcome              : {metrics.mission_outcome}")
    print(f"Steps Taken          : {metrics.steps}")
    print(f"Explored Area        : {metrics.explored_pct}%")
    print(f"Data Collected       : {metrics.data_collected}")
    print(f"Data Uploaded        : {metrics.data_uploaded}")
    print(f"Upload Efficiency    : {metrics.upload_efficiency} (data / energy)")
    print(f"Energy Used / Left   : {metrics.energy_used} / {metrics.energy_remaining}")
    print(f"Replans Triggered    : {metrics.replans}")
    print(f"Dynamic Obstacles    : {metrics.blocked_events}")
    print(f"Time to First Upload : {metrics.time_to_first_upload} steps")
    print("=" * 50 + "\n")

    if args.export:
        export_payload = {
            "config": {
                "seed": args.seed,
                "strategy": args.strategy,
                "width": args.size,
                "height": args.size,
                "max_energy": args.energy,
                "block_rate": args.block_rate,
                "safety_margin": args.safety_margin,
                "hard_mode": args.hard_mode,
            },
            "metrics": metrics.to_dict(),
            "snapshots": snapshots,
        }
        with open(args.export, "w", encoding="utf-8") as f:
            json.dump(export_payload, f, indent=2)
        print(f"[+] Run snapshots exported to {args.export}")


if __name__ == "__main__":
    main()
