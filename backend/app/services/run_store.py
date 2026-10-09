"""In-memory run storage with swappable abstract interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseRunStore(ABC):
    """Abstract interface for storing simulation runs and snapshots."""

    @abstractmethod
    def save_run(self, run_id: str, record: Dict[str, Any]) -> None:
        pass

    @abstractmethod
    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def list_runs(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def save_snapshots(self, run_id: str, snapshots: List[Dict[str, Any]]) -> None:
        pass

    @abstractmethod
    def get_snapshots(self, run_id: str) -> Optional[List[Dict[str, Any]]]:
        pass


class InMemoryRunStore(BaseRunStore):
    """Thread-safe, volatile in-memory implementation of BaseRunStore."""

    def __init__(self) -> None:
        self._runs: Dict[str, Dict[str, Any]] = {}
        self._snapshots: Dict[str, List[Dict[str, Any]]] = {}

    def save_run(self, run_id: str, record: Dict[str, Any]) -> None:
        self._runs[run_id] = record

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        return self._runs.get(run_id)

    def list_runs(self) -> List[Dict[str, Any]]:
        return list(self._runs.values())

    def save_snapshots(self, run_id: str, snapshots: List[Dict[str, Any]]) -> None:
        self._snapshots[run_id] = snapshots

    def get_snapshots(self, run_id: str) -> Optional[List[Dict[str, Any]]]:
        return self._snapshots.get(run_id)

    def clear(self) -> None:
        self._runs.clear()
        self._snapshots.clear()


# Default singleton instance
run_store = InMemoryRunStore()
