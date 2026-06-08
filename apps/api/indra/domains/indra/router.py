from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.domains.indra.schemas import (
    AgentHierarchyNode,
    AgentListResponse,
    DashboardResponse,
    PluginHealthResponse,
    SessionListResponse,
    SyncResult,
)
from indra.domains.indra.service import WorkforceService

router = APIRouter()


def get_service(db: AsyncSession = Depends(get_db)) -> WorkforceService:
    return WorkforceService(db)


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(svc: WorkforceService = Depends(get_service)) -> DashboardResponse:
    return await svc.get_dashboard()


# ── Agents ────────────────────────────────────────────────────────────────────

@router.get("/agents", response_model=AgentListResponse)
async def list_agents(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: str | None = Query(None),
    domain: str | None = Query(None),
    agent_type: str | None = Query(None, alias="type"),
    svc: WorkforceService = Depends(get_service),
) -> AgentListResponse:
    return await svc.list_agents(
        limit=limit,
        offset=offset,
        status=status,
        domain=domain,
        agent_type=agent_type,
    )


@router.get("/agents/hierarchy", response_model=list[AgentHierarchyNode])
async def get_agent_hierarchy(
    svc: WorkforceService = Depends(get_service),
) -> list[AgentHierarchyNode]:
    return await svc.get_agent_hierarchy()


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    plugin_type: str | None = Query(None),
    status: str | None = Query(None),
    svc: WorkforceService = Depends(get_service),
) -> SessionListResponse:
    return await svc.list_sessions(
        limit=limit,
        offset=offset,
        plugin_type=plugin_type,
        status=status,
    )


@router.get("/sessions/{session_id}/events")
async def get_session_events(
    session_id: str,
    limit: int = Query(2000, ge=1, le=10000),
    svc: WorkforceService = Depends(get_service),
) -> dict:
    result = await svc.get_session_events(session_id, limit)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


# ── Plugin ────────────────────────────────────────────────────────────────────

@router.get("/plugins/health", response_model=PluginHealthResponse)
async def get_plugin_health(
    svc: WorkforceService = Depends(get_service),
) -> PluginHealthResponse:
    return await svc.get_plugin_health()


@router.post("/plugins/sync", response_model=SyncResult)
async def sync_from_plugins(
    svc: WorkforceService = Depends(get_service),
) -> SyncResult:
    """Manually trigger a plugin → DB sync. The background poller also calls this."""
    return await svc.sync_from_plugins()
