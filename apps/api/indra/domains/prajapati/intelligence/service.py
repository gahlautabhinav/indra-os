"""
Intelligence service — Cross-domain aggregate insights.
PRAJAPATI domain: Strategy layer.
"""

from __future__ import annotations

from decimal import Decimal

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.models.agent import Agent
from indra.models.goal import Goal
from indra.models.knowledge import KnowledgeNode
from indra.models.memory import MemoryChunk
from indra.models.notification import Notification
from indra.models.policy import Policy
from indra.models.schedule import Schedule
from indra.models.session import Session
from indra.models.task import Task

from .schemas import DomainHealth, StrategyOverview, SystemHealthReport

logger = structlog.get_logger()

_DOMAINS = ["indra", "vasu", "rudra", "aditya", "prajapati"]


class IntelligenceService:
    @staticmethod
    async def get_overview(db: AsyncSession) -> StrategyOverview:
        # Agents
        agent_totals = await db.execute(
            select(func.count(Agent.id), func.sum(Agent.cost_usd), func.sum(Agent.token_count))
        )
        a_row = agent_totals.one()
        active_agents = await db.execute(
            select(func.count(Agent.id)).where(Agent.status.in_(["running", "active"]))
        )

        # Sessions
        sessions_count = await db.execute(select(func.count(Session.id)))

        # Tasks
        task_counts = await db.execute(
            select(Task.status, func.count(Task.id)).group_by(Task.status)
        )
        task_map: dict[str, int] = {row.status: row[1] for row in task_counts.all()}

        # Goals
        goal_counts = await db.execute(
            select(Goal.status, func.count(Goal.id)).group_by(Goal.status)
        )
        goal_map: dict[str, int] = {row.status: row[1] for row in goal_counts.all()}

        # Notifications / alerts
        unread = await db.execute(
            select(func.count(Notification.id)).where(Notification.is_read == False)  # noqa: E712
        )

        # Memory
        mem_count = await db.execute(select(func.count(MemoryChunk.id)))

        # Knowledge
        node_count = await db.execute(select(func.count(KnowledgeNode.id)))

        # Schedules / policies
        sched_count = await db.execute(
            select(func.count(Schedule.id)).where(Schedule.enabled == True)  # noqa: E712
        )
        policy_count = await db.execute(
            select(func.count(Policy.id)).where(Policy.enabled == True)  # noqa: E712
        )

        # Domain health (simple: count active agents per domain)
        domain_rows = await db.execute(
            select(Agent.domain, func.count(Agent.id)).where(
                Agent.status.in_(["running", "active"])
            ).group_by(Agent.domain)
        )
        domain_active: dict[str, int] = {row.domain: row[1] for row in domain_rows.all()}
        domain_health = [
            DomainHealth(
                domain=d,
                status="ok" if domain_active.get(d, 0) >= 0 else "unknown",
                active_count=domain_active.get(d, 0),
                notes="",
            )
            for d in _DOMAINS
        ]

        return StrategyOverview(
            total_agents=int(a_row[0] or 0),
            active_agents=int(active_agents.scalar() or 0),
            total_sessions=int(sessions_count.scalar() or 0),
            running_tasks=task_map.get("running", 0),
            completed_tasks=task_map.get("completed", 0),
            failed_tasks=task_map.get("failed", 0),
            total_cost_usd=Decimal(str(a_row[1] or 0)),
            total_tokens=int(a_row[2] or 0),
            active_goals=goal_map.get("active", 0),
            pending_goals=goal_map.get("pending", 0),
            unread_alerts=int(unread.scalar() or 0),
            memory_chunks=int(mem_count.scalar() or 0),
            knowledge_nodes=int(node_count.scalar() or 0),
            active_schedules=int(sched_count.scalar() or 0),
            active_policies=int(policy_count.scalar() or 0),
            domain_health=domain_health,
        )

    @staticmethod
    async def get_health_report(db: AsyncSession) -> SystemHealthReport:
        checks: dict[str, str] = {}
        recommendations: list[str] = []

        # Check for failed tasks
        failed = await db.execute(
            select(func.count(Task.id)).where(Task.status == "failed")
        )
        failed_count = int(failed.scalar() or 0)
        checks["tasks"] = "ok" if failed_count == 0 else f"degraded ({failed_count} failed)"
        if failed_count > 0:
            recommendations.append(f"Review {failed_count} failed tasks in Pranah")

        # Check for critical unread alerts
        crit_alerts = await db.execute(
            select(func.count(Notification.id)).where(
                Notification.is_read == False,  # noqa: E712
                Notification.severity == "critical",
            )
        )
        crit_count = int(crit_alerts.scalar() or 0)
        checks["alerts"] = "ok" if crit_count == 0 else f"critical ({crit_count} unread)"
        if crit_count > 0:
            recommendations.append(f"Acknowledge {crit_count} critical alerts in Devadattah")

        # Check for stalled agents (running with no recent activity — simple proxy: no finished_at but status running)
        stalled = await db.execute(
            select(func.count(Agent.id)).where(Agent.status == "error")
        )
        err_count = int(stalled.scalar() or 0)
        checks["agents"] = "ok" if err_count == 0 else f"degraded ({err_count} error)"
        if err_count > 0:
            recommendations.append(f"Investigate {err_count} agents in error state")

        # Policies
        policies_exist = await db.execute(select(func.count(Policy.id)).where(Policy.enabled == True))  # noqa: E712
        if int(policies_exist.scalar() or 0) == 0:
            recommendations.append("No active governance policies — configure cost limits in Varunah")
            checks["policies"] = "warning"
        else:
            checks["policies"] = "ok"

        overall = "healthy"
        if any("critical" in v for v in checks.values()):
            overall = "critical"
        elif any("degraded" in v or "warning" in v for v in checks.values()):
            overall = "degraded"

        return SystemHealthReport(
            overall_status=overall,
            checks=checks,
            recommendations=recommendations,
        )
