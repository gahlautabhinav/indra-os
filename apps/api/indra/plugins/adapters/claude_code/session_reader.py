"""
Claude Code session reader.

Scans ~/.claude/projects/ for conversation JSONL files and extracts
SessionInfo + SessionEvent records without modifying any Claude state.

Directory layout (Claude Code 1.x):
    ~/.claude/projects/<encoded-path>/<session-uuid>.jsonl

Each JSONL line is one of:
    {"type": "user",      "message": {...}, "timestamp": "..."}
    {"type": "assistant", "message": {...}, "timestamp": "..."}
    {"type": "summary",   ...}  (skipped)

Usage lives at: message.usage.{input_tokens, output_tokens}
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

log = logging.getLogger(__name__)

_DEFAULT_INPUT_COST_PER_MTOK = float(os.getenv("INDRA_CLAUDE_INPUT_COST_PER_MTOK", "3.0"))
_DEFAULT_OUTPUT_COST_PER_MTOK = float(os.getenv("INDRA_CLAUDE_OUTPUT_COST_PER_MTOK", "15.0"))

_CLAUDE_PROJECTS_DIR = Path.home() / ".claude" / "projects"

# ISO-8601 prefix detector (both Z and offset forms).
_ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")

# Strict UUID-v4 pattern — used to validate session_id before glob.
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

# Maximum JSONL file size we'll parse (200 MB). Larger files are skipped with a warning.
_MAX_FILE_BYTES = 200 * 1024 * 1024

# Chars to include in content preview before truncation marker.
_CONTENT_PREVIEW_LEN = 500


# ── Internal helpers ──────────────────────────────────────────────────────────


def _decode_project_path(encoded_dir: str) -> str | None:
    """
    Decode a Claude project directory name back to a filesystem path.
    Claude percent-encodes the project path as the directory name.
    Returns None if the result doesn't look like an absolute path.
    """
    from urllib.parse import unquote
    try:
        decoded = unquote(encoded_dir)
    except Exception:
        return None

    # POSIX absolute path.
    if decoded.startswith("/"):
        return decoded

    # Windows absolute path: letter + colon + separator.
    if (
        len(decoded) >= 3
        and decoded[1] == ":"
        and decoded[2] in ("\\/")
        and decoded[0].isalpha()
    ):
        return decoded

    return None


def _extract_usage(message: dict) -> tuple[int, int, float]:
    """Return (input_tokens, output_tokens, cost_usd) from an assistant message dict."""
    usage = message.get("usage") or {}
    input_tok = int(usage.get("input_tokens", 0))
    output_tok = int(usage.get("output_tokens", 0))
    cost = (
        input_tok * _DEFAULT_INPUT_COST_PER_MTOK / 1_000_000
        + output_tok * _DEFAULT_OUTPUT_COST_PER_MTOK / 1_000_000
    )
    return input_tok, output_tok, cost


def _truncate(text: str, max_len: int = _CONTENT_PREVIEW_LEN) -> str:
    """Truncate with an explicit marker so downstream consumers know data was cut."""
    if len(text) <= max_len:
        return text
    return text[:max_len] + "…[truncated]"


def _iter_jsonl(path: Path) -> Iterator[dict]:
    """Yield parsed JSON objects from a JSONL file, skipping malformed lines."""
    try:
        size = path.stat().st_size
    except OSError:
        return
    if size > _MAX_FILE_BYTES:
        log.warning("Skipping oversized JSONL (%d MB): %s", size // (1024 * 1024), path)
        return
    try:
        with path.open("r", encoding="utf-8", errors="replace") as fh:
            for lineno, line in enumerate(fh, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    log.debug("Skipping malformed JSONL line %d in %s", lineno, path)
    except OSError as exc:
        log.warning("Cannot read JSONL %s: %s", path, exc)


def _session_id_from_path(jsonl_path: Path) -> str:
    return jsonl_path.stem


def _parse_ts(ts: str) -> datetime | None:
    """Parse ISO-8601 timestamp. Always returns an aware datetime (UTC if no tzinfo)."""
    if not ts or not _ISO_RE.match(ts):
        return None
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt
    except ValueError:
        return None


def _infer_session_status(events: list[dict]) -> str:
    """
    Heuristic: if the most recent event timestamp is within 5 minutes of now → active.
    Claude Code does not write an explicit 'ended' marker.
    """
    for raw in reversed(events):
        dt = _parse_ts(raw.get("timestamp", ""))
        if dt:
            age_s = time.time() - dt.timestamp()
            return "active" if age_s < 300 else "ended"
    return "ended"


def _safe_mtime(path: Path) -> float:
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0


# ── Public API ────────────────────────────────────────────────────────────────


def is_valid_session_id(session_id: str) -> bool:
    """Return True if session_id is a valid Claude Code session UUID."""
    return bool(_UUID_RE.fullmatch(session_id))


def list_project_dirs() -> list[Path]:
    """Return all Claude project directories, sorted by mtime descending."""
    if not _CLAUDE_PROJECTS_DIR.exists():
        return []
    try:
        dirs = [d for d in _CLAUDE_PROJECTS_DIR.iterdir() if d.is_dir()]
        dirs.sort(key=lambda d: _safe_mtime(d), reverse=True)
        return dirs
    except OSError as exc:
        log.warning("Cannot list Claude projects dir: %s", exc)
        return []


def list_session_paths(project_dir: Path | None = None) -> list[Path]:
    """
    Return all JSONL session file paths, newest first.

    Uses a two-level glob (project-dir/*.jsonl) instead of rglob to avoid
    following symlinks that could escape the projects directory.
    """
    base = project_dir if project_dir else _CLAUDE_PROJECTS_DIR
    if not base.exists():
        return []
    try:
        paths = list(base.glob("*.jsonl")) if project_dir else list(base.glob("*/*.jsonl"))
        paths.sort(key=lambda p: _safe_mtime(p), reverse=True)
        return paths
    except OSError as exc:
        log.warning("Cannot glob JSONL files under %s: %s", base, exc)
        return []


def read_session_summary(jsonl_path: Path) -> dict:
    """
    Stream a JSONL file and return aggregate metrics without loading all events.

    Returns:
        {
            "session_id": str,
            "project_path": str | None,
            "started_at": str,        # ISO-8601 of first event
            "last_event_at": str,     # ISO-8601 of last event
            "status": "active" | "ended",
            "token_count": int,
            "cost_usd": float,
            "event_count": int,
        }
    """
    session_id = _session_id_from_path(jsonl_path)

    total_input = 0
    total_output = 0
    total_cost = 0.0
    event_count = 0
    min_ts: datetime | None = None
    max_ts: datetime | None = None
    cwd: str | None = None
    ai_title: str | None = None
    # Stream — do NOT materialize the full list.
    for raw in _iter_jsonl(jsonl_path):
        ts_str = raw.get("timestamp", "")
        ts = _parse_ts(ts_str)
        if ts:
            if min_ts is None or ts < min_ts:
                min_ts = ts
            if max_ts is None or ts > max_ts:
                max_ts = ts
        if cwd is None and raw.get("cwd"):
            cwd = raw.get("cwd")
        if raw.get("type") == "ai-title" and raw.get("aiTitle"):
            ai_title = raw.get("aiTitle")  # keep the latest title
        if raw.get("type") == "assistant":
            inp, out, cost = _extract_usage(raw.get("message") or {})
            total_input += inp
            total_output += out
            total_cost += cost
        event_count += 1

    # Real working directory beats the lossy dash-encoded project dir name.
    project_path = cwd or _decode_project_path(jsonl_path.parent.name)

    # Infer status from last event age without re-reading file.
    if max_ts:
        age_s = time.time() - max_ts.timestamp()
        status = "active" if age_s < 300 else "ended"
    else:
        status = "ended"

    started_at = min_ts.isoformat() if min_ts else ""
    last_event_at = max_ts.isoformat() if max_ts else started_at

    return {
        "session_id": session_id,
        "project_path": project_path,
        "title": ai_title,
        "started_at": started_at,
        "last_event_at": last_event_at,
        "status": status,
        "token_count": total_input + total_output,
        "cost_usd": round(total_cost, 6),
        "event_count": event_count,
    }


def read_session_events(jsonl_path: Path) -> tuple[dict, list[dict]]:
    """
    Parse a JSONL session file in a SINGLE PASS and return both summary and events.

    Returning both from one read eliminates the TOCTOU race in get_session().

    Events format:
        {
            "id": str,               # "{session_id}:{line_index}"
            "event_type": str,       # "user_message" | "assistant_message" | "tool_call" | "tool_result"
            "content": str | None,
            "timestamp": str,
            "input_tokens": int,
            "output_tokens": int,
            "cost_usd": float,
        }
    """
    session_id = _session_id_from_path(jsonl_path)

    events: list[dict] = []
    total_input = 0
    total_output = 0
    total_cost = 0.0
    min_ts: datetime | None = None
    max_ts: datetime | None = None
    cwd: str | None = None
    ai_title: str | None = None

    for idx, raw in enumerate(_iter_jsonl(jsonl_path)):
        msg_type = raw.get("type", "")
        if cwd is None and raw.get("cwd"):
            cwd = raw.get("cwd")
        if msg_type == "ai-title":
            if raw.get("aiTitle"):
                ai_title = raw.get("aiTitle")
            continue
        if msg_type == "summary":
            continue

        ts_str = raw.get("timestamp", "")
        ts = _parse_ts(ts_str)
        if ts:
            if min_ts is None or ts < min_ts:
                min_ts = ts
            if max_ts is None or ts > max_ts:
                max_ts = ts

        message = raw.get("message") or {}
        content_blocks = message.get("content") or []

        content_text: str | None
        event_type: str

        if isinstance(content_blocks, str):
            content_text = content_blocks or None
            event_type = "user_message" if msg_type == "user" else "assistant_message"
        elif isinstance(content_blocks, list):
            texts: list[str] = []
            has_tool_use = False
            has_tool_result = False
            for block in content_blocks:
                if not isinstance(block, dict):
                    continue
                btype = block.get("type", "")
                if btype == "text":
                    t = block.get("text", "")
                    if t:
                        texts.append(t)
                elif btype == "tool_use":
                    has_tool_use = True
                    tool_name = block.get("name", "tool")
                    inp_data = json.dumps(block.get("input") or {})
                    texts.append(f"[tool_use:{tool_name}] {_truncate(inp_data)}")
                elif btype == "tool_result":
                    has_tool_result = True
                    rc = block.get("content", "")
                    if isinstance(rc, list):
                        rc = " ".join(
                            b.get("text", "") for b in rc
                            if isinstance(b, dict) and b.get("type") == "text"
                        )
                    texts.append(f"[tool_result] {_truncate(str(rc))}")

            content_text = "\n".join(texts) or None
            # Priority: tool_use > tool_result > role-based
            if has_tool_use:
                event_type = "tool_call"
            elif has_tool_result:
                event_type = "tool_result"
            elif msg_type == "user":
                event_type = "user_message"
            else:
                event_type = "assistant_message"
        else:
            content_text = None
            event_type = "user_message" if msg_type == "user" else "assistant_message"

        input_tok = output_tok = 0
        cost = 0.0
        if msg_type == "assistant":
            input_tok, output_tok, cost = _extract_usage(message)
            total_input += input_tok
            total_output += output_tok
            total_cost += cost

        events.append({
            "id": f"{session_id}:{idx}",
            "event_type": event_type,
            "content": content_text,
            "timestamp": ts_str,
            "input_tokens": input_tok,
            "output_tokens": output_tok,
            "cost_usd": round(cost, 6),
        })

    if max_ts:
        age_s = time.time() - max_ts.timestamp()
        status = "active" if age_s < 300 else "ended"
    else:
        status = "ended"

    summary = {
        "session_id": session_id,
        "project_path": cwd or _decode_project_path(jsonl_path.parent.name),
        "title": ai_title,
        "started_at": min_ts.isoformat() if min_ts else "",
        "last_event_at": max_ts.isoformat() if max_ts else "",
        "status": status,
        "token_count": total_input + total_output,
        "cost_usd": round(total_cost, 6),
        "event_count": len(events),
    }
    return summary, events


async def read_session_summary_async(jsonl_path: Path) -> dict:
    """Async wrapper for read_session_summary — runs in thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, read_session_summary, jsonl_path)


async def read_session_full_async(jsonl_path: Path) -> tuple[dict, list[dict]]:
    """
    Async wrapper for read_session_events (single-pass, returns summary + events).
    Use this instead of calling summary + events separately to avoid TOCTOU.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, read_session_events, jsonl_path)
