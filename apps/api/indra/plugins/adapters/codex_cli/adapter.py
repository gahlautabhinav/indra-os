"""Codex CLI adapter — reads ~/.codex/session_index.jsonl + sessions/ dir."""

from __future__ import annotations

import contextlib
import json
import logging
import sqlite3
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

_PLUGIN_TYPE = "codex_cli"
_CODEX_DIR = Path.home() / ".codex"
_SESSION_INDEX = _CODEX_DIR / "session_index.jsonl"
_SESSIONS_DIR = _CODEX_DIR / "sessions"
_STATE_DB = _CODEX_DIR / "state_5.sqlite"
_ACTIVE_WINDOW_S = 300


def _is_recent(ts: str | None, window_s: int = _ACTIVE_WINDOW_S) -> bool:
    """True if an ISO-8601 timestamp is within the active window of now."""
    if not ts:
        return False
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return (datetime.now(UTC) - dt).total_seconds() < window_s


def _read_session_index() -> list[dict]:
    """Read ~/.codex/session_index.jsonl → list of session metadata dicts."""
    if not _SESSION_INDEX.exists():
        return []
    entries: list[dict] = []
    try:
        for line in _SESSION_INDEX.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            with contextlib.suppress(json.JSONDecodeError):
                entries.append(json.loads(line))
    except OSError:
        pass
    # Newest first
    entries.sort(key=lambda e: e.get("updatedAt") or e.get("createdAt") or "", reverse=True)
    return entries


def _read_session_jsonl(session_id: str) -> list[dict]:
    """Read a session's JSONL event file from ~/.codex/sessions/<id>.jsonl"""
    jsonl_path = _SESSIONS_DIR / f"{session_id}.jsonl"
    if not jsonl_path.exists():
        return []
    events: list[dict] = []
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


def _query_sqlite_sessions(limit: int) -> list[dict]:
    """Fallback: query state_5.sqlite for session records if index is missing."""
    if not _STATE_DB.exists():
        return []
    try:
        con = sqlite3.connect(str(_STATE_DB))
        con.row_factory = sqlite3.Row
        cur = con.execute(
            "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?", (limit,)
        )
        rows = [dict(r) for r in cur.fetchall()]
        con.close()
        return rows
    except Exception:
        # Table may not exist / schema differs
        return []


def _event_type(raw: dict) -> str:
    role = raw.get("role") or raw.get("type") or "unknown"
    mapping = {
        "user": "user_message",
        "assistant": "assistant_message",
        "tool": "tool_call",
        "tool_result": "tool_result",
        "system": "system",
    }
    return mapping.get(str(role).lower(), str(role))


def _extract_content(raw: dict) -> str | None:
    content = raw.get("content") or raw.get("text") or raw.get("message")
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                parts.append(block.get("text") or block.get("content") or "")
        return " ".join(p for p in parts if p) or None
    return str(content) if content else None


def _info_from_index_entry(entry: dict) -> SessionInfo:
    session_id = str(entry.get("id") or entry.get("sessionId") or entry.get("session_id") or "")
    started_at = entry.get("createdAt") or entry.get("created_at") or "1970-01-01T00:00:00Z"
    updated_at = entry.get("updatedAt") or entry.get("updated_at") or started_at

    # Codex doesn't write an end marker, so "no endedAt" is NOT proof of life.
    # Treat as active only if it was updated within the active window.
    if entry.get("status"):
        status = entry["status"]
    elif entry.get("endedAt"):
        status = "ended"
    else:
        status = "active" if _is_recent(updated_at) else "ended"

    project_path = (
        entry.get("workingDirectory")
        or entry.get("working_directory")
        or entry.get("cwd")
    )
    token_count = int(entry.get("totalTokens") or entry.get("token_count") or 0)
    cost_usd = float(entry.get("totalCost") or entry.get("cost_usd") or 0.0)

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
            "model": entry.get("model"),
            "title": entry.get("thread_name") or entry.get("title"),
        },
    )


class CodexCliPlugin(AbstractPlugin):
    """Read-only adapter for Codex CLI sessions stored in ~/.codex/."""

    @property
    def plugin_type(self) -> str:
        return _PLUGIN_TYPE

    @property
    def display_name(self) -> str:
        return "Codex CLI"

    @property
    def version(self) -> str:
        return "1.0.0"

    async def initialize(self) -> None:
        if not _CODEX_DIR.exists():
            log.warning("Codex CLI data dir not found at %s", _CODEX_DIR)

    async def health_check(self) -> PluginHealthStatus:
        if not _CODEX_DIR.exists():
            return PluginHealthStatus.UNREACHABLE
        if _SESSION_INDEX.exists() or _STATE_DB.exists():
            return PluginHealthStatus.HEALTHY
        return PluginHealthStatus.DEGRADED

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        index_entries = _read_session_index()

        results: list[SessionInfo] = []
        if index_entries:
            for entry in index_entries[offset:]:
                if not entry.get("id") and not entry.get("sessionId"):
                    continue
                info = _info_from_index_entry(entry)
                if active_only and info.status != "active":
                    continue
                results.append(info)
                if len(results) >= limit:
                    break
        else:
            # Fallback: SQLite
            rows = _query_sqlite_sessions(limit + offset)
            for row in rows[offset:]:
                info = _info_from_index_entry(row)
                if active_only and info.status != "active":
                    continue
                results.append(info)
                if len(results) >= limit:
                    break

        return results

    async def get_session(self, session_id: str) -> SessionDetail | None:
        # Find in index
        index_entries = _read_session_index()
        entry = next(
            (e for e in index_entries if str(e.get("id") or e.get("sessionId") or "") == session_id),
            None,
        )
        if entry is None:
            # Try file
            jsonl_path = _SESSIONS_DIR / f"{session_id}.jsonl"
            if not jsonl_path.exists():
                return None
            entry = {"id": session_id}

        info = _info_from_index_entry(entry)
        raw_events = _read_session_jsonl(session_id)

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
