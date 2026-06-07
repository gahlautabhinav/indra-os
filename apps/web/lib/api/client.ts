import axios, { type AxiosInstance } from "axios";
import type {
  Agent,
  AgentCostEntry,
  AgentHierarchyNode,
  AgentMessage,
  AgentProfile,
  CostSummary,
  DashboardData,
  DecomposeResponse,
  ExecuteResponse,
  GeneratePlanResponse,
  Goal,
  GoalPriority,
  GraphResponse,
  KnowledgeEdge,
  KnowledgeNode,
  LineageResponse,
  MCPServer,
  MemoryChunk,
  MemorySearchResult,
  MemoryStats,
  Notification,
  NotificationListResponse,
  NotificationStats,
  OptimizationReport,
  PaginatedResponse,
  PlanTemplate,
  Policy,
  PolicyCheckResult,
  ProcessInfo,
  RoleStats,
  Schedule,
  Session,
  SessionCostEntry,
  StorageAnalytics,
  StrategyOverview,
  StreamEventsResponse,
  StreamListResponse,
  SystemHealthReport,
  Task,
  TaskStats,
  Trace,
  TraceWithSpans,
  TrendEntry,
  TriggerResponse,
  UserRole,
  UserRoleRead,
  WorkflowDef,
  Workspace,
  WorkspaceFileList,
} from "@indra/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("indra_token") : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error.response?.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("indra_token");
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createClient();

// ── Typed API helpers ─────────────────────────────────────────────────────────

export const indraApi = {
  // Dashboard
  getDashboard: () =>
    apiClient.get<DashboardData>("/dashboard").then((r) => r.data),

  // Agents
  listAgents: (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    domain?: string;
    type?: string;
  }) =>
    apiClient
      .get<{ agents: Agent[]; total: number; limit: number; offset: number }>(
        "/agents",
        { params }
      )
      .then((r) => r.data),

  getAgentHierarchy: () =>
    apiClient
      .get<AgentHierarchyNode[]>("/agents/hierarchy")
      .then((r) => r.data),

  // Sessions
  listSessions: (params?: {
    limit?: number;
    offset?: number;
    plugin_type?: string;
    status?: string;
  }) =>
    apiClient
      .get<PaginatedResponse<Session>>("/sessions", { params })
      .then((r) => r.data),

  // MCP
  listMCPServers: () =>
    apiClient
      .get<{ servers: MCPServer[] }>("/mcp/servers")
      .then((r) => r.data),

  // Plugins
  getPluginHealth: () =>
    apiClient
      .get<{ statuses: Record<string, string>; plugin_types: string[] }>(
        "/plugins/health"
      )
      .then((r) => r.data),

  syncPlugins: () =>
    apiClient.post<{
      synced: number;
      created: number;
      updated: number;
      errors: number;
    }>("/plugins/sync").then((r) => r.data),

  // Traces
  listTraces: (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    session_id?: string;
    agent_id?: string;
  }) =>
    apiClient
      .get<{ traces: Trace[]; total: number; limit: number; offset: number }>(
        "/traces",
        { params }
      )
      .then((r) => r.data),

  getTrace: (traceId: string) =>
    apiClient.get<TraceWithSpans>(`/traces/${traceId}`).then((r) => r.data),

  getTraceStats: () =>
    apiClient
      .get<{
        total_traces: number;
        active_traces: number;
        error_traces: number;
        avg_duration_ms: number | null;
        p50_duration_ms: number | null;
        p99_duration_ms: number | null;
      }>("/traces/stats")
      .then((r) => r.data),

  // Memory / RAG
  listMemoryChunks: (params?: {
    limit?: number;
    offset?: number;
    agent_id?: string;
  }) =>
    apiClient
      .get<{ chunks: MemoryChunk[]; total: number; limit: number; offset: number }>(
        "/memory/chunks",
        { params }
      )
      .then((r) => r.data),

  ingestMemoryChunk: (body: {
    content: string;
    agent_id?: string;
    metadata?: Record<string, unknown>;
  }) =>
    apiClient
      .post<{
        id: string;
        content_preview: string;
        has_embedding: boolean;
        created_at: string;
      }>("/memory/chunks", body)
      .then((r) => r.data),

  searchMemory: (body: {
    query: string;
    limit?: number;
    agent_id?: string;
    similarity_threshold?: number;
  }) =>
    apiClient
      .post<{
        results: MemorySearchResult[];
        total: number;
        query: string;
        search_mode: string;
      }>("/memory/search", body)
      .then((r) => r.data),

  deleteMemoryChunk: (chunkId: string) =>
    apiClient.delete(`/memory/chunks/${chunkId}`).then((r) => r.data),

  getMemoryStats: () =>
    apiClient.get<MemoryStats>("/memory/stats").then((r) => r.data),

  // Tasks / Pranah
  listTasks: (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    agent_id?: string;
    priority?: number;
  }) =>
    apiClient
      .get<{ tasks: Task[]; total: number; limit: number; offset: number }>(
        "/tasks",
        { params }
      )
      .then((r) => r.data),

  getTaskStats: () =>
    apiClient.get<TaskStats>("/tasks/stats").then((r) => r.data),

  createTask: (body: {
    name: string;
    description?: string;
    agent_id?: string;
    priority?: number;
    input?: Record<string, unknown>;
  }) =>
    apiClient.post<Task>("/tasks", body).then((r) => r.data),

  updateTask: (
    taskId: string,
    body: { status?: string; output?: Record<string, unknown>; error?: string }
  ) =>
    apiClient.patch<Task>(`/tasks/${taskId}`, body).then((r) => r.data),

  cancelTask: (taskId: string) =>
    apiClient.delete(`/tasks/${taskId}`).then((r) => r.data),

  // Agent spawn
  spawnAgent: (body: {
    name: string;
    type?: string;
    domain?: string;
    parent_id?: string;
    metadata?: Record<string, unknown>;
  }) =>
    apiClient
      .post<{
        id: string;
        name: string;
        type: string;
        status: string;
        domain: string;
        parent_id: string | null;
        created_at: string;
      }>("/agents/spawn", body)
      .then((r) => r.data),

  updateAgentStatus: (
    agentId: string,
    body: { status: string; token_count?: number; cost_usd?: number; error?: string }
  ) =>
    apiClient.patch(`/agents/${agentId}/status`, body).then((r) => r.data),

  // Agent identity / Jivatma
  getAgentProfile: (agentId: string) =>
    apiClient.get<AgentProfile>(`/agents/${agentId}/profile`).then((r) => r.data),

  getAgentLineage: (agentId: string) =>
    apiClient.get<LineageResponse>(`/agents/${agentId}/lineage`).then((r) => r.data),

  // Notifications / Devadattah
  listNotifications: (params?: { limit?: number; unread_only?: boolean }) =>
    apiClient
      .get<NotificationListResponse>("/notifications", { params })
      .then((r) => r.data),

  getNotificationStats: () =>
    apiClient.get<NotificationStats>("/notifications/stats").then((r) => r.data),

  createNotification: (body: {
    title: string;
    message: string;
    severity?: string;
    domain?: string;
    source_type?: string;
    source_id?: string;
  }) =>
    apiClient.post<Notification>("/notifications", body).then((r) => r.data),

  markNotificationRead: (notificationId: string) =>
    apiClient.post(`/notifications/${notificationId}/read`).then((r) => r.data),

  markAllNotificationsRead: () =>
    apiClient.post<{ marked_read: number }>("/notifications/read-all").then((r) => r.data),

  deleteNotification: (notificationId: string) =>
    apiClient.delete(`/notifications/${notificationId}`).then((r) => r.data),

  // Processes / Dhananjayah
  listProcesses: (params?: { all_processes?: boolean; limit?: number }) =>
    apiClient
      .get<{ processes: ProcessInfo[]; total: number }>("/processes", { params })
      .then((r) => r.data),

  terminateProcess: (pid: number) =>
    apiClient.delete(`/processes/${pid}`).then((r) => r.data),

  // Agent messages / Vyanah
  listAgentMessages: (agentId: string, limit?: number) =>
    apiClient
      .get<{ messages: AgentMessage[]; agent_id: string; total: number }>(
        `/agents/${agentId}/messages`,
        { params: { limit } }
      )
      .then((r) => r.data),

  publishAgentMessage: (
    agentId: string,
    body: { role?: string; content: string; metadata?: Record<string, unknown> }
  ) =>
    apiClient
      .post<{ id: string; agent_id: string }>(`/agents/${agentId}/messages`, body)
      .then((r) => r.data),

  // Errors / Nagah
  listErrors: () =>
    apiClient
      .get<{ errors: unknown[]; total: number }>("/errors")
      .then((r) => r.data),

  // Storage / Prthivi
  listWorkspaces: () =>
    apiClient.get<Workspace[]>("/storage/workspaces").then((r) => r.data),

  createWorkspace: (body: { name: string; path: string; description?: string }) =>
    apiClient.post<Workspace>("/storage/workspaces", body).then((r) => r.data),

  reindexWorkspace: (workspaceId: string) =>
    apiClient.post<Workspace>(`/storage/workspaces/${workspaceId}/reindex`).then((r) => r.data),

  getWorkspaceFiles: (workspaceId: string, path?: string) =>
    apiClient
      .get<WorkspaceFileList>(`/storage/workspaces/${workspaceId}/files`, {
        params: { ...(path ? { path } : {}) },
      })
      .then((r) => r.data),

  deleteWorkspace: (workspaceId: string) =>
    apiClient.delete(`/storage/workspaces/${workspaceId}`).then((r) => r.data),

  getStorageAnalytics: () =>
    apiClient.get<StorageAnalytics>("/storage/analytics").then((r) => r.data),

  // Event Streams / Apah
  listStreams: () =>
    apiClient.get<StreamListResponse>("/events/streams").then((r) => r.data),

  readStream: (streamName: string, limit?: number) =>
    apiClient
      .get<StreamEventsResponse>(`/events/streams/${streamName}`, {
        params: { ...(limit ? { limit } : {}) },
      })
      .then((r) => r.data),

  publishToStream: (body: { stream: string; data: Record<string, string> }) =>
    apiClient
      .post<{ id: string; stream: string }>("/events/publish", body)
      .then((r) => r.data),

  // Knowledge Graph / Naksatrani
  getKnowledgeGraph: () =>
    apiClient.get<GraphResponse>("/knowledge/graph").then((r) => r.data),

  syncAgentNodes: () =>
    apiClient.post<{ synced: number }>("/knowledge/sync").then((r) => r.data),

  createKnowledgeNode: (body: {
    entity_type: string;
    entity_id?: string;
    label: string;
    domain?: string;
    properties?: Record<string, unknown>;
  }) =>
    apiClient.post<KnowledgeNode>("/knowledge/nodes", body).then((r) => r.data),

  createKnowledgeEdge: (body: {
    from_node_id: string;
    to_node_id: string;
    relationship: string;
    weight?: number;
    properties?: Record<string, unknown>;
  }) =>
    apiClient.post<KnowledgeEdge>("/knowledge/edges", body).then((r) => r.data),

  searchKnowledgeNodes: (body: { query: string; limit?: number }) =>
    apiClient.post<KnowledgeNode[]>("/knowledge/search", body).then((r) => r.data),

  deleteKnowledgeNode: (nodeId: string) =>
    apiClient.delete(`/knowledge/nodes/${nodeId}`).then((r) => r.data),

  deleteKnowledgeEdge: (edgeId: string) =>
    apiClient.delete(`/knowledge/edges/${edgeId}`).then((r) => r.data),

  // RBAC / Aryamah
  listUsers: (role?: UserRole) =>
    apiClient.get<UserRoleRead[]>("/rbac/users", { params: { ...(role ? { role } : {}) } }).then((r) => r.data),

  updateUserRole: (userId: string, role: UserRole) =>
    apiClient.patch<UserRoleRead>(`/rbac/users/${userId}/role`, { role }).then((r) => r.data),

  getRoleStats: () =>
    apiClient.get<RoleStats>("/rbac/stats").then((r) => r.data),

  getMyRole: () =>
    apiClient.get<UserRoleRead>("/rbac/me").then((r) => r.data),

  // Policy Engine / Varunah
  listPolicies: (params?: { policy_type?: string; enabled_only?: boolean }) =>
    apiClient.get<Policy[]>("/policies", { params }).then((r) => r.data),

  createPolicy: (body: Omit<Policy, "id" | "created_at">) =>
    apiClient.post<Policy>("/policies", body).then((r) => r.data),

  updatePolicy: (policyId: string, body: Partial<Omit<Policy, "id" | "created_at">>) =>
    apiClient.patch<Policy>(`/policies/${policyId}`, body).then((r) => r.data),

  deletePolicy: (policyId: string) =>
    apiClient.delete(`/policies/${policyId}`).then((r) => r.data),

  checkPolicies: (params: { cost_usd?: number; token_count?: number; agent_id?: string; domain?: string }) =>
    apiClient.post<PolicyCheckResult>("/policies/check", null, { params }).then((r) => r.data),

  // Scheduler / Savita
  listSchedules: () =>
    apiClient.get<Schedule[]>("/schedules").then((r) => r.data),

  createSchedule: (body: Omit<Schedule, "id" | "last_run_at" | "next_run_at" | "created_at">) =>
    apiClient.post<Schedule>("/schedules", body).then((r) => r.data),

  enableSchedule: (scheduleId: string) =>
    apiClient.post<Schedule>(`/schedules/${scheduleId}/enable`).then((r) => r.data),

  disableSchedule: (scheduleId: string) =>
    apiClient.post<Schedule>(`/schedules/${scheduleId}/disable`).then((r) => r.data),

  triggerSchedule: (scheduleId: string) =>
    apiClient.post<TriggerResponse>(`/schedules/${scheduleId}/trigger`).then((r) => r.data),

  deleteSchedule: (scheduleId: string) =>
    apiClient.delete(`/schedules/${scheduleId}`).then((r) => r.data),

  // Cost Analytics / Bhagah
  getCostSummary: (domain?: string) =>
    apiClient.get<CostSummary>("/cost/summary", { params: { ...(domain ? { domain } : {}) } }).then((r) => r.data),

  getCostByAgent: (params?: { domain?: string; limit?: number }) =>
    apiClient.get<AgentCostEntry[]>("/cost/by-agent", { params }).then((r) => r.data),

  getCostBySession: (limit?: number) =>
    apiClient.get<SessionCostEntry[]>("/cost/by-session", { params: { ...(limit ? { limit } : {}) } }).then((r) => r.data),

  getCostTrend: (days?: number) =>
    apiClient.get<TrendEntry[]>("/cost/trend", { params: { ...(days ? { days } : {}) } }).then((r) => r.data),

  // Workflow Builder / Tvastah
  listWorkflowDefs: (params?: { status?: string; limit?: number; offset?: number }) =>
    apiClient.get<WorkflowDef[]>("/workflows/aditya", { params }).then((r) => r.data),

  getWorkflowDef: (workflowId: string) =>
    apiClient.get<WorkflowDef>(`/workflows/aditya/${workflowId}`).then((r) => r.data),

  createWorkflowDef: (body: { name: string; description?: string; definition: WorkflowDef["definition"] }) =>
    apiClient.post<WorkflowDef>("/workflows/aditya", body).then((r) => r.data),

  updateWorkflowDef: (workflowId: string, body: Partial<Pick<WorkflowDef, "name" | "description" | "definition" | "status">>) =>
    apiClient.patch<WorkflowDef>(`/workflows/aditya/${workflowId}`, body).then((r) => r.data),

  deleteWorkflowDef: (workflowId: string) =>
    apiClient.delete(`/workflows/aditya/${workflowId}`).then((r) => r.data),

  executeWorkflowDef: (workflowId: string) =>
    apiClient.post<ExecuteResponse>(`/workflows/aditya/${workflowId}/execute`).then((r) => r.data),

  // Goals / PRAJAPATI
  listGoals: (params?: { status?: string; priority?: number; limit?: number; offset?: number }) =>
    apiClient.get<Goal[]>("/goals", { params }).then((r) => r.data),

  getGoal: (goalId: string) =>
    apiClient.get<Goal>(`/goals/${goalId}`).then((r) => r.data),

  createGoal: (body: { title: string; description?: string; target_outcome: string; priority?: GoalPriority }) =>
    apiClient.post<Goal>("/goals", body).then((r) => r.data),

  updateGoal: (goalId: string, body: Partial<Pick<Goal, "title" | "description" | "target_outcome" | "priority" | "status">>) =>
    apiClient.patch<Goal>(`/goals/${goalId}`, body).then((r) => r.data),

  deleteGoal: (goalId: string) =>
    apiClient.delete(`/goals/${goalId}`).then((r) => r.data),

  decomposeGoal: (goalId: string) =>
    apiClient.post<DecomposeResponse>(`/goals/${goalId}/decompose`).then((r) => r.data),

  // Planning / PRAJAPATI
  listPlanTemplates: () =>
    apiClient.get<PlanTemplate[]>("/planning/templates").then((r) => r.data),

  generatePlan: (body: { template_id: string; goal_title: string; goal_description?: string; variables?: Record<string, string> }) =>
    apiClient.post<GeneratePlanResponse>("/planning/generate", body).then((r) => r.data),

  // Intelligence / PRAJAPATI
  getStrategyOverview: () =>
    apiClient.get<StrategyOverview>("/intelligence/overview").then((r) => r.data),

  getHealthReport: () =>
    apiClient.get<SystemHealthReport>("/intelligence/health").then((r) => r.data),

  // Optimization / PRAJAPATI
  getOptimizationRecommendations: () =>
    apiClient.get<OptimizationReport>("/optimization/recommendations").then((r) => r.data),
};
