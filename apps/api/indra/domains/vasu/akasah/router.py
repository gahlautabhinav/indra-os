"""Akasah — Context & Space. VASU domain.

Ākāśa (आकाश) = ether, the field that holds all things. Manages the context
window: how much of each agent's finite token-space is occupied. Computed live
from the real sessions table.
"""

from __future__ import annotations

from typing import cast

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.session import Session

router = APIRouter()

_DEVA = "akasah"

# Effective context window (tokens) per plugin family. Used to compute pressure.
_CONTEXT_WINDOW = {
    "claude_code": 200_000,
    "gemini_cli": 1_000_000,
    "codex_cli": 128_000,
    "kiro_cli": 200_000,
    "opencode": 128_000,
}
_DEFAULT_WINDOW = 200_000


def _pressure(used_pct: float) -> str:
    if used_pct >= 90:
        return "critical"
    if used_pct >= 70:
        return "high"
    if used_pct >= 40:
        return "moderate"
    return "healthy"


@router.get("/context/windows", tags=["context"])
async def list_context_windows(
    active_only: bool = Query(default=True),
    limit: int = Query(default=100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> dict:
    q = select(Session).order_by(Session.started_at.desc()).limit(limit)
    if active_only:
        q = q.where(Session.status == "active")
    sessions = list((await db.execute(q)).scalars())

    windows = []
    total_used = 0
    total_capacity = 0
    for s in sessions:
        window = _CONTEXT_WINDOW.get(s.plugin_type, _DEFAULT_WINDOW)
        tokens = int(s.metadata_.get("token_count", 0) or 0)
        used_pct = round(min(tokens / window * 100, 100), 1) if window else 0.0
        total_used += tokens
        total_capacity += window
        windows.append(
            {
                "session_id": str(s.id),
                "plugin_type": s.plugin_type,
                "project_path": s.project_path,
                "tokens_used": tokens,
                "context_window": window,
                "used_pct": used_pct,
                "pressure": _pressure(used_pct),
                "status": s.status,
            }
        )

    windows.sort(key=lambda w: cast(float, w["used_pct"]), reverse=True)
    return {
        "deva": _DEVA,
        "windows": windows,
        "total": len(windows),
        "aggregate_used": total_used,
        "aggregate_capacity": total_capacity,
        "aggregate_pct": round(total_used / total_capacity * 100, 1) if total_capacity else 0.0,
    }
