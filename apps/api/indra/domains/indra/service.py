from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.domains.indra.schemas import AgentHierarchyNode, AgentListResponse, AgentSummary, DashboardResponse
from indra.models.agent import Agent
from indra.models.trace import Trace


class WorkforceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_dashboard(self) -> DashboardResponse:
        active_agents_q = await self.db.scalar(
            select(func.count()).select_from(Agent).where(Agent.status.in_(["running", "active"]))
        )
        running_tasks_q = await self.db.scalar(
            select(func.count()).select_from(Agent).where(Agent.status == "running")
        )
        active_traces_q = await self.db.scalar(
            select(func.count()).select_from(Trace).where(Trace.status == "running")
        )

        return DashboardResponse(
            active_agents=active_agents_q or 0,
            running_tasks=running_tasks_q or 0,
            connected_systems=[],
            system_health=100.0,
            token_burn_rate=0,
            total_cost_today=0.0,
            active_traces=active_traces_q or 0,
            alerts=[],
        )

    async def list_agents(self, limit: int = 50, offset: int = 0) -> AgentListResponse:
        result = await self.db.execute(
            select(Agent).order_by(Agent.created_at.desc()).limit(limit).offset(offset)
        )
        agents = result.scalars().all()
        total = await self.db.scalar(select(func.count()).select_from(Agent)) or 0

        return AgentListResponse(
            agents=[
                AgentSummary(
                    id=str(a.id),
                    name=a.name,
                    type=a.type,
                    status=a.status,
                    domain=a.domain,
                    plugin_id=a.plugin_id,
                    token_count=a.token_count,
                    cost_usd=float(a.cost_usd),
                    session_id=str(a.session_id) if a.session_id else None,
                    parent_id=str(a.parent_id) if a.parent_id else None,
                )
                for a in agents
            ],
            total=total,
        )

    async def get_agent_hierarchy(self) -> list[AgentHierarchyNode]:
        result = await self.db.execute(select(Agent))
        all_agents = result.scalars().all()

        nodes: dict[str, AgentHierarchyNode] = {
            str(a.id): AgentHierarchyNode(
                id=str(a.id),
                name=a.name,
                type=a.type,
                status=a.status,
                domain=a.domain,
            )
            for a in all_agents
        }

        roots: list[AgentHierarchyNode] = []
        for agent in all_agents:
            node = nodes[str(agent.id)]
            if agent.parent_id and str(agent.parent_id) in nodes:
                nodes[str(agent.parent_id)].children.append(node)
            else:
                roots.append(node)

        return roots
