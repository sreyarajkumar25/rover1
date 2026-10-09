"""Batch simulation runner for comparing exploration strategies across multiple seeds."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from backend.engine.metrics import compute_batch_stats
from backend.engine.simulation import Simulation, SimulationConfig
from backend.engine.strategies import STRATEGY_REGISTRY


def run_batch_comparison(
    strategies: Optional[List[str]] = None,
    seeds: Optional[List[int]] = None,
    base_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Executes multi-seed runs across specified strategies and compiles statistical comparisons.

    Args:
        strategies: List of strategy names (defaults to all registered strategies).
        seeds: List of integer seeds (defaults to [1, 2, 3, 4, 5]).
        base_config: Common simulation configuration options.

    Returns:
        Structured dictionary with strategy results, summary metrics, and raw runs.
    """
    if strategies is None:
        strategies = list(STRATEGY_REGISTRY.keys())
    if seeds is None:
        seeds = [42, 101, 202, 303, 404]

    base_config = base_config or {}

    comparison_results: Dict[str, Any] = {}
    table_rows: List[Dict[str, Any]] = []

    for strat in strategies:
        strat_metrics = []
        successes = 0

        for seed in seeds:
            cfg = SimulationConfig(
                seed=seed,
                strategy=strat,
                width=base_config.get("width", 25),
                height=base_config.get("height", 25),
                max_energy=base_config.get("max_energy", 220),
                sensor_radius=base_config.get("sensor_radius", 4),
                block_rate=base_config.get("block_rate", 0.04),
                safety_margin=base_config.get("safety_margin", 6),
                hard_mode=base_config.get("hard_mode", False),
            )
            sim = Simulation(cfg)
            _, metrics = sim.run_to_completion()

            strat_metrics.append(metrics)
            if metrics.mission_outcome == "SUCCESS":
                successes += 1

        total_runs = len(seeds)
        success_rate = round((successes / total_runs) * 100.0, 1)

        explored_stats = compute_batch_stats([m.explored_pct for m in strat_metrics])
        uploaded_stats = compute_batch_stats([float(m.data_uploaded) for m in strat_metrics])
        energy_stats = compute_batch_stats([float(m.energy_used) for m in strat_metrics])
        steps_stats = compute_batch_stats([float(m.steps) for m in strat_metrics])
        replans_stats = compute_batch_stats([float(m.replans) for m in strat_metrics])

        summary = {
            "strategy": strat,
            "total_runs": total_runs,
            "success_rate_pct": success_rate,
            "explored_pct": explored_stats,
            "data_uploaded": uploaded_stats,
            "energy_used": energy_stats,
            "steps": steps_stats,
            "replans": replans_stats,
        }

        comparison_results[strat] = {
            "summary": summary,
            "runs": [m.to_dict() for m in strat_metrics],
        }

        table_rows.append({
            "strategy": strat,
            "success_rate": f"{success_rate}%",
            "explored_pct": f"{explored_stats['mean']}% ± {explored_stats['std']}",
            "data_uploaded": f"{uploaded_stats['mean']} ± {uploaded_stats['std']}",
            "energy_used": f"{energy_stats['mean']} ± {energy_stats['std']}",
            "steps": f"{steps_stats['mean']} ± {steps_stats['std']}",
            "replans": f"{replans_stats['mean']} ± {replans_stats['std']}",
        })

    return {
        "seeds": seeds,
        "strategies": strategies,
        "table": table_rows,
        "details": comparison_results,
    }
