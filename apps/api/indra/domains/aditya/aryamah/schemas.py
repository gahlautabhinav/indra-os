from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class UserRoleRead(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateRoleRequest(BaseModel):
    role: str  # viewer | user | admin


class RoleStats(BaseModel):
    admin: int
    user: int
    viewer: int
    total: int
