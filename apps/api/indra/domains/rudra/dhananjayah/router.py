from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent

from .schemas import ProcessListResponse
from .service import dhananjayah_service

router = APIRouter()


@router.get("/processes", response_model=ProcessListResponse)
async def list_processes(
    all_processes: bool = Query(False, description="Include all system processes, not just AI-related"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> ProcessListResponse:
    agents = (await db.execute(select(Agent))).scalars().all()
    return await dhananjayah_service.list_processes(
        list(agents), all_processes=all_processes, limit=limit
    )


@router.delete("/processes/{pid}")
async def terminate_process(pid: int) -> dict:
    ok = await dhananjayah_service.terminate_process(pid)
    if not ok:
        raise HTTPException(status_code=404, detail="Process not found or permission denied")
    return {"terminated": True, "pid": pid}
