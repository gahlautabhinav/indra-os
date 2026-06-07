from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class AgentProfileRead(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    status: str
    domain: str
    parent_id: uuid.UUID | None
    session_id: uuid.UUID | None
    token_count: int
    cost_usd: Decimal
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    metadata: dict
    children_count: int

    model_config = {"from_attributes": True}


class LineageAncestor(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    status: str
    domain: str
    depth: int

    model_config = {"from_attributes": True}


class LineageChild(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    status: str
    domain: str

    model_config = {"from_attributes": True}


class LineageResponse(BaseModel):
    agent: AgentProfileRead
    ancestors: list[LineageAncestor]
    children: list[LineageChild]
