"""
Planning router — Plan template discovery and generation.
PRAJAPATI domain: Strategy layer.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from indra.core.auth import UserContext, get_current_user

from .schemas import GeneratePlanRequest, GeneratePlanResponse, PlanTemplate
from .service import PlanningService

router = APIRouter()


@router.get("/planning/templates", response_model=list[PlanTemplate], tags=["planning"])
async def list_templates() -> list[PlanTemplate]:
    return PlanningService.list_templates()


@router.post("/planning/generate", response_model=GeneratePlanResponse, tags=["planning"])
async def generate_plan(
    body: GeneratePlanRequest,
    _: UserContext = Depends(get_current_user),
) -> GeneratePlanResponse:
    return PlanningService.generate_plan(body)
