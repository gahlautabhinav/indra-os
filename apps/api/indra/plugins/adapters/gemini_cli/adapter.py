"""Gemini CLI adapter — reads ~/.gemini/ conversation metadata.

Gemini CLI stores conversations as Protobuf binary (.pb) in
~/.gemini/antigravity/conversations/ — the binary format cannot be decoded
without the private schema. This adapter reads file-level metadata (IDs,
mtime as timestamps) and reports session counts. Full event parsing is
unavailable until a public schema or plaintext export is added by Google.

The history/ and tmp/ dirs are also scanned for JSON/JSONL fallback.
"""

from __future__ import annotations

import contextlib
import dataclasses
import json
import logging
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

from ...base import (
    AbstractPlugin,
    PluginHealthStatus,
    SessionDetail,
    SessionEvent,
    SessionInfo,
)

log = logging.getLogger(__name__)

_PLUGIN_TYPE = "gemini_cli"
_GEMINI_DIR = Path.home() / ".gemini"
_CONVERSATIONS_DIR = _GEMINI_DIR / "antigravity" / "conversations"
_HISTORY_DIR = _GEMINI_DIR / "history"
_TMP_DIR = _GEMINI_DIR / "tmp"


def _mtime_iso(path: Path) -> str:
    try:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=UTC).isoformat()
    except OSError:
        return "1970-01-01T00:00:00+00:00"


def _try_read_json(path: Path) -> dict | list | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
        return data if isinstance(data, (dict, list)) else None
    except Exception:
        return None


def _parse_jsonl_file(path: Path) -> list[dict]:
    events: list[dict] = []
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if line:
                with contextlib.suppress(json.JSONDecodeError):
                    events.append(json.loads(line))
    except OSError:
        pass
    return events


def _info_from_pb_path(pb_path: Path) -> SessionInfo:
    """Build minimal SessionInfo from a .pb file's name and mtime."""
    return SessionInfo(
        id=pb_path.stem,
        project_path=None,
        started_at=_mtime_iso(pb_path),
        status="ended",
        plugin_type=_PLUGIN_TYPE,
        token_count=0,
        cost_usd=0.0,
        metadata={
            "format": "protobuf",
            "note": "Full event data unavailable — Protobuf binary without public schema",
            "file_size_bytes": pb_path.stat().st_size if pb_path.exists() else 0,
        },
    )


def _info_from_json_session(data: dict, path: Path) -> SessionInfo:
    """Build SessionInfo from a readable JSON session file."""
    session_id = (
        str(data.get("id") or data.get("sessionId") or data.get("conversation_id") or path.stem)
    )
    started_at = (
        data.get("createdAt") or data.get("created_at")
        or data.get("startTime") or _mtime_iso(path)
    )
    project_path = data.get("workingDirectory") or data.get("project_path") or data.get("cwd")
    return SessionInfo(
        id=session_id,
        project_path=project_path,
        started_at=started_at,
        status="ended",
        plugin_type=_PLUGIN_TYPE,
        token_count=int(data.get("totalTokens") or data.get("token_count") or 0),
        cost_usd=float(data.get("totalCost") or data.get("cost_usd") or 0.0),
        metadata={"source": str(path)},
    )


class GeminiCliPlugin(AbstractPlugin):
    """Read-only adapter for Gemini CLI sessions in ~/.gemini/."""

    @property
    def plugin_type(self) -> str:
        return _PLUGIN_TYPE

    @property
    def display_name(self) -> str:
        return "Gemini CLI"

    @property
    def version(self) -> str:
        return "1.0.0"

    async def initialize(self) -> None:
        if not _GEMINI_DIR.exists():
            log.warning("Gemini CLI dir not found at %s", _GEMINI_DIR)
        elif _CONVERSATIONS_DIR.exists():
            pb_count = sum(1 for _ in _CONVERSATIONS_DIR.glob("*.pb"))
            log.info("Gemini CLI: %d conversation files found (Protobuf format)", pb_count)

    async def health_check(self) -> PluginHealthStatus:
        if not _GEMINI_DIR.exists():
            return PluginHealthStatus.UNREACHABLE
        if _CONVERSATIONS_DIR.exists() or _HISTORY_DIR.exists() or _TMP_DIR.exists():
            return PluginHealthStatus.HEALTHY
        return PluginHealthStatus.DEGRADED

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        results: list[SessionInfo] = []

        # 1. Try JSON/JSONL files in history/ or tmp/ first (readable)
        for search_dir in (_HISTORY_DIR, _TMP_DIR):
            if not search_dir.exists():
                continue
            for p in sorted(search_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
                data = _try_read_json(p)
                if isinstance(data, dict):
                    info = _info_from_json_session(data, p)
                    if active_only and info.status != "active":
                        continue
                    results.append(info)
            for p in sorted(search_dir.glob("*.jsonl"), key=lambda f: f.stat().st_mtime, reverse=True):
                events = _parse_jsonl_file(p)
                if events:
                    first = events[0]
                    info = _info_from_json_session(first, p)
                    if active_only and info.status != "active":
                        continue
                    results.append(info)

        # 2. Fall back to .pb file metadata (no event content, just identifiers)
        if _CONVERSATIONS_DIR.exists() and not active_only:
            pb_files = sorted(
                _CONVERSATIONS_DIR.glob("*.pb"),
                key=lambda f: f.stat().st_mtime,
                reverse=True,
            )
            for pb in pb_files:
                results.append(_info_from_pb_path(pb))

        return results[offset: offset + limit]

    async def get_session(self, session_id: str) -> SessionDetail | None:
        # Check readable formats first
        for search_dir in (_HISTORY_DIR, _TMP_DIR):
            if not search_dir.exists():
                continue
            for suffix in (".json", ".jsonl"):
                p = search_dir / f"{session_id}{suffix}"
                if not p.exists():
                    continue
                if suffix == ".json":
                    data = _try_read_json(p)
                    if isinstance(data, dict):
                        info = _info_from_json_session(data, p)
                        return SessionDetail(**{
                            **dataclasses.asdict(info),
                            "events": [],
                        })
                else:
                    raw_events = _parse_jsonl_file(p)
                    if raw_events:
                        info = _info_from_json_session(raw_events[0], p)
                        return SessionDetail(**{
                            **dataclasses.asdict(info),
                            "events": [
                                SessionEvent(
                                    id=f"{session_id}_{i}",
                                    event_type=raw.get("type") or raw.get("role") or "unknown",
                                    content=raw.get("content") or raw.get("text"),
                                    timestamp=raw.get("timestamp") or info.started_at,
                                )
                                for i, raw in enumerate(raw_events)
                            ],
                        })

        # .pb only — return shell with no events
        pb_path = _CONVERSATIONS_DIR / f"{session_id}.pb"
        if pb_path.exists():
            info = _info_from_pb_path(pb_path)
            return SessionDetail(
                id=info.id,
                project_path=info.project_path,
                started_at=info.started_at,
                status=info.status,
                plugin_type=_PLUGIN_TYPE,
                token_count=0,
                cost_usd=0.0,
                events=[],
                metadata=info.metadata,
            )
        return None

    async def stream_events(
        self, session_id: str, since_event_id: str | None = None
    ) -> AsyncIterator[SessionEvent]:
        detail = await self.get_session(session_id)
        if detail is None:
            return
        emit = since_event_id is None
        for ev in detail.events:
            if not emit:
                if ev.id == since_event_id:
                    emit = True
                continue
            yield ev
