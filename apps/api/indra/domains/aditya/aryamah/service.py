"""
Aryamah service — Role-Based Access Control.
ADITYA domain: Governance layer.

Aryaman (अर्यमन्) = Nobility — the guardian of honour and social order.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.exceptions import IndraException
from indra.models.user import User

from .schemas import RoleStats, UserRoleRead

logger = structlog.get_logger()

_VALID_ROLES = frozenset({"viewer", "user", "admin"})


class AryamahService:
    @staticmethod
    async def list_users(db: AsyncSession, role: str | None = None) -> list[UserRoleRead]:
        stmt = select(User).order_by(User.created_at.desc())
        if role:
            stmt = stmt.where(User.role == role)
        result = await db.execute(stmt)
        users = list(result.scalars().all())
        return [UserRoleRead.model_validate(u, from_attributes=True) for u in users]

    @staticmethod
    async def update_role(db: AsyncSession, user_id: uuid.UUID, role: str) -> UserRoleRead:
        if role not in _VALID_ROLES:
            raise IndraException(
                status_code=400,
                error_code="invalid_role",
                message=f"Role must be one of: {', '.join(sorted(_VALID_ROLES))}",
            )
        user = await db.get(User, user_id)
        if user is None:
            raise IndraException(status_code=404, error_code="user_not_found", message="User not found")
        old_role = user.role
        user.role = role
        await db.commit()
        await db.refresh(user)
        logger.info("aryamah.role_updated", user_id=str(user_id), old=old_role, new=role)
        return UserRoleRead.model_validate(user, from_attributes=True)

    @staticmethod
    async def get_role_stats(db: AsyncSession) -> RoleStats:
        result = await db.execute(
            select(User.role, func.count(User.id)).group_by(User.role)
        )
        counts: dict[str, int] = {}
        for role_val, cnt in result.all():
            counts[role_val] = cnt
        return RoleStats(
            admin=counts.get("admin", 0),
            user=counts.get("user", 0),
            viewer=counts.get("viewer", 0),
            total=sum(counts.values()),
        )
