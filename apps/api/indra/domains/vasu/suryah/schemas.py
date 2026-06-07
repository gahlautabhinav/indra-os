"""
Sūryaḥ schemas — Observability / Trace domain.
VASU domain: Infrastructure layer.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SpanResponse(BaseModel):
    id: str
    span_id: str
    trace_id: str
    parent_span_id: str | None
    name: str
    kind: str | None
    status: str | None
    duration_ms: int | None
    attributes: dict
    events: list
    started_at: str | None
    finished_at: str | None


class TraceResponse(BaseModel):
    id: str
    trace_id: str
    session_id: str | None
    agent_id: str | None
    name: str | None
    duration_ms: int | None
    status: str | None
    started_at: str | None
    finished_at: str | None
    created_at: str
    span_count: int = 0


class TraceDetailResponse(TraceResponse):
    spans: list[SpanResponse] = []


class TraceListResponse(BaseModel):
    traces: list[TraceResponse]
    total: int
    limit: int
    offset: int


class TraceStatsResponse(BaseModel):
    total_traces: int
    active_traces: int
    error_traces: int
    avg_duration_ms: float | None
    p50_duration_ms: int | None
    p99_duration_ms: int | None


# ── Ingest ────────────────────────────────────────────────────────────────────

class SpanIngest(BaseModel):
    span_id: str
    parent_span_id: str | None = None
    name: str
    kind: str | None = None
    status: str | None = None
    duration_ms: int | None = None
    started_at: str | None = None
    finished_at: str | None = None
    attributes: dict = Field(default_factory=dict)
    events: list = Field(default_factory=list)


class TraceIngestRequest(BaseModel):
    trace_id: str
    name: str | None = None
    session_id: str | None = None
    agent_id: str | None = None
    status: str | None = None
    spans: list[SpanIngest] = Field(default_factory=list)


class TraceIngestResponse(BaseModel):
    trace_id: str
    spans_ingested: int
    created: bool
