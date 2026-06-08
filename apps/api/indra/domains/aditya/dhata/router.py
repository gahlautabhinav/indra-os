"""Dhata — Foundations. ADITYA domain.

Dhātṛ (धातृ) = the Establisher, who lays the ordering foundation of creation.
Reports the structural foundations of the running system: persisted entity
counts, schema version, and infrastructure health. Computed live.
"""

from __future__ import annotations

from typing import cast

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent
from indra.models.goal import Goal
from indra.models.memory import MemoryChunk
from indra.models.notification import Notification
from indra.models.policy import Policy
from indra.models.schedule import Schedule
from indra.models.session import Session
from indra.models.task import Task
from indra.models.trace import Trace
from indra.models.user import User
from indra.models.workspace import Workspace

router = APIRouter()

_DEVA = "dhata"

_ENTITIES = {
    "agents": Agent,
    "sessions": Session,
    "tasks": Task,
    "traces": Trace,
    "memory_chunks": MemoryChunk,
    "notifications": Notification,
    "policies": Policy,
    "schedules": Schedule,
    "workspaces": Workspace,
    "goals": Goal,
    "users": User,
}


@router.get("/foundations/overview", tags=["dhata"])
async def foundations_overview(db: AsyncSession = Depends(get_db)) -> dict:
    entities = []
    for name, model in _ENTITIES.items():
        count = await db.scalar(select(func.count()).select_from(model)) or 0
        entities.append({"entity": name, "rows": int(count)})
    entities.sort(key=lambda e: cast(int, e["rows"]), reverse=True)

    try:
        schema_version = await db.scalar(text("SELECT version_num FROM alembic_version"))
    except Exception:
        schema_version = None

    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "deva": _DEVA,
        "entities": entities,
        "total_rows": sum(e["rows"] for e in entities),
        "schema_version": schema_version,
        "devas": 33,
        "domains": 5,
        "infrastructure": {
            "database": "ok" if db_ok else "error",
            "schema_version": schema_version,
        },
    }
