"""Pydantic schema definitions for snapshots and metrics."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RoverStateSchema(BaseModel):
    pos: List[int] = Field(..., description="[x, y] coordinates of the rover")
    energy: int = Field(..., description="Current remaining energy")
    max_energy: int = Field(..., description="Maximum battery capacity")
    data_carried: int = Field(..., description="Data units currently carried by the rover")
    data_uploaded: int = Field(..., description="Data units safely transmitted to a comm zone")
    mode: str = Field(..., description="Current rover state: EXPLORING, COLLECTING, RETURNING, UPLOADING, SUCCESS, LOST")


class SnapshotMetricsSchema(BaseModel):
    explored_pct: float = Field(..., description="Percentage of grid area discovered")
    replans: int = Field(..., description="Total number of path replans triggered")
    energy_used: int = Field(..., description="Cumulative energy consumed so far")
    data_collected: int = Field(..., description="Total data collected from data sites")


class MapDiffSchema(BaseModel):
    pos: List[int] = Field(..., description="[x, y] location of altered cell")
    val: int = Field(..., description="New CellType value")


class SnapshotSchema(BaseModel):
    step: int = Field(..., description="Current simulation step index")
    grid_size: List[int] = Field(..., description="[width, height] dimensions")
    true_map: Optional[List[List[int]]] = Field(
        default=None, description="Complete 2D ground-truth grid (sent on step 0)"
    )
    known_map: List[List[Optional[int]]] = Field(
        ..., description="2D grid of explored cells (null for unexplored, int for explored)"
    )
    rover: RoverStateSchema = Field(..., description="Rover position and status")
    planned_path: List[List[int]] = Field(default=[], description="Waypoints remaining in current planned route")
    trail: List[List[int]] = Field(default=[], description="Historical coordinates traversed by the rover")
    frontiers: List[List[int]] = Field(default=[], description="Active frontier coordinates bordering unknown cells")
    return_cost: int = Field(..., description="Energy cost to reach nearest communication zone")
    events: List[str] = Field(default=[], description="Key events occurring on this step")
    metrics: SnapshotMetricsSchema = Field(..., description="Summary telemetry metrics")
    map_diffs: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Incremental true_map changes since previous step"
    )
