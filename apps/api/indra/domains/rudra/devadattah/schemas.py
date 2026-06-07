from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationCreate(BaseModel):
    title: str
    message: str
    severity: str = "info"
    domain: str = "rudra"
    source_type: str | None = None
    source_id: str | None = None


class NotificationRead(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    severity: str
    domain: str
    source_type: str | None
    source_id: str | None
    is_read: bool
    created_at: datetime
    read_at: datetime | None

    model_config = {"from_attributes": True}


class NotificationStats(BaseModel):
    total: int
    unread: int


class NotificationListResponse(BaseModel):
    notifications: list[NotificationRead]
    total: int
    unread: int
