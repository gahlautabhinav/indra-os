"""Kurmah — Checkpoint / State Persistence. RUDRA domain."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

_DEVA = "kurmah"


class CheckpointRequest(BaseModel):
    agent_id: str
    label: str | None = None
    state: dict = {}


@router.post("/checkpoints")
async def create_checkpoint(body: CheckpointRequest) -> dict:
    return {"deva": _DEVA, "agent_id": body.agent_id, "label": body.label, "status": "saved"}


@router.get("/checkpoints")
async def list_checkpoints() -> dict:
    return {"deva": _DEVA, "checkpoints": [], "total": 0}
