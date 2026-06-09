"""Claude Code plugin adapter — maps ~/.claude/projects/ JSONL to INDRA types."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from pathlib import Path

from ...base import (
    AbstractPlugin,
    PluginHealthStatus,
    SessionDetail,
    SessionEvent,
    SessionInfo,
)
from .session_reader import (
    _CLAUDE_PROJECTS_DIR,
    is_valid_session_id,
    list_session_paths,
    read_session_full_async,
    read_session_summary_async,
)

log = logging.getLogger(__name__)

_PLUGIN_TYPE = "claude_code"

# Semaphore sized to the default asyncio thread pool (cpu_count + 4, max 32).
import os as _os  # noqa: E402

_IO_CONCURRENCY = min(32, (_os.cpu_count() or 4) + 4)


class ClaudeCodePlugin(AbstractPlugin):
    """
    Read-only adapter over Claude Code's local session store.

    Scans ~/.claude/projects/<encoded-project-path>/<session-uuid>.jsonl.
    Never writes to Claude's storage. Never starts/stops any Claude process.
    """

    @property
    def plugin_type(self) -> str:
        return _PLUGIN_TYPE

    @property
    def display_name(self) -> str:
        return "Claude Code"

    @property
    def version(self) -> str:
        return "1.0.0"

    # ── Lifecycle ────────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        if not _CLAUDE_PROJECTS_DIR.exists():
            log.warning(
                "Claude Code projects directory not found at %s — "
                "sessions will be empty until Claude Code is run.",
                _CLAUDE_PROJECTS_DIR,
            )

    # ── Health ────────────────────────────────────────────────────────────────

    async def health_check(self) -> PluginHealthStatus:
        if not _CLAUDE_PROJECTS_DIR.exists():
            return PluginHealthStatus.UNREACHABLE
        try:
            # Attempt a single entry read to verify the dir is accessible.
            next(_CLAUDE_PROJECTS_DIR.iterdir(), None)
            return PluginHealthStatus.HEALTHY
        except OSError:
            return PluginHealthStatus.DEGRADED

    # ── Sessions ──────────────────────────────────────────────────────────────

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        all_paths = list_session_paths()
        if not all_paths:
            return []

        semaphore = asyncio.Semaphore(_IO_CONCURRENCY)
        results: list[SessionInfo] = []

        # Iterate until we collect `limit` results — avoids the heuristic
        # over-fetch that breaks when most sessions are filtered.
        candidate_paths = all_paths[offset:]

        async def _read(path: Path) -> SessionInfo | None:
            async with semaphore:
                try:
                    summary = await read_session_summary_async(path)
                    if active_only and summary["status"] != "active":
                        return None
                    return SessionInfo(
                        id=summary["session_id"],
                        project_path=summary["project_path"],
                        started_at=summary["started_at"],
                        status=summary["status"],
                        plugin_type=_PLUGIN_TYPE,
                        token_count=summary["token_count"],
                        cost_usd=summary["cost_usd"],
                        metadata={
                            "event_count": summary["event_count"],
                            "last_event_at": summary["last_event_at"],
                            "jsonl_path": str(path),
                            "title": summary.get("title"),
                        },
                    )
                except Exception:
                    log.exception("Failed to read session from %s", path)
                    return None

        # Batch in chunks of (IO_CONCURRENCY * 2) to avoid reading 10k files
        # when `limit` is satisfied early (common for active_only=True).
        batch_size = _IO_CONCURRENCY * 2
        for i in range(0, len(candidate_paths), batch_size):
            batch = candidate_paths[i : i + batch_size]
            batch_results = await asyncio.gather(*(_read(p) for p in batch))
            results.extend(s for s in batch_results if s is not None)
            if len(results) >= limit:
                break

        return results[:limit]

    async def get_session(self, session_id: str) -> SessionDetail | None:
        """Find the JSONL file and return full session detail from a single file read."""
        path = self._find_path(session_id)
        if path is None:
            return None

        try:
            # Single-pass read — summary and events in one file open to avoid TOCTOU.
            summary, raw_events = await read_session_full_async(path)
        except Exception:
            log.exception("Failed to read session detail for %s", session_id)
            return None

        events = [
            SessionEvent(
                id=ev["id"],
                event_type=ev["event_type"],
                content=ev["content"],
                timestamp=ev["timestamp"],
                input_tokens=ev["input_tokens"],
                output_tokens=ev["output_tokens"],
                cost_usd=ev["cost_usd"],
            )
            for ev in raw_events
        ]

        return SessionDetail(
            id=summary["session_id"],
            project_path=summary["project_path"],
            started_at=summary["started_at"],
            ended_at=summary["last_event_at"] if summary["status"] == "ended" else None,
            status=summary["status"],
            plugin_type=_PLUGIN_TYPE,
            token_count=summary["token_count"],
            cost_usd=summary["cost_usd"],
            events=events,
            metadata={
                "event_count": summary["event_count"],
                "jsonl_path": str(path),
                "title": summary.get("title"),
            },
        )

    async def stream_events(
        self,
        session_id: str,
        since_event_id: str | None = None,
    ) -> AsyncIterator[SessionEvent]:
        """
        Yield events from the session JSONL file.

        Since Claude Code JSONL is append-only (no streaming push API),
        this reads the file once and yields in memory.

        `since_event_id` is EXCLUSIVE — the matching event is not yielded;
        only events that come after it in the file are yielded. This is the
        correct semantic for "resume from last seen" pagination.
        """
        path = self._find_path(session_id)
        if path is None:
            return

        try:
            _summary, raw_events = await read_session_full_async(path)
        except Exception:
            log.exception("stream_events failed for %s", session_id)
            return

        if since_event_id is None:
            for ev in raw_events:
                yield self._to_event(ev)
        else:
            emit = False
            for ev in raw_events:
                if not emit:
                    if ev["id"] == since_event_id:
                        # Found boundary — next iteration starts emitting.
                        emit = True
                    continue
                yield self._to_event(ev)

    # ── Poll ──────────────────────────────────────────────────────────────────

    async def poll_once(self) -> list[SessionInfo]:
        return await self.list_sessions(limit=100, active_only=True)

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _to_event(ev: dict) -> SessionEvent:
        return SessionEvent(
            id=ev["id"],
            event_type=ev["event_type"],
            content=ev["content"],
            timestamp=ev["timestamp"],
            input_tokens=ev["input_tokens"],
            output_tokens=ev["output_tokens"],
            cost_usd=ev["cost_usd"],
        )

    def _find_path(self, session_id: str) -> Path | None:
        """
        Locate the JSONL file for a given session UUID.

        session_id MUST be a valid UUID — validated here to prevent glob
        metacharacter injection (e.g. '*', '**', '[a-z]') in the search pattern.
        """
        if not is_valid_session_id(session_id):
            log.warning("Invalid session_id format rejected: %r", session_id)
            return None
        if not _CLAUDE_PROJECTS_DIR.exists():
            return None
        # Two-level glob matches the known layout without following symlinks.
        matches = list(_CLAUDE_PROJECTS_DIR.glob(f"*/{session_id}.jsonl"))
        if not matches:
            return None
        if len(matches) > 1:
            log.warning("Multiple JSONL files for session %s — using newest", session_id)
            matches.sort(key=lambda p: p.stat().st_mtime if p.exists() else 0, reverse=True)
        return matches[0]
