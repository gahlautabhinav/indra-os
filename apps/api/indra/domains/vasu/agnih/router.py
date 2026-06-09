"""Agnih — Execution Engine. VASU domain.

Agni (अग्नि) = the sacrificial fire that consumes input and transforms it into
work. Surfaces the live execution ledger — every agent run and task run is an
oblation into the fire. Computed from the real agents + tasks tables (each
running CLI agent IS an execution).
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent
from indra.models.task import Task

router = APIRouter()

_DEVA = "agnih"

# Map the agent / task status vocabularies onto a single execution-run vocab.
_AGENT_TO_RUN = {
    "active": "running",
    "running": "running",
    "completed": "completed",
    "error": "failed",
    "dead": "failed",
    "idle": "pending",
}
_TASK_TO_RUN = {
    "running": "running",
    "completed": "completed",
    "failed": "failed",
    "pending": "pending",
    "cancelled": "cancelled",
}


def _agent_duration_ms(a: Agent) -> int | None:
    if a.started_at and a.finished_at:
        return int((a.finished_at - a.started_at).total_seconds() * 1000)
    if a.started_at and a.status in ("active", "running"):
        return int((datetime.now(UTC) - a.started_at).total_seconds() * 1000)
    return None


@router.get("/execution/runs", tags=["execution"])
async def list_execution_runs(
    status: str | None = Query(default=None),
    limit: int = Query(default=80, ge=1, le=300),
    db: AsyncSession = Depends(get_db),
) -> dict:
    runs: list[dict] = []

    # 1. Agent executions (each CLI agent run = an oblation into the fire).
    agents = list(
        (await db.execute(select(Agent).order_by(Agent.created_at.desc()).limit(limit))).scalars()
    )
    for a in agents:
        runs.append(
            {
                "id": str(a.id),
                "name": a.name,
                "kind": "agent",
                "type": a.type,
                "status": _AGENT_TO_RUN.get(a.status, "pending"),
                "agent_id": str(a.id),
                "agent_name": a.name,
                "token_count": a.token_count,
                "duration_ms": _agent_duration_ms(a),
                "error": (a.metadata_ or {}).get("error"),
                "started_at": a.started_at.isoformat() if a.started_at else None,
                "finished_at": a.finished_at.isoformat() if a.finished_at else None,
                "created_at": a.created_at.isoformat(),
            }
        )

    # 2. INDRA task runs (Pranah board), if any.
    task_rows = (
        await db.execute(
            select(Task, Agent.name)
            .outerjoin(Agent, Task.agent_id == Agent.id)
            .order_by(Task.created_at.desc())
            .limit(limit)
        )
    ).all()
    for task, agent_name in task_rows:
        dur = None
        if task.started_at and task.finished_at:
            dur = int((task.finished_at - task.started_at).total_seconds() * 1000)
        runs.append(
            {
                "id": str(task.id),
                "name": task.name,
                "kind": "task",
                "type": "task",
                "status": _TASK_TO_RUN.get(task.status, "pending"),
                "agent_id": str(task.agent_id) if task.agent_id else None,
                "agent_name": agent_name,
                "token_count": 0,
                "duration_ms": dur,
                "error": task.error,
                "started_at": task.started_at.isoformat() if task.started_at else None,
                "finished_at": task.finished_at.isoformat() if task.finished_at else None,
                "created_at": task.created_at.isoformat(),
            }
        )

    if status:
        runs = [r for r in runs if r["status"] == status]
    # newest first across both sources
    runs.sort(key=lambda r: r["created_at"], reverse=True)
    runs = runs[:limit]
    return {"deva": _DEVA, "runs": runs, "total": len(runs)}


@router.get("/execution/stats", tags=["execution"])
async def execution_stats(db: AsyncSession = Depends(get_db)) -> dict:
    counts = {"running": 0, "completed": 0, "failed": 0, "pending": 0, "cancelled": 0}

    agent_rows = (
        await db.execute(select(Agent.status, func.count()).group_by(Agent.status))
    ).all()
    for st, c in agent_rows:
        counts[_AGENT_TO_RUN.get(st, "pending")] += int(c)

    task_rows = (
        await db.execute(select(Task.status, func.count()).group_by(Task.status))
    ).all()
    for st, c in task_rows:
        counts[_TASK_TO_RUN.get(st, "pending")] += int(c)

    # Avg duration over finished agent executions.
    avg_ms = await db.scalar(
        select(
            func.avg(func.extract("epoch", Agent.finished_at - Agent.started_at) * 1000)
        ).where(Agent.finished_at.is_not(None), Agent.started_at.is_not(None))
    )

    return {
        "deva": _DEVA,
        "total": sum(counts.values()),
        "running": counts["running"],
        "completed": counts["completed"],
        "failed": counts["failed"],
        "pending": counts["pending"],
        "avg_duration_ms": round(float(avg_ms), 1) if avg_ms else 0.0,
    }
