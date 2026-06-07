"""
Optimization router — Workforce optimization recommendations.
PRAJAPATI domain: Strategy layer.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import OptimizationReport
from .service import OptimizationService

router = APIRouter()


@router.get("/optimization/recommendations", response_model=OptimizationReport, tags=["optimization"])
async def get_recommendations(db: AsyncSession = Depends(get_db)) -> OptimizationReport:
    return await OptimizationService.get_recommendations(db)
