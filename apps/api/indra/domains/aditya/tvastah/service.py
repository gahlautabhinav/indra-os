"""
Tvastah service — Workflow Builder.
ADITYA domain: Governance layer.

Tvaṣṭṛ (त्वष्टृ) = the Divine Craftsman — shapes raw matter into useful forms.
"""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.exceptions import IndraException
from indra.models.notification import Notification
from indra.models.task import Task
from indra.models.workflow import Workflow

from .schemas import ExecuteResponse, WorkflowCreate, WorkflowRead, WorkflowUpdate

logger = structlog.get_logger()

_VALID_STATUSES = frozenset({"draft", "active", "archived"})


class TvastahService:
    @staticmethod
    async def list_workflows(
        db: AsyncSession,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[WorkflowRead]:
        q = select(Workflow).order_by(Workflow.created_at.desc()).limit(limit).offset(offset)
        if status:
            q = q.where(Workflow.status == status)
        result = await db.execute(q)
        return [WorkflowRead.model_validate(w, from_attributes=True) for w in result.scalars()]

    @staticmethod
    async def get_workflow(db: AsyncSession, workflow_id: uuid.UUID) -> WorkflowRead:
        w = await db.get(Workflow, workflow_id)
        if w is None:
            raise IndraException(status_code=404, error_code="workflow_not_found", message="Workflow not found")
        return WorkflowRead.model_validate(w, from_attributes=True)

    @staticmethod
    async def create_workflow(
        db: AsyncSession,
        req: WorkflowCreate,
        user_id: uuid.UUID | None = None,
    ) -> WorkflowRead:
        w = Workflow(
            name=req.name,
            description=req.description,
            definition=req.definition,
            status="draft",
            created_by=user_id,
        )
        db.add(w)
        await db.commit()
        await db.refresh(w)
        logger.info("tvastah.workflow_created", id=str(w.id), name=w.name)
        return WorkflowRead.model_validate(w, from_attributes=True)

    @staticmethod
    async def update_workflow(
        db: AsyncSession,
        workflow_id: uuid.UUID,
        req: WorkflowUpdate,
    ) -> WorkflowRead:
        w = await db.get(Workflow, workflow_id)
        if w is None:
            raise IndraException(status_code=404, error_code="workflow_not_found", message="Workflow not found")
        if req.status and req.status not in _VALID_STATUSES:
            raise IndraException(
                status_code=400,
                error_code="invalid_status",
                message=f"status must be one of: {', '.join(sorted(_VALID_STATUSES))}",
            )
        for field, value in req.model_dump(exclude_none=True).items():
            setattr(w, field, value)
        await db.commit()
        await db.refresh(w)
        return WorkflowRead.model_validate(w, from_attributes=True)

    @staticmethod
    async def delete_workflow(db: AsyncSession, workflow_id: uuid.UUID) -> None:
        w = await db.get(Workflow, workflow_id)
        if w is None:
            raise IndraException(status_code=404, error_code="workflow_not_found", message="Workflow not found")
        await db.delete(w)
        await db.commit()

    @staticmethod
    async def execute_workflow(db: AsyncSession, workflow_id: uuid.UUID) -> ExecuteResponse:
        w = await db.get(Workflow, workflow_id)
        if w is None:
            raise IndraException(status_code=404, error_code="workflow_not_found", message="Workflow not found")

        steps: list[dict[str, Any]] = w.definition.get("steps", [])
        results: list[dict[str, Any]] = []

        for step in steps:
            step_id = step.get("id", "unknown")
            step_type = step.get("type", "")
            config: dict[str, Any] = step.get("config", {})

            try:
                if step_type == "notify":
                    notif = Notification(
                        title=config.get("title", f"Workflow step {step_id}"),
                        message=config.get("message", ""),
                        severity=config.get("severity", "info"),
                        domain="aditya",
                        source_type="workflow",
                        source_id=str(workflow_id),
                    )
                    db.add(notif)
                    results.append({"step_id": step_id, "type": step_type, "status": "ok", "id": str(notif.id)})

                elif step_type == "create_task":
                    task = Task(
                        workflow_id=workflow_id,
                        name=config.get("name", f"Task from {w.name}"),
                        description=config.get("description"),
                        priority=int(config.get("priority", 0)),
                        input=config.get("input", {}),
                    )
                    db.add(task)
                    results.append({"step_id": step_id, "type": step_type, "status": "ok", "id": str(task.id)})

                else:
                    results.append({"step_id": step_id, "type": step_type, "status": "skipped", "reason": "unknown step type"})

            except Exception as exc:
                logger.warning("tvastah.step_failed", step_id=step_id, error=str(exc))
                results.append({"step_id": step_id, "type": step_type, "status": "error", "error": str(exc)})

        await db.commit()
        logger.info("tvastah.workflow_executed", id=str(workflow_id), steps=len(steps))
        return ExecuteResponse(workflow_id=workflow_id, steps_executed=len(steps), results=results)
