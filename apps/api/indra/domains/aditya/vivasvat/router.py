"""Vivasvat — Telemetry. ADITYA domain.

Vivasvat (विवस्वत्) = the radiant one, the shining sun whose light reveals all.
Emits live system telemetry: host CPU/memory, process footprint, persisted
volume, and token burn. Computed live from psutil + DB.
"""

from __future__ import annotations

import psutil
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent
from indra.models.session import Session
from indra.models.trace import Trace

router = APIRouter()

_DEVA = "vivasvat"


@router.get("/telemetry/metrics", tags=["vivasvat"])
async def telemetry_metrics(db: AsyncSession = Depends(get_db)) -> dict:
    vm = psutil.virtual_memory()
    metrics = {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "cpu_count": psutil.cpu_count(logical=True),
        "memory_percent": vm.percent,
        "memory_used_gb": round(vm.used / 1024**3, 2),
        "memory_total_gb": round(vm.total / 1024**3, 2),
        "process_count": len(psutil.pids()),
    }

    total_tokens = await db.scalar(
        select(func.coalesce(func.sum(Agent.token_count), 0))
    ) or 0
    total_cost = await db.scalar(
        select(func.coalesce(func.sum(Agent.cost_usd), 0))
    ) or 0
    active_sessions = await db.scalar(
        select(func.count()).select_from(Session).where(Session.status == "active")
    ) or 0
    total_traces = await db.scalar(select(func.count()).select_from(Trace)) or 0

    return {
        "deva": _DEVA,
        "host": metrics,
        "workload": {
            "total_tokens": int(total_tokens),
            "total_cost_usd": round(float(total_cost), 4),
            "active_sessions": int(active_sessions),
            "total_traces": int(total_traces),
        },
    }
