"""REST API endpoints for managing simulation runs and exports."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from backend.app.schemas.config import RunConfig, RunSummaryResponse
from backend.app.services.exporter import export_run_csv, export_run_json
from backend.app.services.run_manager import run_manager
from backend.app.services.run_store import run_store

router = APIRouter(prefix="/api/runs", tags=["Runs"])


@router.post("", response_model=RunSummaryResponse, status_code=201)
def create_run(config: RunConfig) -> RunSummaryResponse:
    """Initializes and completes a deterministic simulation run for the given configuration."""
    run_id, record, _ = run_manager.create_and_run(config)
    return RunSummaryResponse(
        run_id=run_id,
        status=record["status"],
        config=config,
        metrics=record["metrics"],
    )


@router.get("/{run_id}", response_model=RunSummaryResponse)
def get_run(run_id: str) -> RunSummaryResponse:
    """Retrieves metadata, configuration, and final metrics for a specific simulation run."""
    record = run_store.get_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

    return RunSummaryResponse(
        run_id=record["run_id"],
        status=record["status"],
        config=RunConfig(**record["config"]),
        metrics=record.get("metrics"),
    )


@router.get("/{run_id}/snapshots")
def get_run_snapshots(run_id: str) -> List[Dict[str, Any]]:
    """Retrieves the full list of step snapshots for offline export and playback."""
    snapshots = run_store.get_snapshots(run_id)
    if snapshots is None:
        raise HTTPException(status_code=404, detail=f"Snapshots for run '{run_id}' not found.")
    return snapshots


@router.get("/{run_id}/export")
def export_run(
    run_id: str,
    format: str = Query("json", pattern="^(json|csv)$", description="Export format: json or csv"),
):
    """Exports run results and trajectory data as downloadable JSON or CSV."""
    record = run_store.get_run(run_id)
    snapshots = run_store.get_snapshots(run_id)
    if not record or snapshots is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

    if format == "csv":
        csv_data = export_run_csv(record, snapshots)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=run_{run_id}.csv"},
        )

    json_data = export_run_json(record, snapshots)
    return Response(
        content=json_data,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=run_{run_id}.json"},
    )
