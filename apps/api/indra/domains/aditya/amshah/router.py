"""Amshah — Resource Shares. ADITYA domain.

Aṃśa (अंश) = a portion, an allotted share. Computes how the finite resource
wealth (tokens, cost) is divided across the five domains. Computed live from
the real agents table.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent

router = APIRouter()

_DEVA = "amshah"
_DOMAINS = ["indra", "vasu", "rudra", "aditya", "prajapati"]


@router.get("/shares/allocation", tags=["amshah"])
async def share_allocation(db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(
            select(
                Agent.domain,
                func.count(Agent.id),
                func.coalesce(func.sum(Agent.token_count), 0),
                func.coalesce(func.sum(Agent.cost_usd), 0),
            ).group_by(Agent.domain)
        )
    ).all()

    by_domain = {
        d: {"agents": int(c), "tokens": int(t), "cost_usd": float(cost)}
        for d, c, t, cost in rows
    }
    total_tokens = sum(v["tokens"] for v in by_domain.values()) or 1
    total_cost = sum(v["cost_usd"] for v in by_domain.values()) or 1.0

    shares = []
    for domain in _DOMAINS:
        v = by_domain.get(domain, {"agents": 0, "tokens": 0, "cost_usd": 0.0})
        shares.append(
            {
                "domain": domain,
                "agents": v["agents"],
                "tokens": v["tokens"],
                "cost_usd": round(v["cost_usd"], 6),
                "token_share_pct": round(v["tokens"] / total_tokens * 100, 1),
                "cost_share_pct": round(v["cost_usd"] / total_cost * 100, 1),
            }
        )
    shares.sort(key=lambda s: s["tokens"], reverse=True)
    return {
        "deva": _DEVA,
        "shares": shares,
        "total_tokens": int(sum(v["tokens"] for v in by_domain.values())),
        "total_cost_usd": round(sum(v["cost_usd"] for v in by_domain.values()), 6),
    }
