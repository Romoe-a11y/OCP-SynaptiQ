"""Production model registry with versioned loading, hot-reload, and A/B comparison."""

from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from logging_config import get_logger

logger = get_logger("model_registry")


@dataclass
class ModelEntry:
    """A loaded model artifact with metadata."""
    name: str
    version: Any
    artifact: dict[str, Any]
    loaded_at: str
    file_path: str
    file_mtime: float
    is_active: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "loaded_at": self.loaded_at,
            "file_path": self.file_path,
            "is_active": self.is_active,
            "created_at": self.artifact.get("created_at"),
            "training_metrics": self.artifact.get("training_metrics"),
        }


class ModelRegistry:
    """Thread-safe model registry supporting hot-reload and version tracking."""

    def __init__(self):
        self._models: dict[str, ModelEntry] = {}
        self._history: dict[str, list[dict[str, Any]]] = {}
        self._lock = threading.RLock()

    def load(
        self,
        name: str,
        file_path: Path,
        loader_fn,
        force: bool = False,
    ) -> ModelEntry:
        """Load a model from disk. Skips if file hasn't changed unless force=True."""
        path = Path(file_path)

        with self._lock:
            existing = self._models.get(name)
            if not force and existing and path.exists():
                current_mtime = path.stat().st_mtime
                if current_mtime == existing.file_mtime:
                    return existing

            artifact = loader_fn(path)
            now = datetime.now(timezone.utc).isoformat()
            mtime = path.stat().st_mtime if path.exists() else 0.0

            entry = ModelEntry(
                name=name,
                version=artifact.get("version", "unknown"),
                artifact=artifact,
                loaded_at=now,
                file_path=str(path),
                file_mtime=mtime,
            )

            # Deactivate previous version
            if existing:
                existing.is_active = False
                self._history.setdefault(name, []).append(existing.to_dict())

            self._models[name] = entry
            logger.info(
                f"Model loaded: {name} v{entry.version}",
                extra={"model_version": entry.version},
            )
            return entry

    def get(self, name: str) -> dict[str, Any]:
        """Get the active model artifact."""
        with self._lock:
            entry = self._models.get(name)
            if entry is None:
                raise KeyError(f"Model '{name}' not loaded")
            return entry.artifact

    def get_entry(self, name: str) -> ModelEntry | None:
        with self._lock:
            return self._models.get(name)

    def reload_all(self, loaders: dict[str, tuple[Path, Any]]) -> dict[str, str]:
        """Reload all registered models. Returns {name: status}."""
        results = {}
        for name, (path, loader_fn) in loaders.items():
            try:
                entry = self.load(name, path, loader_fn, force=True)
                results[name] = f"reloaded v{entry.version}"
            except Exception as exc:
                results[name] = f"error: {exc}"
                logger.error(f"Failed to reload {name}: {exc}")
        return results

    def list_models(self) -> list[dict[str, Any]]:
        with self._lock:
            return [entry.to_dict() for entry in self._models.values()]

    def get_history(self, name: str) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._history.get(name, []))

    def compare(self, name: str) -> dict[str, Any]:
        """Compare current model with previous version."""
        with self._lock:
            current = self._models.get(name)
            history = self._history.get(name, [])

            if current is None:
                return {"error": f"Model '{name}' not loaded"}

            result: dict[str, Any] = {
                "current": current.to_dict(),
                "previous": history[-1] if history else None,
                "version_count": len(history) + 1,
            }

            # Compare metrics if both exist
            if history:
                prev = history[-1]
                curr_metrics = current.artifact.get("training_metrics", {})
                prev_metrics = prev.get("training_metrics", {})
                if curr_metrics and prev_metrics:
                    result["metric_delta"] = _compute_metric_delta(prev_metrics, curr_metrics)

            return result


def _compute_metric_delta(
    prev: dict[str, Any],
    curr: dict[str, Any],
    prefix: str = "",
) -> dict[str, dict[str, float]]:
    """Recursively compute deltas between metric dicts."""
    deltas = {}
    for key in curr:
        full_key = f"{prefix}{key}" if prefix else key
        if isinstance(curr[key], dict) and isinstance(prev.get(key), dict):
            deltas.update(_compute_metric_delta(prev[key], curr[key], f"{full_key}."))
        elif isinstance(curr[key], (int, float)) and isinstance(prev.get(key), (int, float)):
            deltas[full_key] = {
                "previous": prev[key],
                "current": curr[key],
                "delta": round(curr[key] - prev[key], 6),
            }
    return deltas
