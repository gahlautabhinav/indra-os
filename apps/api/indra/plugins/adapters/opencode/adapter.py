"""OpenCode adapter — reads ~/.opencode/ sessions.

OpenCode (opencode.ai) is not currently installed on this machine.
This adapter scans the expected data directory and returns UNREACHABLE
until OpenCode is installed. Once installed it will auto-discover sessions.

Expected layout (based on OpenCode's open-source storage format):
  ~/.opencode/
    sessions/
      <UUID>/
        session.json     # metadata
        messages.jsonl   # conversation turns
"""

from __future__ import annotations

import contextlib
import json
import logging
from pathlib import Path

from ...base import (
    AbstractPlugin,
    PluginHealthStatus,
    SessionDetail,
    SessionEvent,
    SessionInfo,
)

log = logging.getLogger(__name__)

_PLUGIN_TYPE = "opencode"
_OPENCODE_DIR = Path.home() / ".opencode"
_SESSIONS_DIR = _OPENCODE_DIR / "sessions"


def _read_json_safe(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _parse_jsonl(path: Path) -> list[dict]:
    events: list[dict] = []
    if not path.exists():
        return events
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if line:
                with contextlib.suppress(json.JSONDecodeError):
                    events.append(json.loads(line))
    except OSError:
        pass
    return events


def _event_type(raw: dict) -> str:
    role = raw.get("role") or raw.get("type") or "unknown"
    mapping = {
        "user": "user_message",
        "assistant": "assistant_message",
        "tool": "tool_call",
        "tool_result": "tool_result",
    }
    return mapping.get(str(role).lower(), str(role))


def _extract_content(raw: dict) -> str | None:
    c = raw.get("content") or raw.get("text")
    if isinstance(c, list):
        parts = [b.get("text") or b.get("content") or "" for b in c if isinstance(b, dict)]
        return " ".join(p for p in parts if p) or None
    return str(c) if c else None


class OpenCodePlugin(AbstractPlugin):
    """Read-only adapter for OpenCode sessions in ~/.opencode/sessions/."""

    @property
    def plugin_type(self) -> str:
        return _PLUGIN_TYPE

    @property
    def display_name(self) -> str:
        return "OpenCode"

    @property
    def version(self) -> str:
        return "1.0.0"

    async def initialize(self) -> None:
        if not _OPENCODE_DIR.exists():
            log.info("OpenCode not installed — data dir %s not found", _OPENCODE_DIR)

    async def health_check(self) -> PluginHealthStatus:
        if not _OPENCODE_DIR.exists():
            return PluginHealthStatus.UNREACHABLE
        if _SESSIONS_DIR.exists():
            return PluginHealthStatus.HEALTHY
        return PluginHealthStatus.DEGRADED

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        if not _SESSIONS_DIR.exists():
            return []

        session_dirs = sorted(
            [d for d in _SESSIONS_DIR.iterdir() if d.is_dir()],
            key=lambda d: d.stat().st_mtime,
            reverse=True,
        )

        results: list[SessionInfo] = []
        for d in session_dirs[offset:]:
            meta = _read_json_safe(d / "session.json")
            session_id = meta.get("id") or d.name
            started_at = meta.get("createdAt") or meta.get("created_at") or "1970-01-01T00:00:00Z"
            status = meta.get("status") or "ended"
            if active_only and status != "active":
                continue
            results.append(SessionInfo(
                id=session_id,
                project_path=meta.get("workingDirectory") or meta.get("cwd"),
                started_at=started_at,
                status=status,
                plugin_type=_PLUGIN_TYPE,
                token_count=int(meta.get("totalTokens") or 0),
                cost_usd=float(meta.get("totalCost") or 0.0),
                metadata={"model": meta.get("model"), "dir": str(d)},
            ))
            if len(results) >= limit:
                break

        return results

    async def get_session(self, session_id: str) -> SessionDetail | None:
        # Try both direct UUID dir and searching
        candidate = _SESSIONS_DIR / session_id
        if not candidate.exists():
            # Search for a dir whose session.json has matching id
            candidate = next(
                (d for d in _SESSIONS_DIR.iterdir() if d.is_dir()
                 and _read_json_safe(d / "session.json").get("id") == session_id),
                None,
            )
        if candidate is None or not candidate.exists():
            return None

        meta = _read_json_safe(candidate / "session.json")
        raw_events = _parse_jsonl(candidate / "messages.jsonl")

        started_at = meta.get("createdAt") or meta.get("created_at") or "1970-01-01T00:00:00Z"
        events = [
            SessionEvent(
                id=raw.get("id") or f"{session_id}_{i}",
                event_type=_event_type(raw),
                content=_extract_content(raw),
                timestamp=raw.get("timestamp") or raw.get("createdAt") or started_at,
                input_tokens=int(raw.get("inputTokens") or 0),
                output_tokens=int(raw.get("outputTokens") or 0),
                cost_usd=float(raw.get("cost") or 0.0),
            )
            for i, raw in enumerate(raw_events)
        ]

        return SessionDetail(
            id=meta.get("id") or session_id,
            project_path=meta.get("workingDirectory") or meta.get("cwd"),
            started_at=started_at,
            status=meta.get("status") or "ended",
            plugin_type=_PLUGIN_TYPE,
            token_count=int(meta.get("totalTokens") or sum(e.input_tokens + e.output_tokens for e in events)),
            cost_usd=float(meta.get("totalCost") or sum(e.cost_usd for e in events)),
            events=events,
            metadata={"model": meta.get("model"), "dir": str(candidate)},
        )

    async def stream_events(self, session_id: str, since_event_id: str | None = None):
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
