"""
Devadattah service — Notification engine.
RUDRA domain: Runtime layer.

Devadattah (देवदत्त) = gift of the gods — the herald that notifies all devas.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.events import IndraEvent
from indra.models.notification import Notification
from indra.websockets.manager import manager

from .schemas import (
    NotificationCreate,
    NotificationListResponse,
    NotificationRead,
    NotificationStats,
)

logger = structlog.get_logger()


class DevadattahService:
    """Devadattah — the runtime herald. Creates and manages in-app notifications."""

    async def create(self, db: AsyncSession, req: NotificationCreate) -> NotificationRead:
        n = Notification(
            title=req.title,
            message=req.message,
            severity=req.severity,
            domain=req.domain,
            source_type=req.source_type,
            source_id=req.source_id,
        )
        db.add(n)
        await db.commit()
        await db.refresh(n)

        await manager.publish_event(
            IndraEvent(
                event_type="notification.created",
                domain=req.domain,
                data={"id": str(n.id), "title": n.title, "severity": n.severity},
            )
        )

        logger.info("notification_created", id=str(n.id), severity=n.severity)
        return NotificationRead.model_validate(n)

    async def list_notifications(
        self,
        db: AsyncSession,
        limit: int = 50,
        unread_only: bool = False,
    ) -> NotificationListResponse:
        stmt = select(Notification).order_by(
            Notification.is_read.asc(), Notification.created_at.desc()
        )
        count_stmt = select(func.count()).select_from(Notification)
        unread_stmt = select(func.count()).select_from(Notification).where(
            Notification.is_read == False  # noqa: E712
        )

        if unread_only:
            stmt = stmt.where(Notification.is_read == False)  # noqa: E712
            count_stmt = count_stmt.where(Notification.is_read == False)  # noqa: E712

        total = (await db.execute(count_stmt)).scalar_one()
        unread = (await db.execute(unread_stmt)).scalar_one()
        rows = (await db.execute(stmt.limit(limit))).scalars().all()

        return NotificationListResponse(
            notifications=[NotificationRead.model_validate(n) for n in rows],
            total=total,
            unread=unread,
        )

    async def get_stats(self, db: AsyncSession) -> NotificationStats:
        total = (await db.execute(select(func.count()).select_from(Notification))).scalar_one()
        unread = (
            await db.execute(
                select(func.count()).select_from(Notification).where(
                    Notification.is_read == False  # noqa: E712
                )
            )
        ).scalar_one()
        return NotificationStats(total=total, unread=unread)

    async def mark_read(self, db: AsyncSession, notification_id: uuid.UUID) -> bool:
        n = await db.get(Notification, notification_id)
        if n is None:
            return False
        n.is_read = True
        n.read_at = datetime.now(UTC)
        await db.commit()
        return True

    async def mark_all_read(self, db: AsyncSession) -> int:
        result = await db.execute(
            update(Notification)
            .where(Notification.is_read == False)  # noqa: E712
            .values(is_read=True, read_at=datetime.now(UTC))
        )
        await db.commit()
        return int(result.rowcount) if result.rowcount is not None else 0  # type: ignore[attr-defined]

    async def delete(self, db: AsyncSession, notification_id: uuid.UUID) -> bool:
        n = await db.get(Notification, notification_id)
        if n is None:
            return False
        await db.delete(n)
        await db.commit()
        return True


devadattah_service = DevadattahService()
