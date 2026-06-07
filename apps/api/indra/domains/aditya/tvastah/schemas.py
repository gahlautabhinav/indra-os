from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class WorkflowCreate(BaseModel):
    name: str
    description: str | None = None
    definition: dict[str, Any]
    # definition shape:
    # {
    #   "steps": [
    #     {"id": "s1", "type": "notify", "config": {"title": "...", "message": "..."}},
    #     {"id": "s2", "type": "spawn_agent", "config": {"plugin_id": "...", "domain": "..."}},
    #   ]
    # }


class WorkflowRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    definition: dict[str, Any]
    status: str
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    definition: dict[str, Any] | None = None
    status: str | None = None  # draft | active | archived


class ExecuteResponse(BaseModel):
    workflow_id: uuid.UUID
    steps_executed: int
    results: list[dict[str, Any]]
