"""Antigravity adapter — reads Google Antigravity (Cascade) agent trajectories.

Antigravity is a VS Code–based agentic IDE/CLI. Its conversation **content** is
stored as an encrypted protobuf (`~/.gemini/antigravity/conversations/<id>.pb`)
that has no public schema, so message text is not recoverable. However, the
IDE keeps a readable **trajectory summary** index in its SQLite state store
(`…/Antigravity/User/globalStorage/state.vscdb`, key
`antigravityUnifiedStateSync.trajectorySummaries`) — a base64-wrapped protobuf
that pairs each conversation UUID with its human task title.

This adapter decodes that index (id + title), pairs each with the `.pb` file's
mtime for an accurate last-active timestamp, and surfaces them as read-only
sessions. Never writes to any Antigravity state.
"""

from __future__ import annotations

import base64
import contextlib
import logging
import os
import re
import shutil
import sqlite3
import sys
import tempfile
import time
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

_PLUGIN_TYPE = "antigravity"

_CONV_DIR = Path.home() / ".gemini" / "antigravity" / "conversations"
_TRAJECTORY_KEY = "antigravityUnifiedStateSync.trajectorySummaries"
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
_B64_RE = re.compile(r"^[A-Za-z0-9+/]{16,}={0,2}$")

# Cache the decoded trajectory map briefly — the SQLite store changes rarely.
_CACHE_TTL = 20.0


def _vscdb_path() -> Path | None:
    """Locate the Antigravity globalStorage SQLite state store across OSes."""
    candidates: list[Path] = []
    home = Path.home()
    if sys.platform == "win32":
        appdata = os.getenv("APPDATA")
        if appdata:
            candidates.append(Path(appdata) / "Antigravity" / "User" / "globalStorage" / "state.vscdb")
    elif sys.platform == "darwin":
        candidates.append(
            home / "Library" / "Application Support" / "Antigravity" / "User" / "globalStorage" / "state.vscdb"
        )
    else:
        candidates.append(home / ".config" / "Antigravity" / "User" / "globalStorage" / "state.vscdb")
    return next((c for c in candidates if c.exists()), None)


# ── Minimal protobuf reader (wire format, no schema) ──────────────────────────


def _read_varint(b: bytes, i: int) -> tuple[int, int]:
    shift = 0
    result = 0
    while i < len(b):
        x = b[i]
        i += 1
        result |= (x & 0x7F) << shift
        if not (x & 0x80):
            break
        shift += 7
    return result, i


def _collect_strings(b: bytes, depth: int, acc: list[str]) -> None:
    """Recursively gather printable string fields, descending into nested
    messages and base64-wrapped sub-protos."""
    i = 0
    n = len(b)
    while i < n:
        try:
            tag, i = _read_varint(b, i)
        except Exception:
            return
        wt = tag & 7
        if wt == 2:  # length-delimited
            ln, i = _read_varint(b, i)
            if ln < 0 or i + ln > n:
                return
            chunk = b[i : i + ln]
            i += ln
            try:
                s = chunk.decode("utf-8")
                if s.isprintable() and len(s) >= 3:
                    acc.append(s)
                    if depth < 10 and _B64_RE.match(s):
                        with contextlib.suppress(Exception):
                            _collect_strings(base64.b64decode(s + "==="), depth + 1, acc)
                    continue
            except UnicodeDecodeError:
                pass
            if depth < 10:
                _collect_strings(chunk, depth + 1, acc)
        elif wt == 0:
            _, i = _read_varint(b, i)
        elif wt == 5:
            i += 4
        elif wt == 1:
            i += 8
        else:
            return


def _looks_like_title(s: str) -> bool:
    return (
        " " in s
        and 4 <= len(s) <= 90
        and not s.startswith(("http", "{", "["))
        and sum(c.isalpha() for c in s) > len(s) * 0.5
    )


def _decode_trajectories(raw_b64: str) -> dict[str, str]:
    """Parse the top-level trajectorySummaries proto into {uuid: title}."""
    out: dict[str, str] = {}
    try:
        b = base64.b64decode(raw_b64)
    except Exception:
        return out
    i = 0
    n = len(b)
    while i < n:
        try:
            tag, i = _read_varint(b, i)
        except Exception:
            break
        wt = tag & 7
        if wt == 2:
            ln, i = _read_varint(b, i)
            if ln < 0 or i + ln > n:
                break
            entry = b[i : i + ln]
            i += ln
            acc: list[str] = []
            _collect_strings(entry, 0, acc)
            uid = next((s for s in acc if _UUID_RE.match(s)), None)
            title = next((s for s in acc if _looks_like_title(s)), None)
            if uid and uid not in out:
                out[uid] = title or "Antigravity session"
        elif wt == 0:
            _, i = _read_varint(b, i)
        elif wt == 5:
            i += 4
        elif wt == 1:
            i += 8
        else:
            break
    return out


class AntigravityPlugin(AbstractPlugin):
    """Read-only adapter for Google Antigravity agent trajectories."""

    def __init__(self) -> None:
        self._cache: dict[str, str] = {}
        self._cache_at = 0.0

    @property
    def plugin_type(self) -> str:
        return _PLUGIN_TYPE

    @property
    def display_name(self) -> str:
        return "Antigravity"

    @property
    def version(self) -> str:
        return "1.0.0"

    async def initialize(self) -> None:
        db = _vscdb_path()
        if db is None:
            log.warning("Antigravity state store not found — adapter will report UNREACHABLE")
        else:
            log.info("Antigravity adapter online (state store: %s)", db)

    async def health_check(self) -> PluginHealthStatus:
        if _vscdb_path() is None:
            return PluginHealthStatus.UNREACHABLE
        return PluginHealthStatus.HEALTHY

    # ── Trajectory index (cached) ─────────────────────────────────────────────

    def _trajectories(self) -> dict[str, str]:
        now = time.time()
        if self._cache and now - self._cache_at < _CACHE_TTL:
            return self._cache
        db = _vscdb_path()
        if db is None:
            return {}
        row = self._read_trajectory_value(db)
        if not row:
            return self._cache or {}
        self._cache = _decode_trajectories(row)
        self._cache_at = now
        return self._cache

    @staticmethod
    def _read_trajectory_value(db: Path) -> str | None:
        """
        Read the trajectorySummaries blob. The live IDE holds the SQLite store in
        WAL mode, so `mode=ro` can fail to open it. Copy the db (+ -wal/-shm) to a
        temp dir and read the snapshot instead — robust against locks.
        """
        tmpdir = tempfile.mkdtemp(prefix="indra_ag_")
        try:
            target = Path(tmpdir) / "state.vscdb"
            for suffix in ("", "-wal", "-shm"):
                src = db.with_name(db.name + suffix) if suffix else db
                if src.exists():
                    with contextlib.suppress(OSError):
                        shutil.copy2(src, target.with_name(target.name + suffix) if suffix else target)
            con = sqlite3.connect(f"file:{target}?mode=ro", uri=True, timeout=2.0)
            try:
                r = con.execute(
                    "SELECT value FROM ItemTable WHERE key=?", (_TRAJECTORY_KEY,)
                ).fetchone()
            finally:
                con.close()
            return r[0] if r and r[0] else None
        except Exception:
            log.exception("Failed to read Antigravity state store")
            return None
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    @staticmethod
    def _pb_path(session_id: str) -> Path:
        return _CONV_DIR / f"{session_id}.pb"

    def _build_info(self, session_id: str, title: str) -> SessionInfo:
        pb = self._pb_path(session_id)
        size = 0
        mtime = 0.0
        if pb.exists():
            try:
                st = pb.stat()
                size = st.st_size
                mtime = st.st_mtime
            except OSError:
                pass
        started_at = (
            datetime.fromtimestamp(mtime, tz=UTC).isoformat()
            if mtime
            else "1970-01-01T00:00:00+00:00"
        )
        status = "active" if mtime and (time.time() - mtime) < 300 else "ended"
        return SessionInfo(
            id=session_id,
            project_path=None,
            started_at=started_at,
            status=status,
            plugin_type=_PLUGIN_TYPE,
            token_count=0,
            cost_usd=0.0,
            metadata={
                "title": title,
                "content_available": False,
                "note": "Antigravity stores conversation content as encrypted protobuf; only the task title and timing are recoverable.",
                "pb_size_bytes": size,
            },
        )

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        traj = self._trajectories()
        infos = [self._build_info(sid, title) for sid, title in traj.items()]
        # newest first by started_at
        infos.sort(key=lambda s: s.started_at, reverse=True)
        if active_only:
            infos = [s for s in infos if s.status == "active"]
        return infos[offset : offset + limit]

    async def get_session(self, session_id: str) -> SessionDetail | None:
        traj = self._trajectories()
        title = traj.get(session_id)
        if title is None:
            return None
        info = self._build_info(session_id, title)
        # Surface the task title as a single synthetic turn so the conversation
        # view shows something meaningful even though message text is encrypted.
        event = SessionEvent(
            id=f"{session_id}:0",
            event_type="user_message",
            content=(
                f"Antigravity task — “{title}”.\n\n"
                "Conversation content is stored in Antigravity's encrypted format "
                "and can't be displayed. Title, status, and timing are surfaced."
            ),
            timestamp=info.started_at,
        )
        return SessionDetail(
            id=info.id,
            project_path=info.project_path,
            started_at=info.started_at,
            ended_at=None if info.status == "active" else info.started_at,
            status=info.status,
            plugin_type=_PLUGIN_TYPE,
            token_count=0,
            cost_usd=0.0,
            events=[event],
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

    async def poll_once(self) -> list[SessionInfo]:
        return await self.list_sessions(limit=100, active_only=True)
