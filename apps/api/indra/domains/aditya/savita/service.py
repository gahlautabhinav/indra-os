"""
Savita service — Scheduler.
ADITYA domain: Governance layer.

Savitṛ (सवितृ) = the Impeller, the Sun-god — sets time in motion.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.exceptions import IndraException
from indra.models.schedule import Schedule

from .schemas import ScheduleCreate, ScheduleRead, TriggerResponse

if TYPE_CHECKING:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = structlog.get_logger()

_VALID_TRIGGERS = frozenset({"interval", "cron", "once"})
_VALID_ACTIONS = frozenset({"notify", "spawn_agent", "reindex_enabled"})

# Module-level scheduler reference — set by lifespan
_scheduler: AsyncIOScheduler | None = None


def set_scheduler(scheduler: AsyncIOScheduler) -> None:
    global _scheduler
    _scheduler = scheduler


def get_scheduler() -> AsyncIOScheduler | None:
    return _scheduler


async def _execute_action(schedule_id: str, action_type: str, action_config: dict[str, Any]) -> None:
    """APScheduler job callback — executed in the event loop."""
    logger.info("savita.action_executing", schedule_id=schedule_id, action=action_type)
    try:
        if action_type == "notify":
            from indra.database import AsyncSessionLocal
            from indra.domains.rudra.devadattah.schemas import NotificationCreate
            from indra.domains.rudra.devadattah.service import DevadattahService

            async with AsyncSessionLocal() as db:
                await DevadattahService().create(
                    db,
                    NotificationCreate(
                        title=action_config.get("title", "Scheduled Notification"),
                        message=action_config.get("message", ""),
                        severity=action_config.get("severity", "info"),
                        domain="aditya",
                    ),
                )

        elif action_type == "spawn_agent":
            logger.info("savita.spawn_agent", config=action_config)
            # Future: call agent spawn endpoint programmatically

        elif action_type == "reindex_enabled":
            # Safety-net: queue an index run for every enabled project (the worker
            # serializes them). Skips projects that already have an active run.
            # action_config {"mode": "fast"|"semantic"} → deterministic or AI build.
            from sqlalchemy import select

            from indra.database import AsyncSessionLocal
            from indra.domains.aditya.tvastah.pipeline import enqueue
            from indra.models.project import Project
            from indra.models.task import Task

            mode = "semantic" if action_config.get("mode") == "semantic" else "fast"
            async with AsyncSessionLocal() as db:
                projects = list(
                    (await db.execute(select(Project).where(Project.enabled.is_(True)))).scalars()
                )
                queued = 0
                for p in projects:
                    active = await db.execute(
                        select(Task)
                        .where(
                            Task.status.in_(("queued", "running")),
                            Task.input["kind"].astext == "index",
                            Task.input["project_id"].astext == str(p.id),
                        )
                        .limit(1)
                    )
                    if active.scalars().first() is None:
                        await enqueue(db, p, trigger="scheduled", mode=mode)
                        queued += 1
            logger.info("savita.reindex_enabled", enabled=len(projects), queued=queued, mode=mode)

    except Exception as exc:
        logger.error("savita.action_failed", error=str(exc), schedule_id=schedule_id)


def _register_job(scheduler: AsyncIOScheduler, schedule: Schedule) -> None:
    """Register a Schedule with APScheduler."""
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.date import DateTrigger
    from apscheduler.triggers.interval import IntervalTrigger

    job_id = f"savita_{schedule.id}"
    tc = schedule.trigger_config

    if schedule.trigger_type == "interval":
        seconds = int(tc.get("seconds", 3600))
        trigger = IntervalTrigger(seconds=seconds)
    elif schedule.trigger_type == "cron":
        trigger = CronTrigger.from_crontab(tc.get("cron_expr", "0 * * * *"))
    else:  # once
        run_at = tc.get("run_at", "")
        run_dt = datetime.fromisoformat(run_at) if run_at else datetime.now(UTC)
        trigger = DateTrigger(run_date=run_dt)

    scheduler.add_job(
        _execute_action,
        trigger=trigger,
        id=job_id,
        replace_existing=True,
        args=[str(schedule.id), schedule.action_type, schedule.action_config],
    )
    logger.info("savita.job_registered", job_id=job_id, trigger=schedule.trigger_type)


class SavitaService:
    @staticmethod
    async def load_all(db: AsyncSession) -> int:
        """Load all enabled schedules into APScheduler on startup."""
        if _scheduler is None:
            return 0
        result = await db.execute(
            select(Schedule).where(Schedule.enabled == True)  # noqa: E712
        )
        schedules = list(result.scalars())
        for s in schedules:
            try:
                _register_job(_scheduler, s)
            except Exception as exc:
                logger.warning("savita.load_failed", id=str(s.id), error=str(exc))
        return len(schedules)

    @staticmethod
    async def list_schedules(db: AsyncSession) -> list[ScheduleRead]:
        result = await db.execute(select(Schedule).order_by(Schedule.created_at.desc()))
        return [ScheduleRead.model_validate(s, from_attributes=True) for s in result.scalars()]

    @staticmethod
    async def create_schedule(db: AsyncSession, req: ScheduleCreate) -> ScheduleRead:
        if req.trigger_type not in _VALID_TRIGGERS:
            raise IndraException(
                status_code=400,
                error_code="invalid_trigger",
                message=f"trigger_type must be one of: {', '.join(sorted(_VALID_TRIGGERS))}",
            )
        if req.action_type not in _VALID_ACTIONS:
            raise IndraException(
                status_code=400,
                error_code="invalid_action",
                message=f"action_type must be one of: {', '.join(sorted(_VALID_ACTIONS))}",
            )
        s = Schedule(**req.model_dump())
        db.add(s)
        await db.commit()
        await db.refresh(s)
        if s.enabled and _scheduler is not None:
            try:
                _register_job(_scheduler, s)
            except Exception as exc:
                logger.warning("savita.register_failed", error=str(exc))
        logger.info("savita.schedule_created", id=str(s.id), trigger=s.trigger_type)
        return ScheduleRead.model_validate(s, from_attributes=True)

    @staticmethod
    async def delete_schedule(db: AsyncSession, schedule_id: uuid.UUID) -> None:
        s = await db.get(Schedule, schedule_id)
        if s is None:
            raise IndraException(status_code=404, error_code="schedule_not_found", message="Schedule not found")
        if _scheduler is not None:
            job_id = f"savita_{schedule_id}"
            if _scheduler.get_job(job_id):
                _scheduler.remove_job(job_id)
        await db.delete(s)
        await db.commit()

    @staticmethod
    async def toggle_schedule(db: AsyncSession, schedule_id: uuid.UUID, enabled: bool) -> ScheduleRead:
        s = await db.get(Schedule, schedule_id)
        if s is None:
            raise IndraException(status_code=404, error_code="schedule_not_found", message="Schedule not found")
        s.enabled = enabled
        await db.commit()
        await db.refresh(s)
        if _scheduler is not None:
            job_id = f"savita_{schedule_id}"
            if enabled:
                _register_job(_scheduler, s)
            elif _scheduler.get_job(job_id):
                _scheduler.remove_job(job_id)
        return ScheduleRead.model_validate(s, from_attributes=True)

    @staticmethod
    async def trigger_now(db: AsyncSession, schedule_id: uuid.UUID) -> TriggerResponse:
        s = await db.get(Schedule, schedule_id)
        if s is None:
            raise IndraException(status_code=404, error_code="schedule_not_found", message="Schedule not found")
        now = datetime.now(UTC)
        await _execute_action(str(schedule_id), s.action_type, s.action_config)
        s.last_run_at = now
        await db.commit()
        return TriggerResponse(schedule_id=schedule_id, triggered_at=now, action_type=s.action_type)
