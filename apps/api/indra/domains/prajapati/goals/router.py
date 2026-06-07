"""
Goals router — Strategic goal endpoints.
PRAJAPATI domain: Strategy layer.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.auth import UserContext, get_current_user, require_role
from indra.database import get_db

from .schemas import DecomposeResponse, GoalCreate, GoalRead, GoalUpdate
from .service import GoalsService

router = APIRouter()


@router.get("/goals", response_model=list[GoalRead], tags=["goals"])
async def list_goals(
    status: str | None = Query(default=None),
    priority: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[GoalRead]:
    return await GoalsService.list_goals(db, status, priority, limit, offset)


@router.get("/goals/{goal_id}", response_model=GoalRead, tags=["goals"])
async def get_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> GoalRead:
    return await GoalsService.get_goal(db, goal_id)


@router.post("/goals", response_model=GoalRead, status_code=status.HTTP_201_CREATED, tags=["goals"])
async def create_goal(
    body: GoalCreate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_user),
) -> GoalRead:
    return await GoalsService.create_goal(db, body)


@router.patch("/goals/{goal_id}", response_model=GoalRead, tags=["goals"])
async def update_goal(
    goal_id: uuid.UUID,
    body: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_user),
) -> GoalRead:
    return await GoalsService.update_goal(db, goal_id, body)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["goals"])
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> None:
    await GoalsService.delete_goal(db, goal_id)


@router.post("/goals/{goal_id}/decompose", response_model=DecomposeResponse, tags=["goals"])
async def decompose_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_user),
) -> DecomposeResponse:
    return await GoalsService.decompose_goal(db, goal_id)
