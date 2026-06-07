"""
Savita router — Scheduler endpoints.
ADITYA domain: Governance layer.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.auth import UserContext, require_role
from indra.database import get_db

from .schemas import ScheduleCreate, ScheduleRead, TriggerResponse
from .service import SavitaService

router = APIRouter()


@router.get("/schedules", response_model=list[ScheduleRead], tags=["schedules"])
async def list_schedules(db: AsyncSession = Depends(get_db)) -> list[ScheduleRead]:
    return await SavitaService.list_schedules(db)


@router.post(
    "/schedules",
    response_model=ScheduleRead,
    status_code=status.HTTP_201_CREATED,
    tags=["schedules"],
)
async def create_schedule(
    body: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> ScheduleRead:
    return await SavitaService.create_schedule(db, body)


@router.post("/schedules/{schedule_id}/enable", response_model=ScheduleRead, tags=["schedules"])
async def enable_schedule(
    schedule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> ScheduleRead:
    return await SavitaService.toggle_schedule(db, schedule_id, enabled=True)


@router.post("/schedules/{schedule_id}/disable", response_model=ScheduleRead, tags=["schedules"])
async def disable_schedule(
    schedule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> ScheduleRead:
    return await SavitaService.toggle_schedule(db, schedule_id, enabled=False)


@router.post("/schedules/{schedule_id}/trigger", response_model=TriggerResponse, tags=["schedules"])
async def trigger_schedule(
    schedule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> TriggerResponse:
    return await SavitaService.trigger_now(db, schedule_id)


@router.delete(
    "/schedules/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["schedules"],
)
async def delete_schedule(
    schedule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(require_role("admin")),
) -> None:
    await SavitaService.delete_schedule(db, schedule_id)
