"""Unit tests for Sūryaḥ TraceService helpers."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from indra.domains.vasu.suryah.service import _make_span, _update_span
from indra.domains.vasu.suryah.schemas import SpanIngest


# ── _make_span ────────────────────────────────────────────────────────────────

def test_make_span_sets_all_fields():
    span_in = SpanIngest(
        span_id="abc123",
        parent_span_id="parent456",
        name="tool_call",
        kind="client",
        status="ok",
        duration_ms=250,
        started_at="2024-01-15T10:00:00Z",
        finished_at="2024-01-15T10:00:00.250Z",
        attributes={"tool": "Read"},
        events=[{"name": "start"}],
    )
    span = _make_span("trace-001", span_in)

    assert span.span_id == "abc123"
    assert span.parent_span_id == "parent456"
    assert span.trace_id == "trace-001"
    assert span.name == "tool_call"
    assert span.kind == "client"
    assert span.status == "ok"
    assert span.duration_ms == 250
    assert span.attributes == {"tool": "Read"}
    assert span.events == [{"name": "start"}]
    assert span.started_at is not None
    assert span.started_at.tzinfo == timezone.utc


def test_make_span_handles_z_suffix():
    span_in = SpanIngest(
        span_id="z001",
        name="test",
        started_at="2024-06-01T00:00:00Z",
        finished_at="2024-06-01T00:00:01Z",
    )
    span = _make_span("trace-z", span_in)
    assert span.started_at.tzinfo is not None
    assert span.finished_at.tzinfo is not None


def test_make_span_handles_none_timestamps():
    span_in = SpanIngest(span_id="s1", name="no-times")
    span = _make_span("t1", span_in)
    assert span.started_at is None
    assert span.finished_at is None


def test_make_span_defaults_empty_attributes_and_events():
    span_in = SpanIngest(span_id="s2", name="defaults")
    span = _make_span("t2", span_in)
    assert span.attributes == {}
    assert span.events == []


# ── _update_span ──────────────────────────────────────────────────────────────

def _blank_span():
    from indra.models.trace import Span
    return Span(
        span_id="u1",
        trace_id="t1",
        name="original",
        status="running",
        duration_ms=None,
        attributes={},
        events=[],
    )


def test_update_span_overwrites_status():
    span = _blank_span()
    span_in = SpanIngest(span_id="u1", name="x", status="ok")
    _update_span(span, span_in)
    assert span.status == "ok"


def test_update_span_overwrites_duration():
    span = _blank_span()
    span_in = SpanIngest(span_id="u1", name="x", duration_ms=500)
    _update_span(span, span_in)
    assert span.duration_ms == 500


def test_update_span_overwrites_attributes():
    span = _blank_span()
    span_in = SpanIngest(span_id="u1", name="x", attributes={"key": "val"})
    _update_span(span, span_in)
    assert span.attributes == {"key": "val"}


def test_update_span_ignores_none_status():
    span = _blank_span()
    span_in = SpanIngest(span_id="u1", name="x")  # status=None
    _update_span(span, span_in)
    assert span.status == "running"  # unchanged


def test_update_span_sets_finished_at():
    span = _blank_span()
    span_in = SpanIngest(span_id="u1", name="x", finished_at="2024-01-01T00:00:00Z")
    _update_span(span, span_in)
    assert span.finished_at is not None
    assert span.finished_at.tzinfo == timezone.utc


# ── SpanIngest validation ──────────────────────────────────────────────────────

def test_span_ingest_defaults_empty_collections():
    s = SpanIngest(span_id="x", name="test")
    assert s.attributes == {}
    assert s.events == []
    assert s.parent_span_id is None
    assert s.kind is None
    assert s.status is None


# ── TraceIngestRequest validation ─────────────────────────────────────────────

def test_trace_ingest_request_defaults():
    from indra.domains.vasu.suryah.schemas import TraceIngestRequest
    req = TraceIngestRequest(trace_id="abc-123")
    assert req.spans == []
    assert req.status is None
    assert req.session_id is None


def test_trace_ingest_request_with_spans():
    from indra.domains.vasu.suryah.schemas import TraceIngestRequest
    req = TraceIngestRequest(
        trace_id="t-001",
        name="my trace",
        spans=[SpanIngest(span_id="s1", name="root")],
    )
    assert len(req.spans) == 1
    assert req.spans[0].span_id == "s1"
