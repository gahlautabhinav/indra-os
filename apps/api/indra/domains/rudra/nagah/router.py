"""
Nagah — Error Detection.
RUDRA domain: Runtime layer.

Nagah (नाग) = the serpent — detects errors lurking in the system.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent
from indra.models.task import Task

router = APIRouter()


@router.get("/errors")
async def list_errors(db: AsyncSession = Depends(get_db)) -> dict:
    error_agents = (
        await db.execute(select(Agent).where(Agent.status == "error").limit(50))
    ).scalars().all()

    failed_tasks = (
        await db.execute(select(Task).where(Task.status == "failed").limit(50))
    ).scalars().all()

    errors = []

    for a in error_agents:
        errors.append(
            {
                "id": str(a.id),
                "type": "agent",
                "title": f"Agent '{a.name}' in error state",
                "severity": "critical",
                "source_type": "agent",
                "source_id": str(a.id),
                "domain": a.domain,
                "created_at": a.created_at.isoformat(),
                "error": a.metadata_.get("error"),
            }
        )

    for t in failed_tasks:
        errors.append(
            {
                "id": str(t.id),
                "type": "task",
                "title": f"Task '{t.name}' failed",
                "severity": "warning",
                "source_type": "task",
                "source_id": str(t.id),
                "domain": "rudra",
                "created_at": (t.finished_at or t.created_at).isoformat(),
                "error": t.error,
            }
        )

    errors.sort(key=lambda e: str(e.get("created_at") or ""), reverse=True)

    return {"errors": errors, "total": len(errors)}


@router.post("/errors/{error_id}/acknowledge")
async def acknowledge_error(error_id: uuid.UUID) -> dict:
    return {"acknowledged": True, "error_id": str(error_id)}
