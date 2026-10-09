"""WebSocket streaming endpoint for real-time and replay mission playback."""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.services.run_manager import run_manager
from backend.app.services.run_store import run_store

logger = logging.getLogger("mission_control.ws")
router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/runs/{run_id}")
async def websocket_run_stream(websocket: WebSocket, run_id: str):
    """Streams simulation snapshots to connected clients with interactive playback controls."""
    await websocket.accept()
    logger.info(f"WebSocket client connected for run {run_id}")

    # Fetch snapshots from store or generate
    snapshots = run_store.get_snapshots(run_id)
    if not snapshots:
        # If run not yet executed, create default run
        from backend.app.schemas.config import RunConfig
        _, _, snapshots = run_manager.create_and_run(RunConfig())

    current_step_idx = 0
    is_playing = False
    step_delay_sec = 0.12  # ~8 steps per second default

    # Send initial snapshot (includes full map)
    if snapshots:
        first_snap = dict(snapshots[0])
        await websocket.send_json(first_snap)

    async def incoming_messages_handler():
        nonlocal current_step_idx, is_playing, step_delay_sec
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                except Exception:
                    continue

                action = msg.get("action")
                value = msg.get("value")

                if action == "play":
                    is_playing = True
                elif action == "pause":
                    is_playing = False
                elif action == "step":
                    is_playing = False
                    if current_step_idx < len(snapshots) - 1:
                        current_step_idx += 1
                        snap = snapshots[current_step_idx]
                        await websocket.send_json(snap)
                elif action == "speed":
                    # value in ms
                    if isinstance(value, (int, float)) and value > 0:
                        step_delay_sec = max(0.01, float(value) / 1000.0)
                elif action == "reset":
                    is_playing = False
                    current_step_idx = 0
                    if snapshots:
                        first_snap = dict(snapshots[0])
                        await websocket.send_json(first_snap)
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.warning(f"Error in ws incoming handler: {e}")

    # Start listener task
    incoming_task = asyncio.create_task(incoming_messages_handler())

    try:
        while True:
            if is_playing and snapshots:
                if current_step_idx < len(snapshots) - 1:
                    current_step_idx += 1
                    snap = snapshots[current_step_idx]
                    await websocket.send_json(snap)
                else:
                    # Reached end of simulation
                    is_playing = False

            await asyncio.sleep(step_delay_sec)

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for run {run_id}")
    except Exception as e:
        logger.error(f"WebSocket error for run {run_id}: {e}")
    finally:
        incoming_task.cancel()
