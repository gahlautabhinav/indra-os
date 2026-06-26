"""
Background poller — runs every POLL_INTERVAL seconds, diffs agent statuses,
and publishes agent.status_changed events to the Redis pub/sub channel.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from indra.core.events import IndraEvent

log = logging.getLogger(__name__)

POLL_INTERVAL = 5  # seconds — lightweight WS status diffing cadence
# Persist plugin sessions into the DB every Nth tick. Full session aggregation
# streams up to 200 JSONL files (some very large), so it runs less often than
# the WS poll to keep IO load bounded. 6 * 5s = ~30s.
SYNC_EVERY_N_TICKS = 6
# Trace synthesis is heavier (reads session event timelines), so run it on a
# slower cadence than the session sync. 12 * 5s = ~60s.
SYNTH_EVERY_N_TICKS = 12
# Fingerprint enabled projects and auto-enqueue index runs for changed source.
# Cheap (git HEAD / bounded mtime), but runs a subprocess per enabled project,
# so keep it on the slow cadence. 12 * 5s = ~60s.
DETECT_EVERY_N_TICKS = 12


class AgentPoller:
    """
    Polls all registered plugins via PluginManager.poll_all() and publishes
    status-change events for any session whose status changed since last poll.
    """

    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._prev_statuses: dict[str, str] = {}  # session_id → status
        self._tick = 0

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop(), name="indra-poller")
            log.info("AgentPoller started (interval=%ds)", POLL_INTERVAL)

    def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            self._task = None
        log.info("AgentPoller stopped")

    async def _loop(self) -> None:
        from indra.database import AsyncSessionLocal
        from indra.domains.indra.service import WorkforceService
        from indra.plugins import plugin_manager
        from indra.websockets.manager import manager as ws_manager

        while True:
            try:
                await asyncio.sleep(POLL_INTERVAL)
                self._tick += 1

                # Persist the latest plugin sessions into the DB so the REST
                # API and UI reflect live CLI activity without requiring a
                # manual POST /plugins/sync. Throttled to every Nth tick; runs
                # in its own short-lived session and a sync failure must not
                # kill the poll loop.
                if self._tick % SYNC_EVERY_N_TICKS == 1:
                    try:
                        async with AsyncSessionLocal() as db:
                            await WorkforceService(db).sync_from_plugins()
                    except Exception:
                        log.exception("Poller session sync failed — UI may be stale")

                # Synthesize Vivarta traces from session event timelines so the
                # Trace Center reflects real CLI agent activity (which emits no
                # OTel spans). Runs after sync, on a slower cadence; idempotent.
                if self._tick % SYNTH_EVERY_N_TICKS == 2:
                    try:
                        from indra.domains.vasu.suryah.service import trace_service

                        async with AsyncSessionLocal() as db:
                            await trace_service.synthesize_from_sessions(db, limit=15)
                    except Exception:
                        log.exception("Poller trace synthesis failed")

                # Rebuild the Naksatrani knowledge constellation (DB-only, cheap)
                # so cross-CLI/project relationships stay current.
                if self._tick % SYNTH_EVERY_N_TICKS == 3:
                    try:
                        from indra.domains.vasu.naksatrani.service import NaksatraniService

                        async with AsyncSessionLocal() as db:
                            await NaksatraniService.rebuild_graph(db)
                    except Exception:
                        log.exception("Poller knowledge-graph rebuild failed")

                # Auto-detect: fingerprint enabled projects, enqueue index runs
                # for any whose source changed (the Tvasta worker executes them).
                if self._tick % DETECT_EVERY_N_TICKS == 4:
                    try:
                        from indra.domains.aditya.tvastah.pipeline import detect_and_enqueue

                        async with AsyncSessionLocal() as db:
                            await detect_and_enqueue(db)
                    except Exception:
                        log.exception("Poller project detect failed")

                poll_results = await plugin_manager.poll_all()

                current: dict[str, str] = {}
                for sessions in poll_results.values():
                    for s in sessions:
                        current[s.id] = s.status

                # Publish status-changed events for any diff.
                for session_id, status in current.items():
                    prev = self._prev_statuses.get(session_id)
                    if prev is None:
                        # New session appeared — emit created event.
                        event = IndraEvent(
                            event_type="session.created",
                            domain="rudra",
                            data={
                                "session_id": session_id,
                                "status": status,
                            },
                            timestamp=datetime.now(tz=UTC).isoformat(),
                        )
                        await ws_manager.publish_event(event)
                    elif prev != status:
                        # Status changed — emit changed event.
                        event = IndraEvent(
                            event_type="agent.status_changed",
                            domain="rudra",
                            data={
                                "session_id": session_id,
                                "old_status": prev,
                                "new_status": status,
                            },
                            timestamp=datetime.now(tz=UTC).isoformat(),
                        )
                        await ws_manager.publish_event(event)

                # Sessions that disappeared since last poll.
                for session_id in self._prev_statuses:
                    if session_id not in current:
                        event = IndraEvent(
                            event_type="session.ended",
                            domain="rudra",
                            data={"session_id": session_id},
                            timestamp=datetime.now(tz=UTC).isoformat(),
                        )
                        await ws_manager.publish_event(event)

                self._prev_statuses = current

            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("AgentPoller tick failed — will retry in %ds", POLL_INTERVAL)


poller = AgentPoller()
