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
    # Plugin-derived fields
    active_sessions: int
    plugin_statuses: dict[str, str]


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
    started_at: str | None
    finished_at: str | None


class AgentListResponse(BaseModel):
    agents: list[AgentSummary]
    total: int
    limit: int
    offset: int


class AgentHierarchyNode(BaseModel):
    id: str
    name: str
    type: str
    status: str
    domain: str
    children: list["AgentHierarchyNode"] = []


AgentHierarchyNode.model_rebuild()


class SessionSummary(BaseModel):
    id: str
    external_id: str | None
    plugin_type: str
    project_path: str | None
    title: str | None = None
    status: str
    token_count: int
    cost_usd: float
    started_at: str
    ended_at: str | None
    event_count: int


class SessionListResponse(BaseModel):
    sessions: list[SessionSummary]
    total: int
    limit: int
    offset: int


class PluginHealthResponse(BaseModel):
    statuses: dict[str, str]
    plugin_types: list[str]


class SyncResult(BaseModel):
    synced: int
    created: int
    updated: int
    errors: int
