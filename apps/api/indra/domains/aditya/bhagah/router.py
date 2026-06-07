"""
Bhagah router — Cost Analytics endpoints.
ADITYA domain: Governance layer.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import AgentCostEntry, CostSummary, SessionCostEntry, TrendEntry
from .service import BhagahService

router = APIRouter()


@router.get("/cost/summary", response_model=CostSummary, tags=["cost"])
async def get_cost_summary(
    domain: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> CostSummary:
    return await BhagahService.get_summary(db, domain)


@router.get("/cost/by-agent", response_model=list[AgentCostEntry], tags=["cost"])
async def get_cost_by_agent(
    domain: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[AgentCostEntry]:
    return await BhagahService.get_by_agent(db, domain, limit)


@router.get("/cost/by-session", response_model=list[SessionCostEntry], tags=["cost"])
async def get_cost_by_session(
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[SessionCostEntry]:
    return await BhagahService.get_by_session(db, limit)


@router.get("/cost/trend", response_model=list[TrendEntry], tags=["cost"])
async def get_cost_trend(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> list[TrendEntry]:
    return await BhagahService.get_trend(db, days)
