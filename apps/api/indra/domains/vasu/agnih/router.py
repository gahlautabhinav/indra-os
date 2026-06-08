"""Agnih — Execution Engine. VASU domain.

Agni (अग्नि) = the sacrificial fire that consumes input and transforms it into
work. Surfaces the live execution ledger — every task run is an oblation into
the fire. Computed from the real tasks table.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent
from indra.models.task import Task

router = APIRouter()

_DEVA = "agnih"


@router.get("/execution/runs", tags=["execution"])
async def list_execution_runs(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> dict:
    q = (
        select(Task, Agent.name)
        .outerjoin(Agent, Task.agent_id == Agent.id)
        .order_by(Task.created_at.desc())
        .limit(limit)
    )
    if status:
        q = q.where(Task.status == status)
    rows = (await db.execute(q)).all()

    runs = []
    for task, agent_name in rows:
        duration_ms = None
        if task.started_at and task.finished_at:
            duration_ms = int((task.finished_at - task.started_at).total_seconds() * 1000)
        runs.append(
            {
                "id": str(task.id),
                "name": task.name,
                "status": task.status,
                "agent_id": str(task.agent_id) if task.agent_id else None,
                "agent_name": agent_name,
                "duration_ms": duration_ms,
                "error": task.error,
                "started_at": task.started_at.isoformat() if task.started_at else None,
                "finished_at": task.finished_at.isoformat() if task.finished_at else None,
                "created_at": task.created_at.isoformat(),
            }
        )
    return {"deva": _DEVA, "runs": runs, "total": len(runs)}


@router.get("/execution/stats", tags=["execution"])
async def execution_stats(db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(select(Task.status, func.count()).group_by(Task.status))
    ).all()
    by_status = {status: int(count) for status, count in rows}

    avg_ms = await db.scalar(
        select(
            func.avg(func.extract("epoch", Task.finished_at - Task.started_at) * 1000)
        ).where(Task.finished_at.is_not(None), Task.started_at.is_not(None))
    )
    return {
        "deva": _DEVA,
        "total": sum(by_status.values()),
        "running": by_status.get("running", 0),
        "completed": by_status.get("completed", 0),
        "failed": by_status.get("failed", 0),
        "pending": by_status.get("pending", 0),
        "avg_duration_ms": round(float(avg_ms), 1) if avg_ms else 0.0,
    }
