"""
Dhananjayah service — Long-running process manager.
RUDRA domain: Runtime layer.

Dhananjayah (धनञ्जय) = conqueror of wealth — watches over the vital system processes.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import psutil
import structlog

from indra.models.agent import Agent

from .schemas import ProcessListResponse, ProcessRead

logger = structlog.get_logger()

_RELEVANT_NAMES = frozenset({
    "claude", "gemini", "codex", "opencode", "kiro",
    "python", "python3", "node", "uvicorn", "fastapi",
})


class DhananjayahService:
    """Dhananjayah — watches over spawned processes and system resource usage."""

    def _is_relevant(self, name: str) -> bool:
        name_lower = name.lower()
        return any(n in name_lower for n in _RELEVANT_NAMES)

    async def list_processes(
        self,
        agents: list[Agent],
        all_processes: bool = False,
        limit: int = 100,
    ) -> ProcessListResponse:
        agent_by_pid: dict[int, Agent] = {}
        for a in agents:
            pid = a.metadata_.get("pid")
            if isinstance(pid, int):
                agent_by_pid[pid] = a

        # psutil is blocking; run it in a thread so the whole event loop doesn't
        # freeze for the duration of the scan.
        processes = await asyncio.get_running_loop().run_in_executor(
            None, self._collect_processes, agent_by_pid, all_processes, limit
        )
        return ProcessListResponse(processes=processes, total=len(processes))

    def _collect_processes(
        self,
        agent_by_pid: dict[int, Agent],
        all_processes: bool,
        limit: int,
    ) -> list[ProcessRead]:
        # Pass 1: cheap pid+name only, decide what to keep BEFORE the expensive
        # memory/time lookups. Default view keeps only relevant/agent procs, so
        # we never enrich hundreds of irrelevant system processes.
        keep: list[psutil.Process] = []
        for proc in psutil.process_iter(["pid", "name"]):
            try:
                name = proc.info.get("name") or ""
                pid = proc.info.get("pid", 0)
                if all_processes or self._is_relevant(name) or pid in agent_by_pid:
                    keep.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        processes: list[ProcessRead] = []
        for proc in keep:
            try:
                info = proc.as_dict(
                    attrs=["pid", "name", "status", "memory_info", "create_time"]
                )
                pid = info.get("pid", 0)
                mem_info = info.get("memory_info")
                memory_mb = round(mem_info.rss / 1024 / 1024, 1) if mem_info else 0.0
                create_time = info.get("create_time")
                agent = agent_by_pid.get(pid)
                processes.append(
                    ProcessRead(
                        pid=pid,
                        name=info.get("name") or "",
                        status=info.get("status") or "unknown",
                        cpu_percent=0.0,  # instantaneous %CPU needs a sampling interval; omitted for speed
                        memory_mb=memory_mb,
                        agent_id=str(agent.id) if agent else None,
                        agent_name=agent.name if agent else None,
                        started_at=(
                            datetime.fromtimestamp(create_time, UTC).isoformat()
                            if create_time
                            else None
                        ),
                    )
                )
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        processes.sort(key=lambda p: p.memory_mb, reverse=True)
        return processes[:limit]

    async def terminate_process(self, pid: int) -> bool:
        try:
            proc = psutil.Process(pid)
            proc.terminate()
            logger.info("process_terminated", pid=pid)
            return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False


dhananjayah_service = DhananjayahService()
