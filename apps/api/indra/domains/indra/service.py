"""WorkforceService — INDRA domain service wiring DB + plugin data."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

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

# Serializes ALL session syncs in this process (the 30s poller tick and any
# manual POST /plugins/sync share it) so two overlapping syncs can never both
# SELECT-miss the same external_id and double-insert a Session/Agent pair.
_sync_lock = asyncio.Lock()


def _session_agent_name(si: object) -> str:
    """Human-readable agent name for a CLI session: '<plugin> · <project>'."""
    plugin = getattr(si, "plugin_type", "cli")
    project_path = getattr(si, "project_path", None)
    sid = getattr(si, "id", "") or ""
    if project_path:
        leaf = project_path.replace("\\", "/").rstrip("/").split("/")[-1]
        if leaf:
            return f"{plugin} · {leaf}"
    return f"{plugin} · {sid[:8]}"


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
        today_start = datetime.now(tz=UTC).replace(
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

    async def get_session_events(self, session_id: str, limit: int = 2000) -> dict | None:
        """
        Resolve a DB session to its source CLI adapter and return the live
        conversation timeline (prompts, responses, tool calls) read straight
        from the plugin's JSONL — the agent's actual ongoing prompts.

        Returns None if the session id is unknown; a payload with available=False
        if the adapter can't read events (e.g. binary Gemini protobuf).
        """
        import uuid as _uuid

        from indra.plugins import plugin_manager

        try:
            sid = _uuid.UUID(session_id)
        except (ValueError, AttributeError):
            return None

        session = await self.db.scalar(select(Session).where(Session.id == sid))
        if session is None:
            return None

        base = {
            "session_id": str(session.id),
            "external_id": session.external_id,
            "plugin_type": session.plugin_type,
            "project_path": session.project_path,
            "status": session.status,
        }

        plugin = plugin_manager.get(session.plugin_type)
        if plugin is None or not session.external_id:
            return {**base, "events": [], "total": 0, "available": False}

        try:
            detail = await plugin.get_session(session.external_id)
        except Exception:
            log.exception("Failed to read events for session %s", session.id)
            return {**base, "events": [], "total": 0, "available": False}

        if detail is None:
            return {**base, "events": [], "total": 0, "available": False}

        events = [
            {
                "id": ev.id,
                "event_type": ev.event_type,
                "content": ev.content,
                "timestamp": ev.timestamp,
                "input_tokens": ev.input_tokens,
                "output_tokens": ev.output_tokens,
                "cost_usd": ev.cost_usd,
            }
            for ev in detail.events[:limit]
        ]
        return {
            "deva": "somah",
            **base,
            "token_count": detail.token_count,
            "cost_usd": detail.cost_usd,
            "events": events,
            "total": len(events),
            "available": True,
            "truncated": len(detail.events) > limit,
        }

    # ── Plugin sync ──────────────────────────────────────────────────────────

    # Map a CLI session status onto the agent status vocabulary the UI uses.
    _SESSION_TO_AGENT_STATUS = {
        "active": "active",
        "ended": "completed",
        "error": "error",
    }

    async def sync_from_plugins(self) -> SyncResult:
        """
        Pull sessions from all plugins and upsert them into the DB.

        Each CLI session is mirrored as a workforce Agent row so the agents
        view and dashboard surface live CLI activity (a running Claude Code /
        Gemini / Codex session shows up as a working agent). Called by the
        background poller every N seconds.
        """
        from decimal import Decimal

        from indra.plugins import plugin_manager

        async with _sync_lock:
            plugin_sessions = await plugin_manager.aggregate_sessions(limit=200)

            created = updated = errors = 0

            for si in plugin_sessions:
                try:
                    # Each item runs in its own SAVEPOINT. A failure (bad row,
                    # unique violation from a race) rolls back ONLY this item
                    # instead of poisoning the shared transaction for the rest
                    # of the batch.
                    async with self.db.begin_nested():
                        session = await self.db.scalar(
                            select(Session).where(Session.external_id == si.id)
                        )
                        is_new = session is None
                        token_count = int(si.token_count or 0)
                        cost = Decimal(str(si.cost_usd or 0))

                        if is_new:
                            session = Session(
                                external_id=si.id,
                                plugin_type=si.plugin_type,
                                project_path=si.project_path,
                                status=si.status,
                                # token_count / cost_usd written LAST so a
                                # plugin metadata key can never clobber them.
                                metadata_={
                                    **si.metadata,
                                    "token_count": si.token_count,
                                    "cost_usd": si.cost_usd,
                                },
                            )
                            self.db.add(session)
                        else:
                            session.status = si.status
                            session.metadata_ = {
                                **session.metadata_,
                                **si.metadata,
                                "token_count": si.token_count,
                                "cost_usd": si.cost_usd,
                            }

                        # Need the session PK before linking an agent to it.
                        await self.db.flush()

                        agent_status = self._SESSION_TO_AGENT_STATUS.get(si.status, "idle")
                        agent_name = _session_agent_name(si)

                        agent = await self.db.scalar(
                            select(Agent).where(Agent.session_id == session.id)
                        )
                        if agent is None:
                            self.db.add(
                                Agent(
                                    name=agent_name,
                                    type=si.plugin_type,
                                    status=agent_status,
                                    domain="rudra",
                                    plugin_id=si.plugin_type,
                                    session_id=session.id,
                                    token_count=token_count,
                                    cost_usd=cost,
                                    started_at=session.started_at,
                                    metadata_={"source": "cli_session", "external_id": si.id},
                                )
                            )
                        else:
                            agent.status = agent_status
                            agent.name = agent_name
                            agent.token_count = token_count
                            agent.cost_usd = cost

                    # Savepoint committed cleanly — count the outcome.
                    if is_new:
                        created += 1
                    else:
                        updated += 1
                except Exception:
                    log.exception(
                        "Failed to sync session %s from plugin %s", si.id, si.plugin_type
                    )
                    errors += 1

            try:
                await self.db.commit()
            except Exception:
                log.exception("sync_from_plugins commit failed — rolling back")
                await self.db.rollback()
                raise

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
