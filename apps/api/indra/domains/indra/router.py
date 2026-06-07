from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.domains.indra.schemas import AgentHierarchyNode, AgentListResponse, DashboardResponse
from indra.domains.indra.service import WorkforceService

router = APIRouter()


def get_service(db: AsyncSession = Depends(get_db)) -> WorkforceService:
    return WorkforceService(db)


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(svc: WorkforceService = Depends(get_service)) -> DashboardResponse:
    return await svc.get_dashboard()


@router.get("/agents", response_model=AgentListResponse)
async def list_agents(
    limit: int = 50,
    offset: int = 0,
    svc: WorkforceService = Depends(get_service),
) -> AgentListResponse:
    return await svc.list_agents(limit=limit, offset=offset)


@router.get("/agents/hierarchy", response_model=list[AgentHierarchyNode])
async def get_agent_hierarchy(
    svc: WorkforceService = Depends(get_service),
) -> list[AgentHierarchyNode]:
    return await svc.get_agent_hierarchy()
