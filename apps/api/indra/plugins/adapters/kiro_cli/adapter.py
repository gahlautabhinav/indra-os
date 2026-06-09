"""Kiro CLI adapter — reads ~/.kiro/sessions/cli/ JSONL session files."""

from __future__ import annotations

import contextlib
import json
import logging
import time
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

from ...base import (
    AbstractPlugin,
    PluginHealthStatus,
    SessionDetail,
    SessionEvent,
    SessionInfo,
)

log = logging.getLogger(__name__)

_PLUGIN_TYPE = "kiro_cli"
_KIRO_SESSIONS_DIR = Path.home() / ".kiro" / "sessions" / "cli"
# A session counts as active only if its file was touched within this window —
# a lingering .lock file is NOT proof the session is still running.
_ACTIVE_WINDOW_S = 300


def _recent_mtime(path: Path, window_s: int = _ACTIVE_WINDOW_S) -> bool:
    try:
        return (time.time() - path.stat().st_mtime) < window_s
    except OSError:
        return False


def _is_valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def _read_json_safe(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _parse_kiro_jsonl(jsonl_path: Path) -> list[dict]:
    """Parse Kiro JSONL event file → list of raw event dicts."""
    events: list[dict] = []
    if not jsonl_path.exists():
        return events
    try:
        for line in jsonl_path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            with contextlib.suppress(json.JSONDecodeError):
                events.append(json.loads(line))
    except OSError:
        pass
    return events


def _event_type(raw: dict) -> str:
    role = raw.get("role") or raw.get("type") or raw.get("event_type") or "unknown"
    mapping = {
        "user": "user_message",
        "assistant": "assistant_message",
        "tool_use": "tool_call",
        "tool_result": "tool_result",
        "system": "system",
    }
    return mapping.get(str(role).lower(), str(role))


def _extract_content(raw: dict) -> str | None:
    content = raw.get("content") or raw.get("text") or raw.get("message")
    if isinstance(content, list):
        # Kiro may store content as [{type, text}] blocks
        parts = []
        for block in content:
            if isinstance(block, dict):
                parts.append(block.get("text") or block.get("content") or "")
        return " ".join(p for p in parts if p) or None
    return str(content) if content else None


def _session_from_json_meta(meta: dict, session_id: str, jsonl_path: Path) -> SessionInfo:
    """Build SessionInfo from Kiro's .json metadata file."""
    # Kiro session JSON contains: id, createdAt, updatedAt, workingDirectory, model, etc.
    started_at = (
        meta.get("createdAt")
        or meta.get("created_at")
        or meta.get("startedAt")
        or "1970-01-01T00:00:00Z"
    )
    updated_at = meta.get("updatedAt") or meta.get("updated_at") or started_at

    # Active only if the session file was written to recently — a stale .lock
    # left behind by a crashed/closed session must not read as "running".
    status = "active" if _recent_mtime(jsonl_path) else "ended"

    project_path = (
        meta.get("workingDirectory")
        or meta.get("working_directory")
        or meta.get("projectPath")
        or meta.get("project_path")
    )

    # Try to infer token/cost from meta
    token_count = int(meta.get("totalTokens") or meta.get("token_count") or 0)
    cost_usd = float(meta.get("totalCost") or meta.get("cost_usd") or 0.0)

    return SessionInfo(
        id=session_id,
        project_path=project_path,
        started_at=started_at,
        status=status,
        plugin_type=_PLUGIN_TYPE,
        token_count=token_count,
        cost_usd=cost_usd,
        metadata={
            "updated_at": updated_at,
            "model": meta.get("model"),
            "jsonl_path": str(jsonl_path),
        },
    )


class KiroCliPlugin(AbstractPlugin):
    """Read-only adapter for Kiro CLI sessions stored in ~/.kiro/sessions/cli/."""

    @property
    def plugin_type(self) -> str:
        return _PLUGIN_TYPE

    @property
    def display_name(self) -> str:
        return "Kiro CLI"

    @property
    def version(self) -> str:
        return "1.0.0"

    async def initialize(self) -> None:
        if not _KIRO_SESSIONS_DIR.exists():
            log.warning("Kiro sessions dir not found at %s", _KIRO_SESSIONS_DIR)

    async def health_check(self) -> PluginHealthStatus:
        if not _KIRO_SESSIONS_DIR.exists():
            return PluginHealthStatus.UNREACHABLE
        try:
            next(_KIRO_SESSIONS_DIR.iterdir(), None)
            return PluginHealthStatus.HEALTHY
        except OSError:
            return PluginHealthStatus.DEGRADED

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        if not _KIRO_SESSIONS_DIR.exists():
            return []

        # Each session: <UUID>.json + <UUID>.jsonl + <UUID>.lock
        json_files = sorted(
            _KIRO_SESSIONS_DIR.glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )

        results: list[SessionInfo] = []
        for json_path in json_files[offset:]:
            stem = json_path.stem
            if not _is_valid_uuid(stem):
                continue
            jsonl_path = json_path.with_suffix(".jsonl")
            meta = _read_json_safe(json_path)
            info = _session_from_json_meta(meta, stem, jsonl_path)
            if active_only and info.status != "active":
                continue
            results.append(info)
            if len(results) >= limit:
                break

        return results

    async def get_session(self, session_id: str) -> SessionDetail | None:
        if not _is_valid_uuid(session_id):
            return None
        json_path = _KIRO_SESSIONS_DIR / f"{session_id}.json"
        jsonl_path = _KIRO_SESSIONS_DIR / f"{session_id}.jsonl"
        if not json_path.exists():
            return None

        meta = _read_json_safe(json_path)
        info = _session_from_json_meta(meta, session_id, jsonl_path)
        raw_events = _parse_kiro_jsonl(jsonl_path)

        events: list[SessionEvent] = []
        for i, raw in enumerate(raw_events):
            events.append(SessionEvent(
                id=raw.get("id") or f"{session_id}_{i}",
                event_type=_event_type(raw),
                content=_extract_content(raw),
                timestamp=(
                    raw.get("timestamp")
                    or raw.get("created_at")
                    or raw.get("createdAt")
                    or info.started_at
                ),
                input_tokens=int(raw.get("inputTokens") or raw.get("input_tokens") or 0),
                output_tokens=int(raw.get("outputTokens") or raw.get("output_tokens") or 0),
                cost_usd=float(raw.get("cost") or raw.get("cost_usd") or 0.0),
            ))

        return SessionDetail(
            id=info.id,
            project_path=info.project_path,
            started_at=info.started_at,
            status=info.status,
            plugin_type=_PLUGIN_TYPE,
            token_count=info.token_count or sum(e.input_tokens + e.output_tokens for e in events),
            cost_usd=info.cost_usd or sum(e.cost_usd for e in events),
            events=events,
            metadata=info.metadata,
        )

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
