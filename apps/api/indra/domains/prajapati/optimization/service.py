"""
Optimization service — Workforce and cost optimization recommendations.
PRAJAPATI domain: Strategy layer.
"""

from __future__ import annotations

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.models.agent import Agent
from indra.models.notification import Notification
from indra.models.policy import Policy
from indra.models.schedule import Schedule
from indra.models.task import Task

from .schemas import OptimizationReport, Recommendation

logger = structlog.get_logger()


class OptimizationService:
    @staticmethod
    async def get_recommendations(db: AsyncSession) -> OptimizationReport:
        recs: list[Recommendation] = []

        # 1. Agents in error state
        error_agents = await db.execute(
            select(func.count(Agent.id)).where(Agent.status == "error")
        )
        err_count = int(error_agents.scalar() or 0)
        if err_count > 0:
            recs.append(Recommendation(
                id="agent_errors",
                category="reliability",
                severity="critical",
                title=f"{err_count} agents in error state",
                description="Agents in error state are consuming resources without producing value.",
                action="Navigate to Agents and terminate or restart errored agents.",
                affected_domain="rudra",
            ))

        # 2. No active policies
        active_policies = await db.execute(
            select(func.count(Policy.id)).where(Policy.enabled == True)  # noqa: E712
        )
        policy_count = int(active_policies.scalar() or 0)
        if policy_count == 0:
            recs.append(Recommendation(
                id="no_policies",
                category="governance",
                severity="warning",
                title="No active governance policies",
                description="Without cost or token limits, agents can consume unbounded resources.",
                action="Create cost_limit and token_limit policies in Varunah.",
                affected_domain="aditya",
                estimated_savings="Potentially significant",
            ))

        # 3. High cost agents (top spender > $1 threshold)
        top_cost = await db.execute(
            select(Agent.name, Agent.cost_usd).order_by(Agent.cost_usd.desc()).limit(1)
        )
        top_row = top_cost.one_or_none()
        if top_row and float(top_row.cost_usd) > 1.0:
            recs.append(Recommendation(
                id="high_cost_agent",
                category="cost",
                severity="warning",
                title=f"Agent '{top_row.name}' cost ${float(top_row.cost_usd):.4f}",
                description="This agent has the highest individual cost. Consider token limits.",
                action="Set a token_limit policy targeting this agent in Varunah.",
                affected_domain="aditya",
                estimated_savings=f"Up to ${float(top_row.cost_usd):.2f}",
            ))

        # 4. Many failed tasks
        failed_tasks = await db.execute(
            select(func.count(Task.id)).where(Task.status == "failed")
        )
        fail_count = int(failed_tasks.scalar() or 0)
        if fail_count > 5:
            recs.append(Recommendation(
                id="failed_tasks",
                category="reliability",
                severity="warning",
                title=f"{fail_count} failed tasks in queue",
                description="High task failure rate indicates systematic agent or input issues.",
                action="Review failed tasks in Pranah for common error patterns.",
                affected_domain="rudra",
            ))

        # 5. Unread critical alerts
        crit = await db.execute(
            select(func.count(Notification.id)).where(
                Notification.is_read == False,  # noqa: E712
                Notification.severity == "critical",
            )
        )
        crit_count = int(crit.scalar() or 0)
        if crit_count > 0:
            recs.append(Recommendation(
                id="unread_critical_alerts",
                category="reliability",
                severity="critical",
                title=f"{crit_count} unread critical alerts",
                description="Critical alerts require immediate attention to prevent system degradation.",
                action="Review and acknowledge alerts in Devadattah.",
                affected_domain="rudra",
            ))

        # 6. No schedules → recommend monitoring schedule
        sched_count = await db.execute(
            select(func.count(Schedule.id)).where(Schedule.enabled == True)  # noqa: E712
        )
        if int(sched_count.scalar() or 0) == 0:
            recs.append(Recommendation(
                id="no_schedules",
                category="performance",
                severity="info",
                title="No active schedules configured",
                description="Scheduled monitoring and cleanup tasks improve long-term reliability.",
                action="Create a daily cost report schedule in Savita.",
                affected_domain="aditya",
            ))

        counts = {
            "critical": sum(1 for r in recs if r.severity == "critical"),
            "warning": sum(1 for r in recs if r.severity == "warning"),
            "info": sum(1 for r in recs if r.severity == "info"),
        }

        return OptimizationReport(
            total_recommendations=len(recs),
            critical=counts["critical"],
            warnings=counts["warning"],
            info=counts["info"],
            recommendations=recs,
        )
