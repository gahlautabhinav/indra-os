"""Unit tests for Claude Code session_reader."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from indra.plugins.adapters.claude_code.session_reader import (
    _decode_project_path,
    _extract_usage,
    _parse_ts,
    is_valid_session_id,
    read_session_events,
)


# ── is_valid_session_id ──────────────────────────────────────────────────────

def test_valid_session_id_accepts_uuid():
    assert is_valid_session_id("550e8400-e29b-41d4-a716-446655440000") is True


def test_valid_session_id_rejects_glob_chars():
    assert is_valid_session_id("*") is False
    assert is_valid_session_id("**/*") is False
    assert is_valid_session_id("[a-z]") is False


def test_valid_session_id_rejects_path_traversal():
    assert is_valid_session_id("../../etc/passwd") is False
    assert is_valid_session_id("../secret") is False


def test_valid_session_id_rejects_empty():
    assert is_valid_session_id("") is False


# ── _decode_project_path ─────────────────────────────────────────────────────

def test_decode_posix_path():
    # URL-encoded /home/user/projects
    encoded = "%2Fhome%2Fuser%2Fprojects"
    result = _decode_project_path(encoded)
    assert result == "/home/user/projects"


def test_decode_windows_path():
    encoded = "C%3A%5CUsers%5Cuser%5CProjects"
    result = _decode_project_path(encoded)
    assert result == "C:\\Users\\user\\Projects"


def test_decode_any_windows_drive():
    # Should accept E:\ not just C:\ and D:\
    encoded = "E%3A%5Cwork"
    result = _decode_project_path(encoded)
    assert result == "E:\\work"


def test_decode_returns_none_for_relative():
    result = _decode_project_path("relative_path_here")
    assert result is None


# ── _parse_ts ────────────────────────────────────────────────────────────────

def test_parse_ts_z_suffix():
    dt = _parse_ts("2024-01-15T10:30:00Z")
    assert dt is not None
    assert dt.tzinfo is not None  # must be timezone-aware


def test_parse_ts_naive_treated_as_utc():
    dt = _parse_ts("2024-01-15T10:30:00")
    assert dt is not None
    assert dt.tzinfo is not None  # naive → UTC


def test_parse_ts_empty_returns_none():
    assert _parse_ts("") is None


def test_parse_ts_invalid_returns_none():
    assert _parse_ts("not-a-date") is None


# ── _extract_usage ────────────────────────────────────────────────────────────

def test_extract_usage_reads_tokens():
    msg = {"usage": {"input_tokens": 100, "output_tokens": 50}}
    inp, out, cost = _extract_usage(msg)
    assert inp == 100
    assert out == 50
    assert cost > 0


def test_extract_usage_defaults_zero():
    inp, out, cost = _extract_usage({})
    assert inp == 0
    assert out == 0
    assert cost == 0.0


def test_extract_usage_missing_usage_key():
    inp, out, cost = _extract_usage({"usage": None})
    assert inp == 0


# ── read_session_events ──────────────────────────────────────────────────────

def _write_jsonl(lines: list[dict], path: Path) -> None:
    with path.open("w") as f:
        for line in lines:
            f.write(json.dumps(line) + "\n")


def test_read_session_events_basic():
    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as f:
        path = Path(f.name)

    _write_jsonl([
        {"type": "user", "message": {"content": "Hello"}, "timestamp": "2024-01-01T00:00:00Z"},
        {"type": "assistant", "message": {
            "content": [{"type": "text", "text": "World"}],
            "usage": {"input_tokens": 10, "output_tokens": 5},
        }, "timestamp": "2024-01-01T00:00:01Z"},
    ], path)

    _summary, events = read_session_events(path)
    assert len(events) == 2
    assert events[0]["event_type"] == "user_message"
    assert events[1]["event_type"] == "assistant_message"
    assert events[1]["input_tokens"] == 10
    assert events[1]["output_tokens"] == 5
    path.unlink()


def test_read_session_events_skips_summary_type():
    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as f:
        path = Path(f.name)

    _write_jsonl([
        {"type": "summary", "summary": "internal metadata"},
        {"type": "user", "message": {"content": "Hi"}, "timestamp": "2024-01-01T00:00:00Z"},
    ], path)

    _summary, events = read_session_events(path)
    assert len(events) == 1
    assert events[0]["event_type"] == "user_message"
    path.unlink()


def test_read_session_events_tool_call_detection():
    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as f:
        path = Path(f.name)

    _write_jsonl([
        {"type": "assistant", "message": {
            "content": [
                {"type": "tool_use", "name": "Read", "input": {"file_path": "/test"}},
            ],
            "usage": {"input_tokens": 5, "output_tokens": 3},
        }, "timestamp": "2024-01-01T00:00:00Z"},
    ], path)

    _summary, events = read_session_events(path)
    assert events[0]["event_type"] == "tool_call"
    assert "[tool_use:Read]" in (events[0]["content"] or "")
    path.unlink()


def test_read_session_events_truncation_marker():
    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as f:
        path = Path(f.name)

    long_input = {"file_path": "x" * 1000}
    _write_jsonl([
        {"type": "assistant", "message": {
            "content": [{"type": "tool_use", "name": "Edit", "input": long_input}],
            "usage": {"input_tokens": 1, "output_tokens": 1},
        }, "timestamp": "2024-01-01T00:00:00Z"},
    ], path)

    _summary, events = read_session_events(path)
    content = events[0]["content"] or ""
    assert "…[truncated]" in content
    path.unlink()


def test_read_session_events_skips_malformed_json():
    with tempfile.NamedTemporaryFile(suffix=".jsonl", mode="w", delete=False) as f:
        f.write('{"type": "user", "message": {"content": "ok"}, "timestamp": "2024-01-01T00:00:00Z"}\n')
        f.write("this is not json\n")
        f.write('{"type": "user", "message": {"content": "also ok"}, "timestamp": "2024-01-01T00:00:01Z"}\n')
        path = Path(f.name)

    _summary, events = read_session_events(path)
    assert len(events) == 2  # malformed line skipped
    path.unlink()


def test_read_session_events_empty_file():
    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as f:
        path = Path(f.name)

    _summary, events = read_session_events(path)
    assert events == []
    assert _summary["token_count"] == 0
    path.unlink()
