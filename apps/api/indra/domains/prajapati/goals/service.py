"""
Goals service — Strategic goal management.
PRAJAPATI domain: Strategy layer.

Prajāpati (प्रजापति) = Lord of All Creatures — sets purpose, decomposes intention into action.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.exceptions import IndraException
from indra.models.goal import Goal
from indra.models.task import Task

from .schemas import DecomposeResponse, GoalCreate, GoalRead, GoalUpdate

logger = structlog.get_logger()

_VALID_STATUSES = frozenset({"pending", "planning", "active", "completed", "failed"})
_VALID_PRIORITIES = frozenset({0, 1, 2, 3})


class GoalsService:
    @staticmethod
    async def list_goals(
        db: AsyncSession,
        status: str | None = None,
        priority: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[GoalRead]:
        q = select(Goal).order_by(Goal.priority.desc(), Goal.created_at.desc()).limit(limit).offset(offset)
        if status:
            q = q.where(Goal.status == status)
        if priority is not None:
            q = q.where(Goal.priority == priority)
        result = await db.execute(q)
        return [GoalRead.model_validate(g, from_attributes=True) for g in result.scalars()]

    @staticmethod
    async def get_goal(db: AsyncSession, goal_id: uuid.UUID) -> GoalRead:
        g = await db.get(Goal, goal_id)
        if g is None:
            raise IndraException(status_code=404, error_code="goal_not_found", message="Goal not found")
        return GoalRead.model_validate(g, from_attributes=True)

    @staticmethod
    async def create_goal(db: AsyncSession, req: GoalCreate) -> GoalRead:
        if req.priority not in _VALID_PRIORITIES:
            raise IndraException(status_code=400, error_code="invalid_priority", message="priority must be 0–3")
        g = Goal(
            title=req.title,
            description=req.description,
            target_outcome=req.target_outcome,
            priority=req.priority,
        )
        db.add(g)
        await db.commit()
        await db.refresh(g)
        logger.info("prajapati.goal_created", id=str(g.id), title=g.title)
        return GoalRead.model_validate(g, from_attributes=True)

    @staticmethod
    async def update_goal(db: AsyncSession, goal_id: uuid.UUID, req: GoalUpdate) -> GoalRead:
        g = await db.get(Goal, goal_id)
        if g is None:
            raise IndraException(status_code=404, error_code="goal_not_found", message="Goal not found")
        if req.status and req.status not in _VALID_STATUSES:
            raise IndraException(
                status_code=400,
                error_code="invalid_status",
                message=f"status must be one of: {', '.join(sorted(_VALID_STATUSES))}",
            )
        updates = req.model_dump(exclude_none=True)
        if "status" in updates and updates["status"] == "completed" and g.completed_at is None:
            g.completed_at = datetime.now(UTC)
        for field, value in updates.items():
            setattr(g, field, value)
        await db.commit()
        await db.refresh(g)
        return GoalRead.model_validate(g, from_attributes=True)

    @staticmethod
    async def delete_goal(db: AsyncSession, goal_id: uuid.UUID) -> None:
        g = await db.get(Goal, goal_id)
        if g is None:
            raise IndraException(status_code=404, error_code="goal_not_found", message="Goal not found")
        await db.delete(g)
        await db.commit()

    @staticmethod
    async def decompose_goal(db: AsyncSession, goal_id: uuid.UUID) -> DecomposeResponse:
        """Break a Goal into Tasks based on its definition.steps."""
        g = await db.get(Goal, goal_id)
        if g is None:
            raise IndraException(status_code=404, error_code="goal_not_found", message="Goal not found")

        steps: list[dict[str, Any]] = g.definition.get("steps", [])
        if not steps:
            # Auto-generate a default single task if no steps defined
            steps = [{"id": "s1", "type": "task", "title": g.title, "config": {"description": g.target_outcome}}]
            g.definition = {"steps": steps}

        task_ids: list[str] = []
        for i, step in enumerate(steps):
            if step.get("type") in ("task", "agent"):
                t = Task(
                    name=step.get("title", f"{g.title} — step {i + 1}"),
                    description=step.get("config", {}).get("description"),
                    priority=g.priority,
                    input=step.get("config", {}),
                )
                db.add(t)
                task_ids.append(str(t.id))

        g.status = "active"
        g.agent_count = len(task_ids)
        await db.commit()
        logger.info("prajapati.goal_decomposed", goal_id=str(goal_id), tasks=len(task_ids))
        return DecomposeResponse(goal_id=goal_id, steps_created=len(steps), task_ids=task_ids)
