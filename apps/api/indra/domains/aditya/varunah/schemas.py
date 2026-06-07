from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PolicyCreate(BaseModel):
    name: str
    description: str | None = None
    policy_type: str  # cost_limit | token_limit | tool_block | rate_limit
    target_type: str = "global"  # global | agent | session | domain
    target_id: str | None = None
    config: dict[str, Any] = {}
    enabled: bool = True


class PolicyRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    policy_type: str
    target_type: str
    target_id: str | None
    config: dict[str, Any]
    enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PolicyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    config: dict[str, Any] | None = None
    enabled: bool | None = None


class PolicyCheckResult(BaseModel):
    allowed: bool
    violated_policies: list[str]
    message: str
