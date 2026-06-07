from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import (
    NotificationCreate,
    NotificationListResponse,
    NotificationRead,
    NotificationStats,
)
from .service import devadattah_service

router = APIRouter()


@router.post(
    "/notifications",
    response_model=NotificationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_notification(
    body: NotificationCreate,
    db: AsyncSession = Depends(get_db),
) -> NotificationRead:
    return await devadattah_service.create(db, body)


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    return await devadattah_service.list_notifications(db, limit=limit, unread_only=unread_only)


@router.get("/notifications/stats", response_model=NotificationStats)
async def notification_stats(db: AsyncSession = Depends(get_db)) -> NotificationStats:
    return await devadattah_service.get_stats(db)


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    if not await devadattah_service.mark_read(db, notification_id):
        raise HTTPException(status_code=404, detail="Notification not found")


@router.post("/notifications/read-all")
async def mark_all_read(db: AsyncSession = Depends(get_db)) -> dict:
    count = await devadattah_service.mark_all_read(db)
    return {"marked_read": count}


@router.delete("/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    if not await devadattah_service.delete(db, notification_id):
        raise HTTPException(status_code=404, detail="Notification not found")
