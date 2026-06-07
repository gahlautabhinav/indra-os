"""
Jivatma service — Agent identity and lineage.
RUDRA domain: Runtime layer.

Jivatma (जीवात्मा) = the individual soul — the unique identity of each agent.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.models.agent import Agent

from .schemas import (
    AgentProfileRead,
    LineageAncestor,
    LineageChild,
    LineageResponse,
)

logger = structlog.get_logger()

_MAX_ANCESTOR_DEPTH = 10


class JivatmaService:
    """Jivatma — the identity keeper. Tracks lineage, profile, and soul of each agent."""

    async def get_profile(
        self, db: AsyncSession, agent_id: uuid.UUID
    ) -> AgentProfileRead | None:
        agent = await db.get(Agent, agent_id)
        if agent is None:
            return None

        children_count = (
            await db.execute(
                select(func.count()).select_from(Agent).where(Agent.parent_id == agent_id)
            )
        ).scalar_one()

        return AgentProfileRead(
            id=agent.id,
            name=agent.name,
            type=agent.type,
            status=agent.status,
            domain=agent.domain,
            parent_id=agent.parent_id,
            session_id=agent.session_id,
            token_count=agent.token_count,
            cost_usd=agent.cost_usd,
            started_at=agent.started_at,
            finished_at=agent.finished_at,
            created_at=agent.created_at,
            metadata=agent.metadata_,
            children_count=children_count,
        )

    async def get_lineage(
        self, db: AsyncSession, agent_id: uuid.UUID
    ) -> LineageResponse | None:
        agent = await db.get(Agent, agent_id)
        if agent is None:
            return None

        # Walk up the parent chain to collect ancestors
        ancestors: list[LineageAncestor] = []
        current_id = agent.parent_id
        depth = 0
        while current_id and depth < _MAX_ANCESTOR_DEPTH:
            parent = await db.get(Agent, current_id)
            if parent is None:
                break
            ancestors.insert(
                0,
                LineageAncestor(
                    id=parent.id,
                    name=parent.name,
                    type=parent.type,
                    status=parent.status,
                    domain=parent.domain,
                    depth=depth,
                ),
            )
            current_id = parent.parent_id
            depth += 1

        # Re-index depth from root (0 = oldest ancestor)
        for i, anc in enumerate(ancestors):
            anc.depth = i

        # Direct children (one level)
        child_rows = (
            await db.execute(select(Agent).where(Agent.parent_id == agent_id).limit(50))
        ).scalars().all()

        children = [
            LineageChild(
                id=c.id,
                name=c.name,
                type=c.type,
                status=c.status,
                domain=c.domain,
            )
            for c in child_rows
        ]

        children_count = len(children)
        profile = AgentProfileRead(
            id=agent.id,
            name=agent.name,
            type=agent.type,
            status=agent.status,
            domain=agent.domain,
            parent_id=agent.parent_id,
            session_id=agent.session_id,
            token_count=agent.token_count,
            cost_usd=agent.cost_usd,
            started_at=agent.started_at,
            finished_at=agent.finished_at,
            created_at=agent.created_at,
            metadata=agent.metadata_,
            children_count=children_count,
        )

        return LineageResponse(agent=profile, ancestors=ancestors, children=children)


jivatma_service = JivatmaService()
