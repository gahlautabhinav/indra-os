"""Vishnuh — Pervasion. ADITYA domain.

Viṣṇu (विष्णु) = the All-Pervader who spans the cosmos in three strides.
Measures how far the system has spread: agent + session reach across every
domain, and the health of that pervasion. Computed live.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent
from indra.models.session import Session

router = APIRouter()

_DEVA = "vishnuh"
_DOMAINS = ["indra", "vasu", "rudra", "aditya", "prajapati"]


@router.get("/pervasion/overview", tags=["vishnuh"])
async def pervasion_overview(db: AsyncSession = Depends(get_db)) -> dict:
    agents_by_domain: dict[str, int] = {
        d: c
        for d, c in (
            await db.execute(select(Agent.domain, func.count()).group_by(Agent.domain))
        ).all()
    }
    active_by_domain: dict[str, int] = {
        d: c
        for d, c in (
            await db.execute(
                select(Agent.domain, func.count())
                .where(Agent.status.in_(["active", "running"]))
                .group_by(Agent.domain)
            )
        ).all()
    }

    reach = []
    for domain in _DOMAINS:
        total = agents_by_domain.get(domain, 0)
        active = active_by_domain.get(domain, 0)
        reach.append(
            {
                "domain": domain,
                "agents": total,
                "active_agents": active,
                "reach_pct": round(active / total * 100, 1) if total else 0.0,
            }
        )

    # Aggregate from the typed int dicts (not the mixed-value reach dicts).
    total_agents = sum(agents_by_domain.values())
    active_agents = sum(active_by_domain.values())
    domains_reached = sum(1 for v in agents_by_domain.values() if v > 0)
    total_sessions = await db.scalar(select(func.count()).select_from(Session)) or 0

    return {
        "deva": _DEVA,
        "reach": reach,
        "domains_reached": domains_reached,
        "domains_total": len(_DOMAINS),
        "pervasion_pct": round(domains_reached / len(_DOMAINS) * 100, 1),
        "total_agents": total_agents,
        "active_agents": active_agents,
        "total_sessions": int(total_sessions),
    }
