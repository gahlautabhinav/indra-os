"""Mitrah — Alliances. ADITYA domain.

Mitra (मित्र) = friend, the binding force of cooperation. Surfaces the alliances
between agents: parent→child spawn lineage and agents that co-inhabit a session.
Computed live from the real agents table.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from indra.database import get_db
from indra.models.agent import Agent

router = APIRouter()

_DEVA = "mitrah"


@router.get("/alliances", tags=["mitrah"])
async def list_alliances(
    limit: int = Query(default=100, ge=1, le=300),
    db: AsyncSession = Depends(get_db),
) -> dict:
    parent = aliased(Agent)
    child = aliased(Agent)

    # Spawn-lineage alliances: parent → child.
    rows = (
        await db.execute(
            select(
                parent.id, parent.name, child.id, child.name, child.domain
            )
            .join(child, child.parent_id == parent.id)
            .limit(limit)
        )
    ).all()

    alliances = [
        {
            "type": "lineage",
            "source_id": str(pid),
            "source_name": pname,
            "target_id": str(cid),
            "target_name": cname,
            "domain": cdomain,
        }
        for pid, pname, cid, cname, cdomain in rows
    ]

    linked_agents = await db.scalar(
        select(func.count()).select_from(Agent).where(Agent.parent_id.is_not(None))
    ) or 0

    return {
        "deva": _DEVA,
        "alliances": alliances,
        "total": len(alliances),
        "linked_agents": int(linked_agents),
    }
