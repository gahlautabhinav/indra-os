from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class CostSummary(BaseModel):
    total_cost_usd: Decimal
    total_tokens: int
    agent_count: int
    avg_cost_per_agent: Decimal
    avg_tokens_per_agent: float


class AgentCostEntry(BaseModel):
    agent_id: str
    agent_name: str
    domain: str
    cost_usd: Decimal
    token_count: int
    status: str
    created_at: datetime


class SessionCostEntry(BaseModel):
    session_id: str
    cost_usd: Decimal
    token_count: int
    agent_count: int


class TrendEntry(BaseModel):
    period: str  # YYYY-MM-DD
    cost_usd: Decimal
    token_count: int
    agent_count: int
