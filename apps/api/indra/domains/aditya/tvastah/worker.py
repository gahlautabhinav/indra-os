"""Tvasta IndexWorker — claims queued index runs and executes them off the
request path.

DB-as-queue: a queued `Task` (input.kind == "index") is claimed with
`FOR UPDATE SKIP LOCKED`, marked running (which releases the row lock and, via the
status filter, prevents re-claim), then executed. Concurrency 1 — graphify is
heavy; serialize per machine.
ponytail: single in-process worker + Postgres SKIP LOCKED; add a broker only if
indexing ever spans machines.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select

from indra.models.task import Task

from . import pipeline

log = logging.getLogger(__name__)

WORKER_INTERVAL = 3  # seconds between claim attempts


class IndexWorker:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop(), name="indra-index-worker")
            log.info("IndexWorker started (interval=%ds)", WORKER_INTERVAL)

    def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            self._task = None
        log.info("IndexWorker stopped")

    async def _loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(WORKER_INTERVAL)
                await self._claim_and_run()
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("IndexWorker tick failed — will retry")

    async def _claim_and_run(self) -> None:
        from indra.database import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            stmt = (
                select(Task)
                .where(Task.status == "queued", Task.input["kind"].astext == "index")
                .order_by(Task.created_at)
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            task = (await db.execute(stmt)).scalars().first()
            if task is None:
                return
            task.status = "running"
            task.started_at = datetime.now(UTC)
            await db.commit()
            await pipeline.execute(db, task)


index_worker = IndexWorker()
