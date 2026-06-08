"""
Tvastah router — Workflow Builder endpoints.
ADITYA domain: Governance layer.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.auth import UserContext, get_current_user, require_role
from indra.database import get_db

from .schemas import ExecuteResponse, WorkflowCreate, WorkflowRead, WorkflowUpdate
from .service import TvastahService

router = APIRouter()


@router.get("/workflows/aditya", response_model=list[WorkflowRead], tags=["workflows-builder"])
async def list_workflows(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[WorkflowRead]:
    return await TvastahService.list_workflows(db, status, limit, offset)


@router.get("/workflows/aditya/{workflow_id}", response_model=WorkflowRead, tags=["workflows-builder"])
async def get_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> WorkflowRead:
    return await TvastahService.get_workflow(db, workflow_id)


@router.post(
    "/workflows/aditya",
    response_model=WorkflowRead,
    status_code=status.HTTP_201_CREATED,
    tags=["workflows-builder"],
)
async def create_workflow(
    body: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    ctx: UserContext = Depends(get_current_user),
) -> WorkflowRead:
    return await TvastahService.create_workflow(db, body, user_id=uuid.UUID(ctx.id))


@router.patch("/workflows/aditya/{workflow_id}", response_model=WorkflowRead, tags=["workflows-builder"])
async def update_workflow(
    workflow_id: uuid.UUID,
    body: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_user),
) -> WorkflowRead:
    return await TvastahService.update_workflow(db, workflow_id, body)


@router.delete(
    "/workflows/aditya/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["workflows-builder"],
)
async def delete_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> None:
    await TvastahService.delete_workflow(db, workflow_id)


@router.post(
    "/workflows/aditya/{workflow_id}/execute",
    response_model=ExecuteResponse,
    tags=["workflows-builder"],
)
async def execute_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_user),
) -> ExecuteResponse:
    return await TvastahService.execute_workflow(db, workflow_id)
