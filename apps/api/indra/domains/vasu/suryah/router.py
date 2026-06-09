"""
Sūryaḥ router — Observability endpoints.
VASU domain: Infrastructure layer.

Endpoints:
  GET  /api/v1/traces               — list traces (paginated, filterable)
  GET  /api/v1/traces/stats         — aggregate stats
  GET  /api/v1/traces/{trace_id}    — trace detail with full span tree
  POST /api/v1/traces/ingest        — ingest a trace + spans (INDRA format)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import (
    TraceDetailResponse,
    TraceIngestRequest,
    TraceIngestResponse,
    TraceListResponse,
    TraceStatsResponse,
)
from .service import trace_service

router = APIRouter()


@router.get("/traces", response_model=TraceListResponse, tags=["traces"])
async def list_traces(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: str | None = Query(None),
    session_id: str | None = Query(None),
    agent_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> TraceListResponse:
    return await trace_service.list_traces(
        db,
        limit=limit,
        offset=offset,
        status=status,
        session_id=session_id,
        agent_id=agent_id,
    )


@router.get("/traces/stats", response_model=TraceStatsResponse, tags=["traces"])
async def get_trace_stats(
    db: AsyncSession = Depends(get_db),
) -> TraceStatsResponse:
    return await trace_service.get_stats(db)


@router.get("/traces/{trace_id}", response_model=TraceDetailResponse, tags=["traces"])
async def get_trace(
    trace_id: str,
    db: AsyncSession = Depends(get_db),
) -> TraceDetailResponse:
    from fastapi import HTTPException
    trace = await trace_service.get_trace(db, trace_id)
    if trace is None:
        raise HTTPException(status_code=404, detail="Trace not found")
    return trace


@router.post(
    "/traces/ingest",
    response_model=TraceIngestResponse,
    status_code=201,
    tags=["traces"],
)
async def ingest_trace(
    request: TraceIngestRequest,
    db: AsyncSession = Depends(get_db),
) -> TraceIngestResponse:
    return await trace_service.ingest_trace(db, request)


@router.post("/traces/synthesize", tags=["traces"])
async def synthesize_traces(
    limit: int = Query(25, ge=1, le=80),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Build Vivarta traces from CLI session event timelines (Claude, Antigravity,
    etc.) so the Trace Center reflects real agent activity that doesn't emit OTel."""
    n = await trace_service.synthesize_from_sessions(db, limit=limit)
    return {"synthesized": n}
