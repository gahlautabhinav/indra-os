from pydantic import BaseModel


class DashboardResponse(BaseModel):
    active_agents: int
    running_tasks: int
    connected_systems: list[str]
    system_health: float
    token_burn_rate: int
    total_cost_today: float
    active_traces: int
    alerts: list[dict]


class AgentSummary(BaseModel):
    id: str
    name: str
    type: str
    status: str
    domain: str
    plugin_id: str | None
    token_count: int
    cost_usd: float
    session_id: str | None
    parent_id: str | None


class AgentListResponse(BaseModel):
    agents: list[AgentSummary]
    total: int


class AgentHierarchyNode(BaseModel):
    id: str
    name: str
    type: str
    status: str
    domain: str
    children: list["AgentHierarchyNode"] = []


AgentHierarchyNode.model_rebuild()
