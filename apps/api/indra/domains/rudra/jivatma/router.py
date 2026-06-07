from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import AgentProfileRead, LineageResponse
from .service import jivatma_service

router = APIRouter()


@router.get("/agents/{agent_id}/profile", response_model=AgentProfileRead)
async def get_agent_profile(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> AgentProfileRead:
    profile = await jivatma_service.get_profile(db, agent_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return profile


@router.get("/agents/{agent_id}/lineage", response_model=LineageResponse)
async def get_agent_lineage(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> LineageResponse:
    lineage = await jivatma_service.get_lineage(db, agent_id)
    if lineage is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return lineage
