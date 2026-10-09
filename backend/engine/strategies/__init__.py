"""Strategy registry and factory functions."""

from typing import Dict, List, Type
from backend.engine.strategies.base import BaseStrategy
from backend.engine.strategies.greedy import GreedyStrategy
from backend.engine.strategies.frontier import FrontierStrategy
from backend.engine.strategies.risk_aware import RiskAwareStrategy
from backend.engine.strategies.value_aware import ValueAwareStrategy

STRATEGY_REGISTRY: Dict[str, Type[BaseStrategy]] = {
    "greedy": GreedyStrategy,
    "frontier": FrontierStrategy,
    "risk_aware": RiskAwareStrategy,
    "value_aware": ValueAwareStrategy,
}


def get_strategy(name: str) -> BaseStrategy:
    """Instantiates a strategy by name (defaults to 'greedy' if not recognized)."""
    strategy_cls = STRATEGY_REGISTRY.get(name.lower(), GreedyStrategy)
    return strategy_cls()


def list_strategies() -> List[Dict[str, str]]:
    """Returns metadata for all available exploration strategies."""
    result = []
    for key, cls in STRATEGY_REGISTRY.items():
        inst = cls()
        result.append({
            "id": key,
            "name": inst.name,
            "description": inst.description,
        })
    return result


__all__ = [
    "BaseStrategy",
    "GreedyStrategy",
    "FrontierStrategy",
    "RiskAwareStrategy",
    "ValueAwareStrategy",
    "STRATEGY_REGISTRY",
    "get_strategy",
    "list_strategies",
]
