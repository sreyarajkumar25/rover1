"""API route for listing available exploration strategies."""

from typing import Any, Dict, List
from fastapi import APIRouter
from backend.engine.strategies import list_strategies

router = APIRouter(prefix="/api/strategies", tags=["Strategies"])


@router.get("", response_model=List[Dict[str, Any]])
def get_available_strategies() -> List[Dict[str, Any]]:
    """Returns available exploration strategies and their architectural descriptions."""
    return list_strategies()
