from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import MessageListResponse, MessagePublish
from .service import vyanah_service

router = APIRouter()


@router.post("/agents/{agent_id}/messages")
async def publish_message(
    agent_id: uuid.UUID,
    body: MessagePublish,
    db: AsyncSession = Depends(get_db),
) -> dict:
    msg_id = await vyanah_service.publish(agent_id, body)
    return {"id": msg_id, "agent_id": str(agent_id)}


@router.get("/agents/{agent_id}/messages", response_model=MessageListResponse)
async def get_messages(
    agent_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> MessageListResponse:
    return await vyanah_service.get_messages(agent_id, limit=limit)
