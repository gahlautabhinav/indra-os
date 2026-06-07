"""WorkforceService — INDRA domain service wiring DB + plugin data."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.domains.indra.schemas import (
    AgentHierarchyNode,
    AgentListResponse,
    AgentSummary,
    DashboardResponse,
    PluginHealthResponse,
    SessionListResponse,
    SessionSummary,
    SyncResult,
)
from indra.models.agent import Agent
from indra.models.session import Session
from indra.models.trace import Trace

log = logging.getLogger(__name__)


class WorkforceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Dashboard ─────────────────────────────────────────────────────────────

    async def get_dashboard(self) -> DashboardResponse:
        from indra.plugins import plugin_manager

        # DB counts
        active_agents = await self.db.scalar(
            select(func.count()).select_from(Agent).where(
                Agent.status.in_(["running", "active"])
            )
        ) or 0
        running_tasks = await self.db.scalar(
            select(func.count()).select_from(Agent).where(Agent.status == "running")
        ) or 0
        active_traces = await self.db.scalar(
            select(func.count()).select_from(Trace).where(Trace.status == "running")
        ) or 0

        # Token cost aggregation (today)
        today_start = datetime.now(tz=timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        total_cost_today = await self.db.scalar(
            select(func.coalesce(func.sum(Agent.cost_usd), 0)).where(
                Agent.created_at >= today_start
            )
        ) or 0.0
        token_burn_rate = await self.db.scalar(
            select(func.coalesce(func.sum(Agent.token_count), 0)).where(
                Agent.status.in_(["running", "active"])
            )
        ) or 0

        # Plugin-derived data
        plugin_statuses = await plugin_manager.health_summary()
        connected_systems = [
            pt for pt, status in plugin_statuses.items() if status.value != "unreachable"
        ]

        # Active sessions from DB
        active_sessions = await self.db.scalar(
            select(func.count()).select_from(Session).where(Session.status == "active")
        ) or 0

        # System health: percentage of healthy agents + plugins
        healthy_plugins = sum(
            1 for s in plugin_statuses.values() if s.value == "healthy"
        )
        total_plugins = len(plugin_statuses) or 1
        plugin_health = (healthy_plugins / total_plugins) * 100
        agent_health = 100.0 if active_agents == 0 else max(
            0.0,
            100.0 - (await self.db.scalar(
                select(func.count()).select_from(Agent).where(Agent.status == "error")
            ) or 0) / max(active_agents, 1) * 100,
        )
        system_health = (plugin_health + agent_health) / 2

        return DashboardResponse(
            active_agents=active_agents,
            running_tasks=running_tasks,
            connected_systems=connected_systems,
            system_health=round(system_health, 1),
            token_burn_rate=token_burn_rate,
            total_cost_today=float(total_cost_today),
            active_traces=active_traces,
            alerts=[],
            active_sessions=active_sessions,
            plugin_statuses={k: v.value for k, v in plugin_statuses.items()},
        )

    # ── Agents ────────────────────────────────────────────────────────────────

    async def list_agents(
        self,
        limit: int = 50,
        offset: int = 0,
        status: str | None = None,
        domain: str | None = None,
        agent_type: str | None = None,
    ) -> AgentListResponse:
        q = select(Agent)
        if status:
            q = q.where(Agent.status == status)
        if domain:
            q = q.where(Agent.domain == domain)
        if agent_type:
            q = q.where(Agent.type == agent_type)

        count_q = select(func.count()).select_from(q.subquery())
        total = await self.db.scalar(count_q) or 0

        result = await self.db.execute(
            q.order_by(Agent.created_at.desc()).limit(limit).offset(offset)
        )
        agents = result.scalars().all()

        return AgentListResponse(
            agents=[
                AgentSummary(
                    id=str(a.id),
                    name=a.name,
                    type=a.type,
                    status=a.status,
                    domain=a.domain,
                    plugin_id=a.plugin_id,
                    token_count=a.token_count,
                    cost_usd=float(a.cost_usd),
                    session_id=str(a.session_id) if a.session_id else None,
                    parent_id=str(a.parent_id) if a.parent_id else None,
                    started_at=a.started_at.isoformat() if a.started_at else None,
                    finished_at=a.finished_at.isoformat() if a.finished_at else None,
                )
                for a in agents
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def get_agent_hierarchy(self) -> list[AgentHierarchyNode]:
        result = await self.db.execute(select(Agent))
        all_agents = result.scalars().all()

        nodes: dict[str, AgentHierarchyNode] = {
            str(a.id): AgentHierarchyNode(
                id=str(a.id),
                name=a.name,
                type=a.type,
                status=a.status,
                domain=a.domain,
            )
            for a in all_agents
        }

        roots: list[AgentHierarchyNode] = []
        for agent in all_agents:
            node = nodes[str(agent.id)]
            if agent.parent_id and str(agent.parent_id) in nodes:
                nodes[str(agent.parent_id)].children.append(node)
            else:
                roots.append(node)

        return roots

    # ── Sessions ──────────────────────────────────────────────────────────────

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        plugin_type: str | None = None,
        status: str | None = None,
    ) -> SessionListResponse:
        q = select(Session)
        if plugin_type:
            q = q.where(Session.plugin_type == plugin_type)
        if status:
            q = q.where(Session.status == status)

        total = await self.db.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0

        result = await self.db.execute(
            q.order_by(Session.started_at.desc()).limit(limit).offset(offset)
        )
        sessions = result.scalars().all()

        return SessionListResponse(
            sessions=[
                SessionSummary(
                    id=str(s.id),
                    external_id=s.external_id,
                    plugin_type=s.plugin_type,
                    project_path=s.project_path,
                    status=s.status,
                    token_count=s.metadata_.get("token_count", 0),
                    cost_usd=s.metadata_.get("cost_usd", 0.0),
                    started_at=s.started_at.isoformat(),
                    ended_at=s.ended_at.isoformat() if s.ended_at else None,
                    event_count=s.metadata_.get("event_count", 0),
                )
                for s in sessions
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    # ── Plugin sync ──────────────────────────────────────────────────────────

    async def sync_from_plugins(self) -> SyncResult:
        """
        Pull sessions from all plugins and upsert them into the DB.
        Called by the background poller every N seconds.
        """
        from indra.plugins import plugin_manager

        plugin_sessions = await plugin_manager.aggregate_sessions(limit=200)

        created = updated = errors = 0

        for si in plugin_sessions:
            try:
                existing = await self.db.scalar(
                    select(Session).where(Session.external_id == si.id)
                )
                if existing is None:
                    session = Session(
                        external_id=si.id,
                        plugin_type=si.plugin_type,
                        project_path=si.project_path,
                        status=si.status,
                        metadata_={
                            "token_count": si.token_count,
                            "cost_usd": si.cost_usd,
                            **si.metadata,
                        },
                    )
                    self.db.add(session)
                    created += 1
                else:
                    existing.status = si.status
                    existing.metadata_ = {
                        **existing.metadata_,
                        "token_count": si.token_count,
                        "cost_usd": si.cost_usd,
                        **si.metadata,
                    }
                    updated += 1
            except Exception:
                log.exception("Failed to sync session %s from plugin %s", si.id, si.plugin_type)
                errors += 1

        await self.db.commit()
        return SyncResult(
            synced=len(plugin_sessions),
            created=created,
            updated=updated,
            errors=errors,
        )

    # ── Plugin health ─────────────────────────────────────────────────────────

    async def get_plugin_health(self) -> PluginHealthResponse:
        from indra.plugins import plugin_manager

        statuses = await plugin_manager.health_summary()
        return PluginHealthResponse(
            statuses={k: v.value for k, v in statuses.items()},
            plugin_types=plugin_manager.plugin_types,
        )
