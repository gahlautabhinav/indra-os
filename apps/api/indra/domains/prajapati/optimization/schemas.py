from __future__ import annotations

from pydantic import BaseModel


class Recommendation(BaseModel):
    id: str
    category: str  # cost | performance | reliability | governance
    severity: str  # info | warning | critical
    title: str
    description: str
    action: str
    affected_domain: str
    estimated_savings: str | None = None


class OptimizationReport(BaseModel):
    total_recommendations: int
    critical: int
    warnings: int
    info: int
    recommendations: list[Recommendation]
