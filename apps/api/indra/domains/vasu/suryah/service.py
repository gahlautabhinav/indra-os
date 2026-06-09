"""
Sūryaḥ service — Trace and observability data access.
Reads from local DB (OTLP ingest) with optional AgTrace fallback.
"""

from __future__ import annotations

import re
import statistics
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from indra.models.trace import Span, Trace

from .schemas import (
    SpanIngest,
    SpanResponse,
    TraceDetailResponse,
    TraceIngestRequest,
    TraceIngestResponse,
    TraceListResponse,
    TraceResponse,
    TraceStatsResponse,
)

log = structlog.get_logger(__name__)


def _trace_to_response(trace: Trace, span_count: int = 0) -> TraceResponse:
    return TraceResponse(
        id=str(trace.id),
        trace_id=trace.trace_id,
        session_id=str(trace.session_id) if trace.session_id else None,
        agent_id=str(trace.agent_id) if trace.agent_id else None,
        name=trace.name,
        duration_ms=trace.duration_ms,
        status=trace.status,
        started_at=trace.started_at.isoformat() if trace.started_at else None,
        finished_at=trace.finished_at.isoformat() if trace.finished_at else None,
        created_at=trace.created_at.isoformat(),
        span_count=span_count,
    )


def _span_to_response(span: Span) -> SpanResponse:
    return SpanResponse(
        id=str(span.id),
        span_id=span.span_id,
        trace_id=span.trace_id,
        parent_span_id=span.parent_span_id,
        name=span.name,
        kind=span.kind,
        status=span.status,
        duration_ms=span.duration_ms,
        attributes=span.attributes or {},
        events=span.events or [],
        started_at=span.started_at.isoformat() if span.started_at else None,
        finished_at=span.finished_at.isoformat() if span.finished_at else None,
    )


class TraceService:
    async def list_traces(
        self,
        db: AsyncSession,
        *,
        limit: int = 50,
        offset: int = 0,
        status: str | None = None,
        session_id: str | None = None,
        agent_id: str | None = None,
    ) -> TraceListResponse:
        stmt = select(Trace)
        if status:
            stmt = stmt.where(Trace.status == status)
        if session_id:
            try:
                sid = uuid.UUID(session_id)
                stmt = stmt.where(Trace.session_id == sid)
            except ValueError:
                pass
        if agent_id:
            try:
                aid = uuid.UUID(agent_id)
                stmt = stmt.where(Trace.agent_id == aid)
            except ValueError:
                pass

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await db.scalar(count_stmt)) or 0

        stmt = stmt.order_by(Trace.created_at.desc()).limit(limit).offset(offset)
        result = await db.execute(stmt)
        traces = result.scalars().all()

        # Fetch span counts in one query.
        trace_ids = [t.trace_id for t in traces]
        span_counts: dict[str, int] = {}
        if trace_ids:
            sc_stmt = (
                select(Span.trace_id, func.count(Span.id).label("cnt"))
                .where(Span.trace_id.in_(trace_ids))
                .group_by(Span.trace_id)
            )
            sc_result = await db.execute(sc_stmt)
            span_counts = {row.trace_id: row.cnt for row in sc_result}

        return TraceListResponse(
            traces=[_trace_to_response(t, span_counts.get(t.trace_id, 0)) for t in traces],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def get_trace(
        self,
        db: AsyncSession,
        trace_id: str,
    ) -> TraceDetailResponse | None:
        stmt = (
            select(Trace)
            .where(Trace.trace_id == trace_id)
            .options(selectinload(Trace.spans))
        )
        result = await db.execute(stmt)
        trace = result.scalar_one_or_none()
        if not trace:
            return None

        spans = sorted(
            trace.spans,
            key=lambda s: (s.started_at or datetime.min.replace(tzinfo=UTC)),
        )
        return TraceDetailResponse(
            **_trace_to_response(trace, len(spans)).model_dump(),
            spans=[_span_to_response(s) for s in spans],
        )

    async def ingest_trace(
        self,
        db: AsyncSession,
        request: TraceIngestRequest,
    ) -> TraceIngestResponse:
        # Upsert trace.
        stmt = select(Trace).where(Trace.trace_id == request.trace_id)
        result = await db.execute(stmt)
        trace = result.scalar_one_or_none()
        created = trace is None

        _now = datetime.now(UTC)

        if created:
            trace = Trace(
                trace_id=request.trace_id,
                name=request.name,
                session_id=uuid.UUID(request.session_id) if request.session_id else None,
                agent_id=uuid.UUID(request.agent_id) if request.agent_id else None,
                status=request.status or "running",
                created_at=_now,
            )
            db.add(trace)
        else:
            if request.name:
                trace.name = request.name  # type: ignore[union-attr]
            if request.status:
                trace.status = request.status  # type: ignore[union-attr]

        assert trace is not None

        # Determine trace timing from spans.
        if request.spans:
            started_ats = [s.started_at for s in request.spans if s.started_at]
            finished_ats = [s.finished_at for s in request.spans if s.finished_at]

            if started_ats:
                trace.started_at = min(
                    datetime.fromisoformat(t.replace("Z", "+00:00")) for t in started_ats
                )
            if finished_ats:
                trace.finished_at = max(
                    datetime.fromisoformat(t.replace("Z", "+00:00")) for t in finished_ats
                )
            if trace.started_at and trace.finished_at:
                delta = trace.finished_at - trace.started_at
                trace.duration_ms = int(delta.total_seconds() * 1000)

        # Upsert spans.
        spans_upserted = 0
        for span_in in request.spans:
            existing_stmt = select(Span).where(
                Span.trace_id == request.trace_id,
                Span.span_id == span_in.span_id,
            )
            existing_result = await db.execute(existing_stmt)
            existing_span = existing_result.scalar_one_or_none()

            if existing_span is None:
                new_span = _make_span(request.trace_id, span_in)
                db.add(new_span)
                spans_upserted += 1
            else:
                _update_span(existing_span, span_in)
                spans_upserted += 1

        await db.commit()
        log.info(
            "Trace ingested",
            trace_id=request.trace_id,
            spans=spans_upserted,
            created=created,
        )
        return TraceIngestResponse(
            trace_id=request.trace_id,
            spans_ingested=spans_upserted,
            created=created,
        )

    async def get_stats(self, db: AsyncSession) -> TraceStatsResponse:
        total: int = (await db.scalar(select(func.count(Trace.id)))) or 0
        active: int = (
            await db.scalar(select(func.count(Trace.id)).where(Trace.status == "running"))
        ) or 0
        errors: int = (
            await db.scalar(select(func.count(Trace.id)).where(Trace.status == "error"))
        ) or 0

        durations_stmt = select(Trace.duration_ms).where(Trace.duration_ms.isnot(None))
        dur_result = await db.execute(durations_stmt)
        durations = [r for (r,) in dur_result if r is not None]

        avg_dur = statistics.mean(durations) if durations else None
        p50 = int(statistics.median(durations)) if durations else None
        p99 = int(sorted(durations)[int(len(durations) * 0.99)]) if len(durations) >= 2 else None

        return TraceStatsResponse(
            total_traces=total,
            active_traces=active,
            error_traces=errors,
            avg_duration_ms=avg_dur,
            p50_duration_ms=p50,
            p99_duration_ms=p99,
        )

    # ── Trace synthesis ───────────────────────────────────────────────────────

    async def synthesize_from_sessions(
        self,
        db: AsyncSession,
        *,
        limit: int = 15,
        max_spans: int = 120,
    ) -> int:
        """
        Build a Vivarta trace + span waterfall from each session's event
        timeline. CLI agents (Claude Code, Antigravity, …) don't emit OpenTelemetry
        spans, so without this the Trace Center stays empty. Idempotent — sessions
        that already have a trace (trace_id == external_id) are skipped, so steady-
        state cost is just the newest untraced sessions per run.
        """
        from indra.models.session import Session
        from indra.plugins import plugin_manager

        existing = set((await db.execute(select(Trace.trace_id))).scalars())
        rows = list(
            (
                await db.execute(
                    select(Session).order_by(Session.started_at.desc()).limit(80)
                )
            ).scalars()
        )
        candidates = [
            s for s in rows if s.external_id and s.external_id not in existing
        ][:limit]

        synthesized = 0
        for s in candidates:
            plugin = plugin_manager.get(s.plugin_type)
            if plugin is None:
                continue
            try:
                detail = await plugin.get_session(s.external_id)  # type: ignore[arg-type]
            except Exception:
                log.warning("trace synth read failed", session=s.external_id)
                continue
            if detail is None or not detail.events:
                continue

            events = detail.events[-max_spans:]
            spans = _events_to_spans(s, events)
            if len(spans) <= 1:  # nothing meaningful beyond the root
                continue

            req = TraceIngestRequest(
                trace_id=s.external_id,  # type: ignore[arg-type]
                name=_session_trace_name(s),
                session_id=str(s.id),
                status="ok",
                spans=spans,
            )
            try:
                await self.ingest_trace(db, req)
                synthesized += 1
            except Exception:
                log.exception("trace synth ingest failed", session=s.external_id)
        return synthesized


_TOOL_RE = re.compile(r"\[tool_use:([^\]]+)\]")
_EVENT_LABEL = {
    "user_message": "user prompt",
    "assistant_message": "assistant",
    "tool_call": "tool",
    "tool_result": "tool result",
}


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def _ms_between(a: str | None, b: str | None) -> int | None:
    da, dbb = _parse_iso(a), _parse_iso(b)
    if da and dbb:
        return max(int((dbb - da).total_seconds() * 1000), 0)
    return None


def _span_name(ev: object) -> str:
    etype = getattr(ev, "event_type", "")
    content = getattr(ev, "content", None)
    if etype == "tool_call" and content:
        m = _TOOL_RE.search(content)
        if m:
            return f"🔧 {m.group(1)}"
    return _EVENT_LABEL.get(etype, etype or "span")


def _session_trace_name(session: object) -> str:
    md = getattr(session, "metadata_", None) or {}
    title = md.get("title") if isinstance(md, dict) else None
    if title:
        return str(title)[:200]
    project = getattr(session, "project_path", None)
    if project:
        leaf = str(project).replace("\\", "/").rstrip("/").split("/")[-1]
        if leaf:
            return leaf
    plugin = getattr(session, "plugin_type", "session")
    ext = str(getattr(session, "external_id", None) or "")
    return f"{plugin} · {ext[:8]}"


def _events_to_spans(session: object, events: list) -> list[SpanIngest]:
    """One root span over the whole session + a child span per event."""
    times = [getattr(e, "timestamp", None) for e in events]
    times = [t for t in times if t]
    root_start = times[0] if times else None
    root_end = times[-1] if times else None
    root_id = "root"

    spans: list[SpanIngest] = [
        SpanIngest(
            span_id=root_id,
            parent_span_id=None,
            name=_session_trace_name(session),
            kind="session",
            status="ok",
            started_at=root_start,
            finished_at=root_end,
            duration_ms=_ms_between(root_start, root_end),
        )
    ]
    for i, ev in enumerate(events):
        ts = getattr(ev, "timestamp", None)
        nxt = getattr(events[i + 1], "timestamp", None) if i + 1 < len(events) else root_end
        spans.append(
            SpanIngest(
                span_id=f"e{i}",
                parent_span_id=root_id,
                name=_span_name(ev),
                kind=getattr(ev, "event_type", None),
                status="ok",
                started_at=ts or root_start,
                finished_at=nxt or ts,
                duration_ms=_ms_between(ts, nxt),
                attributes={
                    "input_tokens": getattr(ev, "input_tokens", 0),
                    "output_tokens": getattr(ev, "output_tokens", 0),
                    "cost_usd": getattr(ev, "cost_usd", 0.0),
                },
            )
        )
    return spans


def _make_span(trace_id: str, span_in: SpanIngest) -> Span:
    return Span(
        span_id=span_in.span_id,
        trace_id=trace_id,
        parent_span_id=span_in.parent_span_id,
        name=span_in.name,
        kind=span_in.kind,
        status=span_in.status,
        duration_ms=span_in.duration_ms,
        attributes=span_in.attributes,
        events=span_in.events,
        started_at=(
            datetime.fromisoformat(span_in.started_at.replace("Z", "+00:00"))
            if span_in.started_at
            else None
        ),
        finished_at=(
            datetime.fromisoformat(span_in.finished_at.replace("Z", "+00:00"))
            if span_in.finished_at
            else None
        ),
    )


def _update_span(span: Span, span_in: SpanIngest) -> None:
    if span_in.status:
        span.status = span_in.status
    if span_in.duration_ms is not None:
        span.duration_ms = span_in.duration_ms
    if span_in.attributes:
        span.attributes = span_in.attributes
    if span_in.events:
        span.events = span_in.events
    if span_in.finished_at:
        span.finished_at = datetime.fromisoformat(
            span_in.finished_at.replace("Z", "+00:00")
        )


trace_service = TraceService()
