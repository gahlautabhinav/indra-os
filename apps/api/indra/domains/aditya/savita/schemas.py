from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ScheduleCreate(BaseModel):
    name: str
    description: str | None = None
    trigger_type: str  # interval | cron | once
    trigger_config: dict[str, Any]
    # interval: {"seconds": 3600}
    # cron: {"cron_expr": "0 9 * * *"}
    # once: {"run_at": "2026-06-08T10:00:00Z"}
    action_type: str  # notify | spawn_agent
    action_config: dict[str, Any] = {}
    enabled: bool = True


class ScheduleRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    trigger_type: str
    trigger_config: dict[str, Any]
    action_type: str
    action_config: dict[str, Any]
    enabled: bool
    last_run_at: datetime | None
    next_run_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TriggerResponse(BaseModel):
    schedule_id: uuid.UUID
    triggered_at: datetime
    action_type: str
