"""
Varunah router — Policy Engine endpoints.
ADITYA domain: Governance layer.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.auth import UserContext, require_role
from indra.database import get_db

from .schemas import PolicyCheckResult, PolicyCreate, PolicyRead, PolicyUpdate
from .service import VarunahService

router = APIRouter()


@router.get("/policies", response_model=list[PolicyRead], tags=["policies"])
async def list_policies(
    policy_type: str | None = Query(default=None),
    enabled_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
) -> list[PolicyRead]:
    return await VarunahService.list_policies(db, policy_type, enabled_only)


@router.post("/policies", response_model=PolicyRead, status_code=status.HTTP_201_CREATED, tags=["policies"])
async def create_policy(
    body: PolicyCreate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> PolicyRead:
    return await VarunahService.create_policy(db, body)


@router.patch("/policies/{policy_id}", response_model=PolicyRead, tags=["policies"])
async def update_policy(
    policy_id: uuid.UUID,
    body: PolicyUpdate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> PolicyRead:
    return await VarunahService.update_policy(db, policy_id, body)


@router.delete("/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["policies"])
async def delete_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> None:
    await VarunahService.delete_policy(db, policy_id)


@router.post("/policies/check", response_model=PolicyCheckResult, tags=["policies"])
async def check_policies(
    cost_usd: float = Query(default=0.0),
    token_count: int = Query(default=0),
    agent_id: str | None = Query(default=None),
    domain: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> PolicyCheckResult:
    return await VarunahService.check(db, cost_usd, token_count, agent_id, domain)
