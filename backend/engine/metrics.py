"""Simulation metrics calculation and aggregation."""

from __future__ import annotations
import math
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional


@dataclass
class RunMetrics:
    explored_pct: float = 0.0
    data_collected: int = 0
    data_uploaded: int = 0
    upload_efficiency: float = 0.0  # data_uploaded / energy_used
    collection_efficiency: float = 0.0  # data_uploaded / max(1, data_collected)
    energy_used: int = 0
    energy_remaining: int = 0
    steps: int = 0
    replans: int = 0
    blocked_events: int = 0
    mission_outcome: str = "LOST"
    time_to_first_upload: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def compute_run_metrics(
    explored_pct: float,
    data_collected: int,
    data_uploaded: int,
    energy_used: int,
    energy_remaining: int,
    steps: int,
    replans: int,
    blocked_events: int,
    mission_outcome: str,
    time_to_first_upload: Optional[int],
) -> RunMetrics:
    upload_eff = (
        round(float(data_uploaded) / float(energy_used), 3) if energy_used > 0 else 0.0
    )
    collection_eff = (
        round(float(data_uploaded) / float(max(1, data_collected)), 3)
    )

    return RunMetrics(
        explored_pct=round(explored_pct, 2),
        data_collected=data_collected,
        data_uploaded=data_uploaded,
        upload_efficiency=upload_eff,
        collection_efficiency=collection_eff,
        energy_used=energy_used,
        energy_remaining=energy_remaining,
        steps=steps,
        replans=replans,
        blocked_events=blocked_events,
        mission_outcome=mission_outcome,
        time_to_first_upload=time_to_first_upload,
    )


def compute_batch_stats(values: List[float]) -> Dict[str, float]:
    """Computes mean and sample standard deviation for a list of numbers."""
    if not values:
        return {"mean": 0.0, "std": 0.0}
    n = len(values)
    mean = sum(values) / n
    if n <= 1:
        return {"mean": round(mean, 2), "std": 0.0}
    variance = sum((x - mean) ** 2 for x in values) / (n - 1)
    return {"mean": round(mean, 2), "std": round(math.sqrt(variance), 2)}
