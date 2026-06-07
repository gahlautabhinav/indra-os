"""
Pranah router — Task orchestration + Agent lifecycle endpoints.
RUDRA domain: Runtime layer.

Endpoints:
  POST   /api/v1/tasks               — create task
  GET    /api/v1/tasks               — list tasks (paginated, filterable)
  GET    /api/v1/tasks/stats         — task status counts
  GET    /api/v1/tasks/{id}          — task detail
  PATCH  /api/v1/tasks/{id}          — update task (status, output, error)
  DELETE /api/v1/tasks/{id}          — cancel task

  POST   /api/v1/agents/spawn        — spawn a new agent
  PATCH  /api/v1/agents/{id}/status  — update agent status + emit WS event
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import (
    AgentSpawnRequest,
    AgentSpawnResponse,
    AgentStatusUpdate,
    TaskCreate,
    TaskListResponse,
    TaskRead,
    TaskStatsResponse,
    TaskUpdate,
)
from .service import pranah_service

router = APIRouter()


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.post(
    "/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
async def create_task(
    req: TaskCreate,
    db: AsyncSession = Depends(get_db),
) -> TaskRead:
    return await pranah_service.create_task(db, req)


@router.get("/tasks/stats", response_model=TaskStatsResponse, tags=["tasks"])
async def get_task_stats(
    db: AsyncSession = Depends(get_db),
) -> TaskStatsResponse:
    return await pranah_service.get_stats(db)


@router.get("/tasks", response_model=TaskListResponse, tags=["tasks"])
async def list_tasks(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status_filter: str | None = Query(None, alias="status"),
    agent_id: uuid.UUID | None = Query(None),
    priority: int | None = Query(None, ge=0, le=2),
    db: AsyncSession = Depends(get_db),
) -> TaskListResponse:
    return await pranah_service.list_tasks(
        db,
        limit=limit,
        offset=offset,
        status=status_filter,
        agent_id=agent_id,
        priority=priority,
    )


@router.get("/tasks/{task_id}", response_model=TaskRead, tags=["tasks"])
async def get_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TaskRead:
    task = await pranah_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}", response_model=TaskRead, tags=["tasks"])
async def update_task(
    task_id: uuid.UUID,
    req: TaskUpdate,
    db: AsyncSession = Depends(get_db),
) -> TaskRead:
    try:
        task = await pranah_service.update_task(db, task_id, req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tasks"],
)
async def cancel_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    cancelled = await pranah_service.cancel_task(db, task_id)
    if not cancelled:
        raise HTTPException(
            status_code=409,
            detail="Task not found or already in terminal state",
        )


# ── Agent lifecycle ───────────────────────────────────────────────────────────

@router.post(
    "/agents/spawn",
    response_model=AgentSpawnResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["agents"],
)
async def spawn_agent(
    req: AgentSpawnRequest,
    db: AsyncSession = Depends(get_db),
) -> AgentSpawnResponse:
    return await pranah_service.spawn_agent(db, req)


@router.patch(
    "/agents/{agent_id}/status",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["agents"],
)
async def update_agent_status(
    agent_id: uuid.UUID,
    req: AgentStatusUpdate,
    db: AsyncSession = Depends(get_db),
) -> None:
    updated = await pranah_service.update_agent_status(db, agent_id, req)
    if not updated:
        raise HTTPException(status_code=404, detail="Agent not found")
