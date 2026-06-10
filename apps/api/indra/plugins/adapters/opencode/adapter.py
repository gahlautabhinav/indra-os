"""OpenCode adapter — reads OpenCode's SQLite session store (read-only).

OpenCode (opencode.ai / sst/opencode) ≥ v1.16 keeps everything in a single
SQLite database, not loose JSON files:

  $XDG_DATA_HOME/opencode/opencode.db          (Linux/macOS, and Windows default
  ~/.local/share/opencode/opencode.db           — OpenCode follows XDG on Windows too)

  Tables we read:
    session  — id, slug, title, directory, agent, model(json), cost,
               tokens_input, tokens_output, time_created/updated (ms epoch)
    message  — id, session_id, data(json) → role
    part     — id, message_id, session_id, data(json) → text / reasoning / tool

The DB is usually in WAL mode and held open by a running `opencode`, so we
snapshot the db + -wal + -shm into a temp dir before reading (same trick the
Antigravity adapter uses for the IDE's state.vscdb).

Legacy layout (`~/.opencode/sessions/<uuid>/session.json`) is still probed as a
fallback for older installs, but the SQLite store is authoritative.
"""

from __future__ import annotations

import contextlib
import json
import logging
import os
import shutil
import sqlite3
import tempfile
import time
from collections.abc import AsyncIterator, Generator
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

_PLUGIN_TYPE = "opencode"
# A session is "active" only if its row was touched within this window.
_ACTIVE_WINDOW_S = 300
# Part types that carry no conversational content (pure control markers).
_SKIP_PART_TYPES = {"step-start", "step-finish", "snapshot", "patch"}


def _candidate_dirs() -> list[Path]:
    """OpenCode data-dir candidates, most-authoritative first."""
    dirs: list[Path] = []
    xdg = os.environ.get("XDG_DATA_HOME")
    if xdg:
        dirs.append(Path(xdg) / "opencode")
    dirs.append(Path.home() / ".local" / "share" / "opencode")
    dirs.append(Path.home() / ".opencode")
    return dirs


def _find_db() -> Path | None:
    for d in _candidate_dirs():
        db = d / "opencode.db"
        if db.exists():
            return db
    return None


def _iso(ms: int | str | float | None) -> str:
    """OpenCode stores millisecond epoch integers — convert to ISO-8601 UTC."""
    if ms is None:
        return "1970-01-01T00:00:00+00:00"
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=UTC).isoformat()
    except (TypeError, ValueError, OverflowError, OSError):
        return "1970-01-01T00:00:00+00:00"


def _model_label(raw: object) -> str | None:
    """session.model is a JSON blob like {"id":..,"providerID":..,"variant":..}."""
    if not raw:
        return None
    if isinstance(raw, str):
        with contextlib.suppress(json.JSONDecodeError):
            raw = json.loads(raw)
    if isinstance(raw, dict):
        model_id = raw.get("id") or raw.get("modelID")
        provider = raw.get("providerID") or raw.get("provider")
        if model_id and provider:
            return f"{provider}/{model_id}"
        if model_id:
            return str(model_id)
        return None
    return str(raw) or None


def _clean_title(title: object, slug: object) -> str | None:
    """Prefer a real title; OpenCode autogenerates "New session - <iso>" before
    the model has summarised the chat — fall back to the friendly slug then."""
    t = str(title).strip() if title else ""
    if t and not t.lower().startswith("new session"):
        return t
    s = str(slug).strip() if slug else ""
    if s:
        # slugs are kebab like "crisp-eagle" → "Crisp Eagle"
        return s.replace("-", " ").title()
    return t or None


@contextlib.contextmanager
def _open_snapshot(db: Path) -> Generator[sqlite3.Connection, None, None]:
    """Copy db (+ -wal/-shm) to a temp dir and yield a read-only connection.

    Snapshotting avoids the WAL lock held by a live `opencode` process and
    guarantees we never write to the user's store.
    """
    tmpdir = tempfile.mkdtemp(prefix="indra_opencode_")
    try:
        snap = Path(tmpdir) / "opencode.db"
        for ext in ("", "-wal", "-shm"):
            src = Path(str(db) + ext)
            if src.exists():
                shutil.copy2(src, str(snap) + ext)
        con = sqlite3.connect(f"file:{snap}?mode=ro", uri=True)
        con.row_factory = sqlite3.Row
        try:
            yield con
        finally:
            con.close()
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _row_to_info(row: sqlite3.Row) -> SessionInfo:
    updated = row["time_updated"]
    try:
        active = (time.time() * 1000 - int(updated)) < _ACTIVE_WINDOW_S * 1000
    except (TypeError, ValueError):
        active = False
    return SessionInfo(
        id=row["id"],
        project_path=row["directory"] or None,
        started_at=_iso(row["time_created"]),
        status="active" if active else "ended",
        plugin_type=_PLUGIN_TYPE,
        token_count=int((row["tokens_input"] or 0) + (row["tokens_output"] or 0)),
        cost_usd=float(row["cost"] or 0.0),
        metadata={
            "title": _clean_title(row["title"], row["slug"]),
            "slug": row["slug"],
            "model": _model_label(row["model"]),
            "agent": row["agent"],
            "updated_at": _iso(updated),
        },
    )


def _part_to_event(
    part: sqlite3.Row, role: str, fallback_ts: str
) -> SessionEvent | None:
    """Map an OpenCode `part` row to a SessionEvent, or None to drop it."""
    try:
        data = json.loads(part["data"])
    except (json.JSONDecodeError, TypeError):
        return None
    ptype = data.get("type")
    if ptype in _SKIP_PART_TYPES:
        return None

    content: str | None = None
    event_type: str
    if ptype == "text":
        content = data.get("text")
        event_type = "assistant_message" if role == "assistant" else "user_message"
    elif ptype == "reasoning":
        content = data.get("text")
        event_type = "assistant_message"
    elif ptype == "tool":
        tool = data.get("tool") or "tool"
        state = data.get("state") or {}
        status = state.get("status")
        title = state.get("title")
        content = title or (f"{tool} ({status})" if status else tool)
        event_type = "tool_call"
    elif ptype == "file":
        content = data.get("filename") or data.get("url") or "file"
        event_type = "tool_result"
    else:
        content = data.get("text")
        event_type = str(ptype or "unknown")

    if content is None and event_type not in ("tool_call", "tool_result"):
        return None

    return SessionEvent(
        id=part["id"],
        event_type=event_type,
        content=content,
        timestamp=_iso(part["time_created"]) or fallback_ts,
        metadata={"part_type": ptype},
    )


class OpenCodePlugin(AbstractPlugin):
    """Read-only adapter for the OpenCode SQLite session store."""

    @property
    def plugin_type(self) -> str:
        return _PLUGIN_TYPE

    @property
    def display_name(self) -> str:
        return "OpenCode"

    @property
    def version(self) -> str:
        return "2.0.0"

    async def initialize(self) -> None:
        if _find_db() is None:
            log.info("OpenCode not installed — no opencode.db in %s", _candidate_dirs())

    async def health_check(self) -> PluginHealthStatus:
        db = _find_db()
        if db is None:
            return PluginHealthStatus.UNREACHABLE
        try:
            with _open_snapshot(db) as con:
                con.execute("SELECT 1 FROM session LIMIT 1")
            return PluginHealthStatus.HEALTHY
        except sqlite3.Error:
            return PluginHealthStatus.DEGRADED

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        db = _find_db()
        if db is None:
            return []
        try:
            with _open_snapshot(db) as con:
                rows = con.execute(
                    "SELECT id, slug, title, directory, agent, model, cost, "
                    "tokens_input, tokens_output, time_created, time_updated "
                    "FROM session ORDER BY time_updated DESC LIMIT ? OFFSET ?",
                    (limit + offset if not active_only else 500, offset),
                ).fetchall()
        except sqlite3.Error as exc:
            log.warning("OpenCode list_sessions failed: %s", exc)
            return []

        results: list[SessionInfo] = []
        for row in rows:
            info = _row_to_info(row)
            if active_only and info.status != "active":
                continue
            results.append(info)
            if len(results) >= limit:
                break
        return results

    async def get_session(self, session_id: str) -> SessionDetail | None:
        db = _find_db()
        if db is None:
            return None
        try:
            with _open_snapshot(db) as con:
                srow = con.execute(
                    "SELECT id, slug, title, directory, agent, model, cost, "
                    "tokens_input, tokens_output, time_created, time_updated "
                    "FROM session WHERE id = ?",
                    (session_id,),
                ).fetchone()
                if srow is None:
                    return None
                info = _row_to_info(srow)

                # message_id → role, so each part knows who authored it
                role_by_msg: dict[str, str] = {}
                for m in con.execute(
                    "SELECT id, data FROM message WHERE session_id = ?", (session_id,)
                ):
                    with contextlib.suppress(json.JSONDecodeError, TypeError):
                        role_by_msg[m["id"]] = json.loads(m["data"]).get("role", "")

                part_rows = con.execute(
                    "SELECT id, message_id, time_created, data FROM part "
                    "WHERE session_id = ? ORDER BY time_created ASC",
                    (session_id,),
                ).fetchall()
        except sqlite3.Error as exc:
            log.warning("OpenCode get_session(%s) failed: %s", session_id, exc)
            return None

        events: list[SessionEvent] = []
        for part in part_rows:
            role = role_by_msg.get(part["message_id"], "")
            ev = _part_to_event(part, role, info.started_at)
            if ev is not None:
                events.append(ev)

        return SessionDetail(
            id=info.id,
            project_path=info.project_path,
            started_at=info.started_at,
            status=info.status,
            plugin_type=_PLUGIN_TYPE,
            token_count=info.token_count,
            cost_usd=info.cost_usd,
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
