"""Data exporter service for JSON and CSV run serializations."""

import csv
import io
import json
from typing import Any, Dict, List


def export_run_json(run_record: Dict[str, Any], snapshots: List[Dict[str, Any]]) -> str:
    """Serializes complete run configuration, metrics, and step snapshots to JSON string."""
    payload = {
        "run_id": run_record.get("run_id"),
        "config": run_record.get("config"),
        "status": run_record.get("status"),
        "metrics": run_record.get("metrics"),
        "total_snapshots": len(snapshots),
        "snapshots": snapshots,
    }
    return json.dumps(payload, indent=2)


def export_run_csv(run_record: Dict[str, Any], snapshots: List[Dict[str, Any]]) -> str:
    """Flattens step snapshots into a formatted CSV string."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "step",
        "rover_x",
        "rover_y",
        "energy_remaining",
        "energy_used",
        "mode",
        "data_carried",
        "data_uploaded",
        "explored_pct",
        "replans",
        "return_cost",
        "events",
    ])

    for snap in snapshots:
        rover = snap.get("rover", {})
        pos = rover.get("pos", [0, 0])
        metrics = snap.get("metrics", {})
        events_str = ";".join(snap.get("events", []))

        writer.writerow([
            snap.get("step", 0),
            pos[0] if len(pos) > 0 else 0,
            pos[1] if len(pos) > 1 else 0,
            rover.get("energy", 0),
            metrics.get("energy_used", 0),
            rover.get("mode", ""),
            rover.get("data_carried", 0),
            rover.get("data_uploaded", 0),
            metrics.get("explored_pct", 0.0),
            metrics.get("replans", 0),
            snap.get("return_cost", -1),
            events_str,
        ])

    return output.getvalue()
