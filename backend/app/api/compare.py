"""Batch comparison API endpoint."""

from typing import Any, Dict
from fastapi import APIRouter
from backend.app.schemas.config import CompareRequest
from backend.engine.batch import run_batch_comparison

router = APIRouter(prefix="/api/compare", tags=["Batch Comparison"])


@router.post("", response_model=Dict[str, Any])
def compare_strategies(request: CompareRequest) -> Dict[str, Any]:
    """Runs batch simulation comparing strategies across multiple seeds and returns statistical summaries."""
    base_cfg = {}
    if request.config:
        base_cfg = {
            "width": request.config.size,
            "height": request.config.size,
            "max_energy": request.config.max_energy,
            "sensor_radius": request.config.sensor_radius,
            "block_rate": request.config.block_rate,
            "safety_margin": request.config.safety_margin,
            "hard_mode": request.config.hard_mode,
        }

    results = run_batch_comparison(
        strategies=request.strategies,
        seeds=request.seeds,
        base_config=base_cfg,
    )
    return results
