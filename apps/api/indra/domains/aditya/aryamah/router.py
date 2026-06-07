"""
Aryamah router — RBAC endpoints.
ADITYA domain: Governance layer.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.auth import UserContext, get_current_user, require_role
from indra.core.exceptions import IndraException
from indra.database import get_db
from indra.models.user import User

from .schemas import RoleStats, UpdateRoleRequest, UserRoleRead
from .service import AryamahService

router = APIRouter()


@router.get("/rbac/users", response_model=list[UserRoleRead], tags=["rbac"])
async def list_users(
    role: str | None = Query(default=None, description="Filter by role"),
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> list[UserRoleRead]:
    return await AryamahService.list_users(db, role)


@router.patch("/rbac/users/{user_id}/role", response_model=UserRoleRead, tags=["rbac"])
async def update_user_role(
    user_id: uuid.UUID,
    body: UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> UserRoleRead:
    return await AryamahService.update_role(db, user_id, body.role)


@router.get("/rbac/stats", response_model=RoleStats, tags=["rbac"])
async def role_stats(
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> RoleStats:
    return await AryamahService.get_role_stats(db)


@router.get("/rbac/me", response_model=UserRoleRead, tags=["rbac"])
async def my_profile(
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRoleRead:
    user = await db.get(User, uuid.UUID(current_user.id))
    if user is None:
        raise IndraException(status_code=404, error_code="user_not_found", message="User not found")
    return UserRoleRead.model_validate(user, from_attributes=True)
