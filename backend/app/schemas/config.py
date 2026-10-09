"""Pydantic schemas for simulation configuration and requests."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RunConfig(BaseModel):
    seed: int = Field(default=42, description="RNG seed for determinism")
    size: int = Field(default=25, ge=10, le=100, description="Square grid width and height")
    strategy: str = Field(default="greedy", description="Exploration strategy name")
    max_energy: int = Field(default=220, ge=10, le=2000, description="Rover maximum starting energy")
    sensor_radius: int = Field(default=4, ge=1, le=15, description="Sensor vision radius")
    block_rate: float = Field(default=0.04, ge=0.0, le=1.0, description="Dynamic block event probability per step")
    safety_margin: int = Field(default=6, ge=0, le=50, description="Return energy safety margin")
    hard_mode: bool = Field(default=False, description="Enable hard mode hazard layout")


class CompareRequest(BaseModel):
    strategies: List[str] = Field(
        default=["greedy", "frontier", "risk_aware", "value_aware"],
        description="List of strategies to benchmark"
    )
    seeds: List[int] = Field(
        default=[42, 101, 202, 303, 404],
        description="List of RNG seeds for benchmark"
    )
    config: Optional[RunConfig] = Field(
        default=None,
        description="Base configuration parameters applied across all runs"
    )


class RunSummaryResponse(BaseModel):
    run_id: str
    status: str
    config: RunConfig
    metrics: Optional[Dict[str, Any]] = None
