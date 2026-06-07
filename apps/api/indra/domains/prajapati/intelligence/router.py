"""
Intelligence router — Strategy overview + system health.
PRAJAPATI domain: Strategy layer.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import StrategyOverview, SystemHealthReport
from .service import IntelligenceService

router = APIRouter()


@router.get("/intelligence/overview", response_model=StrategyOverview, tags=["intelligence"])
async def get_strategy_overview(db: AsyncSession = Depends(get_db)) -> StrategyOverview:
    return await IntelligenceService.get_overview(db)


@router.get("/intelligence/health", response_model=SystemHealthReport, tags=["intelligence"])
async def get_health_report(db: AsyncSession = Depends(get_db)) -> SystemHealthReport:
    return await IntelligenceService.get_health_report(db)
