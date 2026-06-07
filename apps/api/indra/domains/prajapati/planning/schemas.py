from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class PlanTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: str  # research | build | ops | monitor
    steps: list[dict[str, Any]]


class GeneratePlanRequest(BaseModel):
    template_id: str
    goal_title: str
    goal_description: str | None = None
    variables: dict[str, str] = {}


class GeneratePlanResponse(BaseModel):
    goal_title: str
    template_id: str
    definition: dict[str, Any]
    recommended_agents: int
    estimated_tasks: int
