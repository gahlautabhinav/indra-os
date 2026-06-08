"""Vayuh — Communication Bus. VASU domain.

Vāyu (वायु) = wind, the carrier that moves between all things. Surfaces the
communication topology: each session is a channel, the agents bound to it are
its participants. Computed live from sessions + agents.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent
from indra.models.session import Session

router = APIRouter()

_DEVA = "vayuh"


@router.get("/communication/channels", tags=["communication"])
async def list_channels(
    active_only: bool = Query(default=True),
    limit: int = Query(default=100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> dict:
    q = select(Session).order_by(Session.started_at.desc()).limit(limit)
    if active_only:
        q = q.where(Session.status == "active")
    sessions = list((await db.execute(q)).scalars())

    # participant count per session (agents bound to it)
    counts = dict(
        (
            await db.execute(
                select(Agent.session_id, func.count())
                .where(Agent.session_id.is_not(None))
                .group_by(Agent.session_id)
            )
        ).all()
    )

    channels = []
    for s in sessions:
        channels.append(
            {
                "channel_id": str(s.id),
                "plugin_type": s.plugin_type,
                "project_path": s.project_path,
                "participants": int(counts.get(s.id, 0)),
                "status": s.status,
                "last_activity": s.started_at.isoformat() if s.started_at else None,
            }
        )
    return {"deva": _DEVA, "channels": channels, "total": len(channels)}


@router.get("/communication/overview", tags=["communication"])
async def communication_overview(db: AsyncSession = Depends(get_db)) -> dict:
    active_channels = await db.scalar(
        select(func.count()).select_from(Session).where(Session.status == "active")
    ) or 0
    total_channels = await db.scalar(select(func.count()).select_from(Session)) or 0
    participants = await db.scalar(
        select(func.count()).select_from(Agent).where(Agent.session_id.is_not(None))
    ) or 0
    by_plugin = dict(
        (
            await db.execute(
                select(Session.plugin_type, func.count()).group_by(Session.plugin_type)
            )
        ).all()
    )
    return {
        "deva": _DEVA,
        "active_channels": int(active_channels),
        "total_channels": int(total_channels),
        "participants": int(participants),
        "channels_by_protocol": {k: int(v) for k, v in by_plugin.items()},
    }
