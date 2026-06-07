"""
Pranah schemas — Task orchestration API contracts.
RUDRA domain: Runtime layer.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ── Task CRUD ─────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    agent_id: uuid.UUID | None = None
    workflow_id: uuid.UUID | None = None
    priority: int = Field(0, ge=0, le=2)
    input: dict[str, Any] = Field(default_factory=dict)


class TaskUpdate(BaseModel):
    status: str | None = None
    agent_id: uuid.UUID | None = None
    output: dict[str, Any] | None = None
    error: str | None = None


class TaskRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    status: str
    priority: int
    agent_id: uuid.UUID | None
    workflow_id: uuid.UUID | None
    input: dict[str, Any]
    output: dict[str, Any] | None
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class TaskListResponse(BaseModel):
    tasks: list[TaskRead]
    total: int
    limit: int
    offset: int


class TaskStatsResponse(BaseModel):
    pending: int
    running: int
    completed: int
    failed: int
    cancelled: int
    total: int


# ── Agent spawn ───────────────────────────────────────────────────────────────

class AgentSpawnRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field("custom", max_length=50)
    domain: str = Field("rudra", max_length=50)
    parent_id: uuid.UUID | None = None
    session_id: uuid.UUID | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentSpawnResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    status: str
    domain: str
    parent_id: uuid.UUID | None
    created_at: datetime


class AgentStatusUpdate(BaseModel):
    status: str
    token_count: int | None = None
    cost_usd: float | None = None
    error: str | None = None
