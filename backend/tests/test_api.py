"""Unit and integration tests for FastAPI REST and WebSocket endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_healthcheck():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Rover Mission Control" in data["app"]


def test_get_strategies():
    response = client.get("/api/strategies")
    assert response.status_code == 200
    strategies = response.json()
    assert isinstance(strategies, list)
    ids = [s["id"] for s in strategies]
    assert "greedy" in ids
    assert "frontier" in ids
    assert "risk_aware" in ids
    assert "value_aware" in ids


def test_create_and_get_run():
    payload = {
        "seed": 42,
        "size": 20,
        "strategy": "greedy",
        "max_energy": 180,
        "sensor_radius": 4,
        "block_rate": 0.02,
        "safety_margin": 5,
        "hard_mode": False,
    }
    create_res = client.post("/api/runs", json=payload)
    assert create_res.status_code == 201
    run_data = create_res.json()
    run_id = run_data["run_id"]
    assert run_data["status"] == "COMPLETED"
    assert "metrics" in run_data
    assert run_data["metrics"]["mission_outcome"] in ("SUCCESS", "LOST")

    # Fetch run
    get_res = client.get(f"/api/runs/{run_id}")
    assert get_res.status_code == 200
    assert get_res.json()["run_id"] == run_id

    # Fetch snapshots
    snap_res = client.get(f"/api/runs/{run_id}/snapshots")
    assert snap_res.status_code == 200
    snapshots = snap_res.json()
    assert len(snapshots) > 0
    # First snapshot has full true_map
    assert snapshots[0]["true_map"] is not None
    assert "rover" in snapshots[0]

    # Export JSON
    json_export = client.get(f"/api/runs/{run_id}/export?format=json")
    assert json_export.status_code == 200
    assert "application/json" in json_export.headers["content-type"]

    # Export CSV
    csv_export = client.get(f"/api/runs/{run_id}/export?format=csv")
    assert csv_export.status_code == 200
    assert "text/csv" in csv_export.headers["content-type"]
    assert "step,rover_x,rover_y" in csv_export.text


def test_compare_endpoint():
    payload = {
        "strategies": ["greedy", "risk_aware"],
        "seeds": [11, 22],
        "config": {
            "seed": 11,
            "size": 15,
            "strategy": "greedy",
            "max_energy": 150,
            "sensor_radius": 3,
            "block_rate": 0.0,
            "safety_margin": 5,
        },
    }
    res = client.post("/api/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "table" in data
    assert len(data["table"]) == 2


def test_not_found_run():
    res = client.get("/api/runs/nonexistent_id_999")
    assert res.status_code == 404
    error = res.json()
    assert "error" in error
    assert error["error"]["code"] == 404


def test_websocket_stream():
    # Create a run first
    payload = {"seed": 42, "size": 18, "strategy": "greedy", "max_energy": 150}
    create_res = client.post("/api/runs", json=payload)
    run_id = create_res.json()["run_id"]

    with client.websocket_connect(f"/ws/runs/{run_id}") as websocket:
        # Initial snapshot received
        first_data = websocket.receive_json()
        assert first_data["step"] == 0
        assert first_data["true_map"] is not None

        # Send step action
        websocket.send_json({"action": "step"})
        next_data = websocket.receive_json()
        assert next_data["step"] == 1
