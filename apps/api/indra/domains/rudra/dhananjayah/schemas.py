from __future__ import annotations

from pydantic import BaseModel


class ProcessRead(BaseModel):
    pid: int
    name: str
    status: str
    cpu_percent: float
    memory_mb: float
    agent_id: str | None
    agent_name: str | None
    started_at: str | None


class ProcessListResponse(BaseModel):
    processes: list[ProcessRead]
    total: int
