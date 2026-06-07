from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    target_outcome: str
    priority: int = 1  # 0=low 1=medium 2=high 3=critical


class GoalRead(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    target_outcome: str
    priority: int
    status: str
    definition: dict[str, Any]
    progress_pct: int
    agent_count: int
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    target_outcome: str | None = None
    priority: int | None = None
    status: str | None = None


class DecomposeResponse(BaseModel):
    goal_id: uuid.UUID
    steps_created: int
    task_ids: list[str]
