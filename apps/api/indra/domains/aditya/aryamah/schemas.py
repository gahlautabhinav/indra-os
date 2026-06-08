from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class UserRoleRead(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def _coerce_id(cls, v: object) -> str:
        # User.id is a uuid.UUID column; Pydantic v2 won't coerce UUID→str.
        return str(v) if isinstance(v, uuid.UUID) else v  # type: ignore[return-value]


class UpdateRoleRequest(BaseModel):
    role: str  # viewer | user | admin


class RoleStats(BaseModel):
    admin: int
    user: int
    viewer: int
    total: int
