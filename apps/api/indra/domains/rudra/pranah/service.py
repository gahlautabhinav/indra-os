"""
Pranah service — Task orchestration + Agent lifecycle.
RUDRA domain: Runtime layer.

Pranah (प्राण) = breath, life force — the heartbeat of multi-agent execution.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.events import (
    IndraEvent,
    make_agent_status_changed,
)
from indra.models.agent import Agent
from indra.models.task import Task
from indra.websockets.manager import manager

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

logger = structlog.get_logger()

VALID_TASK_STATUSES = {"pending", "running", "completed", "failed", "cancelled"}
TERMINAL_STATUSES = {"completed", "failed", "cancelled"}


def _task_to_read(t: Task) -> TaskRead:
    return TaskRead(
        id=t.id,
        name=t.name,
        description=t.description,
        status=t.status,
        priority=t.priority,
        agent_id=t.agent_id,
        workflow_id=t.workflow_id,
        input=t.input,
        output=t.output,
        error=t.error,
        started_at=t.started_at,
        finished_at=t.finished_at,
        created_at=t.created_at,
    )


class PranahService:
    """Pranah — the runtime deva. Orchestrates tasks and agent lifecycles."""

    # ── Tasks ─────────────────────────────────────────────────────────────────

    async def create_task(self, db: AsyncSession, req: TaskCreate) -> TaskRead:
        task = Task(
            name=req.name,
            description=req.description,
            agent_id=req.agent_id,
            workflow_id=req.workflow_id,
            priority=req.priority,
            input=req.input,
            status="pending",
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)

        await manager.publish_event(
            IndraEvent(
                event_type="task.created",
                domain="rudra",
                data={
                    "task_id": str(task.id),
                    "name": task.name,
                    "priority": task.priority,
                    "agent_id": str(task.agent_id) if task.agent_id else None,
                },
            )
        )

        logger.info("task_created", task_id=str(task.id), name=task.name)
        return _task_to_read(task)

    async def get_task(self, db: AsyncSession, task_id: uuid.UUID) -> TaskRead | None:
        row = await db.get(Task, task_id)
        return _task_to_read(row) if row else None

    async def update_task(
        self,
        db: AsyncSession,
        task_id: uuid.UUID,
        req: TaskUpdate,
    ) -> TaskRead | None:
        task = await db.get(Task, task_id)
        if task is None:
            return None

        if req.status is not None:
            if req.status not in VALID_TASK_STATUSES:
                raise ValueError(f"Invalid status: {req.status}")
            task.status = req.status
            now = datetime.now(tz=UTC)
            if req.status == "running" and task.started_at is None:
                task.started_at = now
            if req.status in TERMINAL_STATUSES:
                task.finished_at = now

        if req.agent_id is not None:
            task.agent_id = req.agent_id
        if req.output is not None:
            task.output = req.output
        if req.error is not None:
            task.error = req.error

        await db.commit()
        await db.refresh(task)

        await manager.publish_event(
            IndraEvent(
                event_type="task.status_changed",
                domain="rudra",
                data={
                    "task_id": str(task.id),
                    "status": task.status,
                    "agent_id": str(task.agent_id) if task.agent_id else None,
                },
            )
        )

        return _task_to_read(task)

    async def cancel_task(self, db: AsyncSession, task_id: uuid.UUID) -> bool:
        task = await db.get(Task, task_id)
        if task is None:
            return False
        if task.status in TERMINAL_STATUSES:
            return False
        task.status = "cancelled"
        task.finished_at = datetime.now(tz=UTC)
        await db.commit()
        return True

    async def list_tasks(
        self,
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        status: str | None = None,
        agent_id: uuid.UUID | None = None,
        priority: int | None = None,
    ) -> TaskListResponse:
        stmt = select(Task).order_by(Task.priority.desc(), Task.created_at.desc())
        count_stmt = select(func.count()).select_from(Task)

        if status:
            stmt = stmt.where(Task.status == status)
            count_stmt = count_stmt.where(Task.status == status)
        if agent_id:
            stmt = stmt.where(Task.agent_id == agent_id)
            count_stmt = count_stmt.where(Task.agent_id == agent_id)
        if priority is not None:
            stmt = stmt.where(Task.priority == priority)
            count_stmt = count_stmt.where(Task.priority == priority)

        total = (await db.execute(count_stmt)).scalar_one()
        rows = (await db.execute(stmt.limit(limit).offset(offset))).scalars().all()

        return TaskListResponse(
            tasks=[_task_to_read(t) for t in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def get_stats(self, db: AsyncSession) -> TaskStatsResponse:
        rows = await db.execute(
            select(Task.status, func.count()).group_by(Task.status)
        )
        counts: dict[str, int] = {row[0]: row[1] for row in rows.all()}
        total = sum(counts.values())

        return TaskStatsResponse(
            pending=counts.get("pending", 0),
            running=counts.get("running", 0),
            completed=counts.get("completed", 0),
            failed=counts.get("failed", 0),
            cancelled=counts.get("cancelled", 0),
            total=total,
        )

    # ── Agent lifecycle ───────────────────────────────────────────────────────

    async def spawn_agent(
        self, db: AsyncSession, req: AgentSpawnRequest
    ) -> AgentSpawnResponse:
        agent = Agent(
            name=req.name,
            type=req.type,
            domain=req.domain,
            status="idle",
            parent_id=req.parent_id,
            session_id=req.session_id,
            metadata_=req.metadata,
        )
        db.add(agent)
        await db.commit()
        await db.refresh(agent)

        await manager.publish_event(
            make_agent_status_changed(str(agent.id), "idle", domain=req.domain)
        )

        logger.info(
            "agent_spawned",
            agent_id=str(agent.id),
            name=req.name,
            parent_id=str(req.parent_id) if req.parent_id else None,
        )

        return AgentSpawnResponse(
            id=agent.id,
            name=agent.name,
            type=agent.type,
            status=agent.status,
            domain=agent.domain,
            parent_id=agent.parent_id,
            created_at=agent.created_at,
        )

    async def update_agent_status(
        self,
        db: AsyncSession,
        agent_id: uuid.UUID,
        req: AgentStatusUpdate,
    ) -> bool:
        agent = await db.get(Agent, agent_id)
        if agent is None:
            return False

        agent.status = req.status
        now = datetime.now(tz=UTC)

        if req.status == "running" and agent.started_at is None:
            agent.started_at = now
        if req.status in {"completed", "dead", "error"}:
            agent.finished_at = now

        if req.token_count is not None:
            agent.token_count = req.token_count
        if req.cost_usd is not None:
            from decimal import Decimal
            agent.cost_usd = Decimal(str(req.cost_usd))
        if req.error is not None:
            agent.metadata_ = {**agent.metadata_, "error": req.error}

        await db.commit()

        await manager.publish_event(
            make_agent_status_changed(str(agent.id), req.status, domain=agent.domain)
        )

        return True


pranah_service = PranahService()
