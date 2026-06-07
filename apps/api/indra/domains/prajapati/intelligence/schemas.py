from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel


class DomainHealth(BaseModel):
    domain: str
    status: str  # ok | degraded | unknown
    active_count: int
    notes: str


class StrategyOverview(BaseModel):
    total_agents: int
    active_agents: int
    total_sessions: int
    running_tasks: int
    completed_tasks: int
    failed_tasks: int
    total_cost_usd: Decimal
    total_tokens: int
    active_goals: int
    pending_goals: int
    unread_alerts: int
    memory_chunks: int
    knowledge_nodes: int
    active_schedules: int
    active_policies: int
    domain_health: list[DomainHealth]


class SystemHealthReport(BaseModel):
    overall_status: str  # healthy | degraded | critical
    checks: dict[str, str]
    recommendations: list[str]
