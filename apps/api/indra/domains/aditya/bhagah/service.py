"""
Bhagah service — Cost Analytics.
ADITYA domain: Governance layer.

Bhaga (भग) = the Bestower of Fortune — tracks and distributes resource wealth.
"""

from __future__ import annotations

from decimal import Decimal

import structlog
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from indra.models.agent import Agent

from .schemas import AgentCostEntry, CostSummary, SessionCostEntry, TrendEntry

logger = structlog.get_logger()


class BhagahService:
    @staticmethod
    async def get_summary(db: AsyncSession, domain: str | None = None) -> CostSummary:
        q = select(
            func.coalesce(func.sum(Agent.cost_usd), 0).label("total_cost"),
            func.coalesce(func.sum(Agent.token_count), 0).label("total_tokens"),
            func.count(Agent.id).label("agent_count"),
        )
        if domain:
            q = q.where(Agent.domain == domain)
        result = await db.execute(q)
        row = result.one()
        total_cost = Decimal(str(row.total_cost))
        count = int(row.agent_count) or 1
        return CostSummary(
            total_cost_usd=total_cost,
            total_tokens=int(row.total_tokens),
            agent_count=int(row.agent_count),
            avg_cost_per_agent=total_cost / count,
            avg_tokens_per_agent=float(row.total_tokens) / count,
        )

    @staticmethod
    async def get_by_agent(
        db: AsyncSession,
        domain: str | None = None,
        limit: int = 50,
    ) -> list[AgentCostEntry]:
        q = (
            select(Agent)
            .order_by(Agent.cost_usd.desc())
            .limit(limit)
        )
        if domain:
            q = q.where(Agent.domain == domain)
        result = await db.execute(q)
        agents = list(result.scalars())
        return [
            AgentCostEntry(
                agent_id=str(a.id),
                agent_name=a.name,
                domain=a.domain,
                cost_usd=a.cost_usd,
                token_count=a.token_count,
                status=a.status,
                created_at=a.created_at,
            )
            for a in agents
        ]

    @staticmethod
    async def get_by_session(db: AsyncSession, limit: int = 50) -> list[SessionCostEntry]:
        q = (
            select(
                Agent.session_id,
                func.sum(Agent.cost_usd).label("cost_usd"),
                func.sum(Agent.token_count).label("token_count"),
                func.count(Agent.id).label("agent_count"),
            )
            .where(Agent.session_id.isnot(None))
            .group_by(Agent.session_id)
            .order_by(func.sum(Agent.cost_usd).desc())
            .limit(limit)
        )
        result = await db.execute(q)
        rows = result.all()
        return [
            SessionCostEntry(
                session_id=str(r.session_id),
                cost_usd=Decimal(str(r.cost_usd)),
                token_count=int(r.token_count),
                agent_count=int(r.agent_count),
            )
            for r in rows
        ]

    @staticmethod
    async def get_trend(db: AsyncSession, days: int = 30) -> list[TrendEntry]:
        raw = text(
            """
            SELECT
                DATE(created_at AT TIME ZONE 'UTC') AS period,
                COALESCE(SUM(cost_usd), 0) AS cost_usd,
                COALESCE(SUM(token_count), 0) AS token_count,
                COUNT(id) AS agent_count
            FROM agents
            WHERE created_at >= NOW() - INTERVAL ':days days'
            GROUP BY period
            ORDER BY period DESC
            """
        )
        result = await db.execute(raw, {"days": days})
        rows = result.all()
        return [
            TrendEntry(
                period=str(r.period),
                cost_usd=Decimal(str(r.cost_usd)),
                token_count=int(r.token_count),
                agent_count=int(r.agent_count),
            )
            for r in rows
        ]
