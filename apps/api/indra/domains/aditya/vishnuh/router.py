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
    agents_by_domain = dict(
        (await db.execute(select(Agent.domain, func.count()).group_by(Agent.domain))).all()
    )
    active_by_domain = dict(
        (
            await db.execute(
                select(Agent.domain, func.count())
                .where(Agent.status.in_(["active", "running"]))
                .group_by(Agent.domain)
            )
        ).all()
    )

    reach = []
    for domain in _DOMAINS:
        total = int(agents_by_domain.get(domain, 0))
        active = int(active_by_domain.get(domain, 0))
        reach.append(
            {
                "domain": domain,
                "agents": total,
                "active_agents": active,
                "reach_pct": round(active / total * 100, 1) if total else 0.0,
            }
        )

    total_agents = sum(r["agents"] for r in reach)
    active_agents = sum(r["active_agents"] for r in reach)
    domains_reached = sum(1 for r in reach if r["agents"] > 0)
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
