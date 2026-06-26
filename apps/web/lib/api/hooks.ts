import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { indraApi } from "./client";

// ── Query keys ─────────────────────────────────────────────────────────────

export const QK = {
  dashboard: ["dashboard"] as const,
  agents: (params?: object) => ["agents", params] as const,
  agentHierarchy: ["agents", "hierarchy"] as const,
  agentProfile: (id: string) => ["agents", id, "profile"] as const,
  agentLineage: (id: string) => ["agents", id, "lineage"] as const,
  agentMessages: (id: string) => ["agents", id, "messages"] as const,
  sessions: (params?: object) => ["sessions", params] as const,
  mcpServers: ["mcp", "servers"] as const,
  pluginHealth: ["plugins", "health"] as const,
  traces: (params?: object) => ["traces", params] as const,
  trace: (id: string) => ["traces", id] as const,
  traceStats: ["traces", "stats"] as const,
  memoryChunks: (params?: object) => ["memory", "chunks", params] as const,
  memoryStats: ["memory", "stats"] as const,
  vaults: ["vaults", "list"] as const,
  vaultProjects: ["vaults", "projects"] as const,
  vaultNotes: (id: string, params?: object) => ["vaults", id, "notes", params] as const,
  vaultNote: (id: string, name: string) => ["vaults", id, "note", name] as const,
  vaultGraph: (id: string) => ["vaults", id, "graph"] as const,
  vaultsCombinedGraph: ["vaults", "combined-graph"] as const,
  projects: ["projects"] as const,
  indexRuns: ["projects", "runs"] as const,
  tasks: (params?: object) => ["tasks", params] as const,
  taskStats: ["tasks", "stats"] as const,
  notifications: (params?: object) => ["notifications", params] as const,
  notificationStats: ["notifications", "stats"] as const,
  processes: (params?: object) => ["processes", params] as const,
  errors: ["errors"] as const,
  // VASU infra
  workspaces: ["storage", "workspaces"] as const,
  workspaceFiles: (id: string, path?: string) => ["storage", "files", id, path] as const,
  storageAnalytics: ["storage", "analytics"] as const,
  streams: ["events", "streams"] as const,
  streamEvents: (name: string) => ["events", "stream", name] as const,
  knowledgeGraph: ["knowledge", "graph"] as const,
  // ADITYA governance
  rbacUsers: (role?: string) => ["rbac", "users", role] as const,
  rbacStats: ["rbac", "stats"] as const,
  rbacMe: ["rbac", "me"] as const,
  policies: (params?: object) => ["policies", params] as const,
  schedules: ["schedules"] as const,
  costSummary: (domain?: string) => ["cost", "summary", domain] as const,
  costByAgent: (params?: object) => ["cost", "by-agent", params] as const,
  costBySession: ["cost", "by-session"] as const,
  costTrend: (days?: number) => ["cost", "trend", days] as const,
  workflowDefs: (params?: object) => ["workflows", "aditya", params] as const,
  workflowDef: (id: string) => ["workflows", "aditya", id] as const,
  // PRAJAPATI
  goals: (params?: object) => ["goals", params] as const,
  goal: (id: string) => ["goals", id] as const,
  planTemplates: ["planning", "templates"] as const,
  strategyOverview: ["intelligence", "overview"] as const,
  healthReport: ["intelligence", "health"] as const,
  optimizationRecs: ["optimization", "recommendations"] as const,
} as const;

// ── Dashboard ─────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: QK.dashboard,
    queryFn: indraApi.getDashboard,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

// ── Agents ────────────────────────────────────────────────────────────────

export function useAgents(params?: Parameters<typeof indraApi.listAgents>[0]) {
  return useQuery({
    queryKey: QK.agents(params),
    queryFn: () => indraApi.listAgents(params),
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

export function useAgentHierarchy() {
  return useQuery({
    queryKey: QK.agentHierarchy,
    queryFn: indraApi.getAgentHierarchy,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

// ── Sessions ──────────────────────────────────────────────────────────────

export function useSessions(
  params?: Parameters<typeof indraApi.listSessions>[0]
) {
  return useQuery({
    queryKey: QK.sessions(params),
    queryFn: () => indraApi.listSessions(params),
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

export function useSessionEvents(sessionId: string | null, limit = 4000) {
  return useQuery({
    queryKey: ["sessions", sessionId, "events", limit],
    queryFn: () => indraApi.getSessionEvents(sessionId!, limit),
    enabled: !!sessionId,
    refetchInterval: 8_000,
    staleTime: 6_000,
  });
}

// ── MCP ───────────────────────────────────────────────────────────────────

export function useMCPServers() {
  return useQuery({
    queryKey: QK.mcpServers,
    queryFn: indraApi.listMCPServers,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

// ── Plugins ───────────────────────────────────────────────────────────────

export function usePluginHealth() {
  return useQuery({
    queryKey: QK.pluginHealth,
    queryFn: indraApi.getPluginHealth,
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

export function useSyncPlugins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.syncPlugins,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.agents() });
      void qc.invalidateQueries({ queryKey: QK.sessions() });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ── Traces ────────────────────────────────────────────────────────────────

export function useTraces(params?: Parameters<typeof indraApi.listTraces>[0]) {
  return useQuery({
    queryKey: QK.traces(params),
    queryFn: () => indraApi.listTraces(params),
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

export function useTrace(traceId: string | null) {
  return useQuery({
    queryKey: QK.trace(traceId ?? ""),
    queryFn: () => indraApi.getTrace(traceId!),
    enabled: !!traceId,
    staleTime: 30_000,
  });
}

export function useTraceStats() {
  return useQuery({
    queryKey: QK.traceStats,
    queryFn: indraApi.getTraceStats,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

// ── Memory / RAG ──────────────────────────────────────────────────────────────

export function useMemoryChunks(
  params?: Parameters<typeof indraApi.listMemoryChunks>[0]
) {
  return useQuery({
    queryKey: QK.memoryChunks(params),
    queryFn: () => indraApi.listMemoryChunks(params),
    staleTime: 10_000,
  });
}

export function useMemoryStats() {
  return useQuery({
    queryKey: QK.memoryStats,
    queryFn: indraApi.getMemoryStats,
    refetchInterval: 30_000,
    staleTime: 29_000,
  });
}

export function useIngestMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.ingestMemoryChunk,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

export function useSearchMemory() {
  return useMutation({
    mutationFn: indraApi.searchMemory,
  });
}

export function useDeleteMemoryChunk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deleteMemoryChunk,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

// ── Tasks / Pranah ────────────────────────────────────────────────────────────

export function useTasks(params?: Parameters<typeof indraApi.listTasks>[0]) {
  return useQuery({
    queryKey: QK.tasks(params),
    queryFn: () => indraApi.listTasks(params),
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: QK.taskStats,
    queryFn: indraApi.getTaskStats,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createTask,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: QK.dashboard });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; output?: Record<string, unknown>; error?: string }) =>
      indraApi.updateTask(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCancelTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.cancelTask,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useSpawnAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.spawnAgent,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.agents() });
      void qc.invalidateQueries({ queryKey: QK.dashboard });
    },
  });
}

// ── Jivatma — Agent Identity ──────────────────────────────────────────────────

export function useAgentProfile(agentId: string | null) {
  return useQuery({
    queryKey: QK.agentProfile(agentId ?? ""),
    queryFn: () => indraApi.getAgentProfile(agentId!),
    enabled: !!agentId,
    staleTime: 10_000,
  });
}

export function useAgentLineage(agentId: string | null) {
  return useQuery({
    queryKey: QK.agentLineage(agentId ?? ""),
    queryFn: () => indraApi.getAgentLineage(agentId!),
    enabled: !!agentId,
    staleTime: 10_000,
  });
}

// ── Vyanah — Agent Messages ───────────────────────────────────────────────────

export function useAgentMessages(agentId: string | null) {
  return useQuery({
    queryKey: QK.agentMessages(agentId ?? ""),
    queryFn: () => indraApi.listAgentMessages(agentId!),
    enabled: !!agentId,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

export function usePublishMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      agentId,
      ...body
    }: { agentId: string; role?: string; content: string; metadata?: Record<string, unknown> }) =>
      indraApi.publishAgentMessage(agentId, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: QK.agentMessages(vars.agentId) });
    },
  });
}

// ── Devadattah — Notifications ────────────────────────────────────────────────

export function useNotifications(params?: { limit?: number; unread_only?: boolean }) {
  return useQuery({
    queryKey: QK.notifications(params),
    queryFn: () => indraApi.listNotifications(params),
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: QK.notificationStats,
    queryFn: indraApi.getNotificationStats,
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.markNotificationRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.markAllNotificationsRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deleteNotification,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ── Dhananjayah — Processes ───────────────────────────────────────────────────

export function useProcesses(params?: { all_processes?: boolean; limit?: number }) {
  return useQuery({
    queryKey: QK.processes(params),
    queryFn: () => indraApi.listProcesses(params),
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

// ── Nagah — Errors ────────────────────────────────────────────────────────────

export function useErrors() {
  return useQuery({
    queryKey: QK.errors,
    queryFn: indraApi.listErrors,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

export function useAcknowledgeError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.acknowledgeError,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.errors });
    },
  });
}

// ── Apanah — Cleanup ──────────────────────────────────────────────────────────

export function useCleanupAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.cleanupAgent,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.agents() });
    },
  });
}

// ── Krkalah — Recovery ────────────────────────────────────────────────────────

export function useRecoveryStatus() {
  return useQuery({
    queryKey: ["recovery", "status"],
    queryFn: indraApi.getRecoveryStatus,
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

export function useRecoverAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.recoverAgent,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["recovery", "status"] });
      void qc.invalidateQueries({ queryKey: QK.agents() });
    },
  });
}

// ── Kurmah — Checkpoints ──────────────────────────────────────────────────────

export function useCheckpoints() {
  return useQuery({
    queryKey: ["checkpoints"],
    queryFn: indraApi.listCheckpoints,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

export function useCreateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createCheckpoint,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["checkpoints"] });
    },
  });
}

// ── Samanah — Coordination ────────────────────────────────────────────────────

export function useCoordinationTasks() {
  return useQuery({
    queryKey: ["coordination", "tasks"],
    queryFn: indraApi.listCoordinationTasks,
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

export function useAssignCoordinationTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.assignCoordinationTask,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["coordination", "tasks"] });
    },
  });
}

// ── Udanah — Escalations ──────────────────────────────────────────────────────

export function useEscalations() {
  return useQuery({
    queryKey: ["escalations"],
    queryFn: indraApi.listEscalations,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

export function useCreateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createEscalation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["escalations"] });
    },
  });
}

// ── Prthivi — Storage & Workspaces ────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery({
    queryKey: QK.workspaces,
    queryFn: indraApi.listWorkspaces,
    refetchInterval: 30_000,
    staleTime: 29_000,
  });
}

export function useWorkspaceFiles(workspaceId: string | null, path?: string) {
  return useQuery({
    queryKey: QK.workspaceFiles(workspaceId ?? "", path),
    queryFn: () => indraApi.getWorkspaceFiles(workspaceId!, path),
    enabled: !!workspaceId,
    staleTime: 15_000,
  });
}

export function useStorageAnalytics() {
  return useQuery({
    queryKey: QK.storageAnalytics,
    queryFn: indraApi.getStorageAnalytics,
    refetchInterval: 60_000,
    staleTime: 59_000,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createWorkspace,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.workspaces });
      void qc.invalidateQueries({ queryKey: QK.storageAnalytics });
    },
  });
}

export function useReindexWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.reindexWorkspace,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.workspaces });
      void qc.invalidateQueries({ queryKey: QK.storageAnalytics });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deleteWorkspace,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.workspaces });
      void qc.invalidateQueries({ queryKey: QK.storageAnalytics });
    },
  });
}

// ── Apah — Event Streams ──────────────────────────────────────────────────────

export function useStreams() {
  return useQuery({
    queryKey: QK.streams,
    queryFn: indraApi.listStreams,
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

export function useStreamEvents(streamName: string | null, limit?: number) {
  return useQuery({
    queryKey: QK.streamEvents(streamName ?? ""),
    queryFn: () => indraApi.readStream(streamName!, limit),
    enabled: !!streamName,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

export function usePublishToStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.publishToStream,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: QK.streamEvents(vars.stream) });
    },
  });
}

// ── Naksatrani — Knowledge Graph ──────────────────────────────────────────────

export function useKnowledgeGraph() {
  return useQuery({
    queryKey: QK.knowledgeGraph,
    queryFn: indraApi.getKnowledgeGraph,
    refetchInterval: 30_000,
    staleTime: 29_000,
  });
}

export function useSyncAgentNodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.syncAgentNodes,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.knowledgeGraph });
    },
  });
}

export function useCreateKnowledgeNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createKnowledgeNode,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.knowledgeGraph });
    },
  });
}

export function useCreateKnowledgeEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createKnowledgeEdge,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.knowledgeGraph });
    },
  });
}

export function useDeleteKnowledgeNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deleteKnowledgeNode,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.knowledgeGraph });
    },
  });
}

export function useDeleteKnowledgeEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deleteKnowledgeEdge,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.knowledgeGraph });
    },
  });
}

export function useSearchKnowledgeNodes() {
  return useMutation({
    mutationFn: indraApi.searchKnowledgeNodes,
  });
}

// ── Aryamah — RBAC ───────────────────────────────────────────────────────────

export function useRbacUsers(role?: string) {
  return useQuery({
    queryKey: QK.rbacUsers(role),
    queryFn: () => indraApi.listUsers(role as Parameters<typeof indraApi.listUsers>[0]),
    staleTime: 15_000,
  });
}

export function useRbacStats() {
  return useQuery({
    queryKey: QK.rbacStats,
    queryFn: indraApi.getRoleStats,
    staleTime: 15_000,
  });
}

export function useMyRole() {
  return useQuery({
    queryKey: QK.rbacMe,
    queryFn: indraApi.getMyRole,
    staleTime: 60_000,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Parameters<typeof indraApi.updateUserRole>[1] }) =>
      indraApi.updateUserRole(userId, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rbac"] });
    },
  });
}

// ── Varunah — Policy Engine ───────────────────────────────────────────────────

export function usePolicies(params?: Parameters<typeof indraApi.listPolicies>[0]) {
  return useQuery({
    queryKey: QK.policies(params),
    queryFn: () => indraApi.listPolicies(params),
    staleTime: 15_000,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createPolicy,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["policies"] });
    },
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, body }: { policyId: string; body: Parameters<typeof indraApi.updatePolicy>[1] }) =>
      indraApi.updatePolicy(policyId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["policies"] });
    },
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deletePolicy,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["policies"] });
    },
  });
}

export function useCheckPolicies() {
  return useMutation({
    mutationFn: indraApi.checkPolicies,
  });
}

// ── Savita — Scheduler ────────────────────────────────────────────────────────

export function useSchedules() {
  return useQuery({
    queryKey: QK.schedules,
    queryFn: indraApi.listSchedules,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createSchedule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.schedules });
    },
  });
}

export function useToggleSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, enabled }: { scheduleId: string; enabled: boolean }) =>
      enabled ? indraApi.enableSchedule(scheduleId) : indraApi.disableSchedule(scheduleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.schedules });
    },
  });
}

export function useTriggerSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.triggerSchedule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.schedules });
    },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deleteSchedule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.schedules });
    },
  });
}

// ── Bhagah — Cost Analytics ───────────────────────────────────────────────────

export function useCostSummary(domain?: string) {
  return useQuery({
    queryKey: QK.costSummary(domain),
    queryFn: () => indraApi.getCostSummary(domain),
    staleTime: 30_000,
  });
}

export function useCostByAgent(params?: Parameters<typeof indraApi.getCostByAgent>[0]) {
  return useQuery({
    queryKey: QK.costByAgent(params),
    queryFn: () => indraApi.getCostByAgent(params),
    staleTime: 30_000,
  });
}

export function useCostBySession() {
  return useQuery({
    queryKey: QK.costBySession,
    queryFn: () => indraApi.getCostBySession(),
    staleTime: 30_000,
  });
}

export function useCostTrend(days?: number) {
  return useQuery({
    queryKey: QK.costTrend(days),
    queryFn: () => indraApi.getCostTrend(days),
    staleTime: 30_000,
  });
}

// ── Tvastah — Workflow Builder ────────────────────────────────────────────────

export function useWorkflowDefs(params?: Parameters<typeof indraApi.listWorkflowDefs>[0]) {
  return useQuery({
    queryKey: QK.workflowDefs(params),
    queryFn: () => indraApi.listWorkflowDefs(params),
    staleTime: 15_000,
  });
}

export function useWorkflowDef(workflowId: string) {
  return useQuery({
    queryKey: QK.workflowDef(workflowId),
    queryFn: () => indraApi.getWorkflowDef(workflowId),
    staleTime: 15_000,
    enabled: !!workflowId,
  });
}

export function useCreateWorkflowDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createWorkflowDef,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workflows", "aditya"] });
    },
  });
}

export function useUpdateWorkflowDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workflowId, body }: { workflowId: string; body: Parameters<typeof indraApi.updateWorkflowDef>[1] }) =>
      indraApi.updateWorkflowDef(workflowId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workflows", "aditya"] });
    },
  });
}

export function useDeleteWorkflowDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deleteWorkflowDef,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workflows", "aditya"] });
    },
  });
}

export function useExecuteWorkflowDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.executeWorkflowDef,
    onSuccess: (_data, workflowId) => {
      void qc.invalidateQueries({ queryKey: QK.workflowDef(workflowId) });
    },
  });
}

// ── PRAJAPATI — Goals ─────────────────────────────────────────────────────────

export function useGoals(params?: Parameters<typeof indraApi.listGoals>[0]) {
  return useQuery({
    queryKey: QK.goals(params),
    queryFn: () => indraApi.listGoals(params),
    staleTime: 10_000,
  });
}

export function useGoal(goalId: string) {
  return useQuery({
    queryKey: QK.goal(goalId),
    queryFn: () => indraApi.getGoal(goalId),
    staleTime: 10_000,
    enabled: !!goalId,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.createGoal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, body }: { goalId: string; body: Parameters<typeof indraApi.updateGoal>[1] }) =>
      indraApi.updateGoal(goalId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.deleteGoal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useDecomposeGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.decomposeGoal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

// ── PRAJAPATI — Planning ──────────────────────────────────────────────────────

export function usePlanTemplates() {
  return useQuery({
    queryKey: QK.planTemplates,
    queryFn: indraApi.listPlanTemplates,
    staleTime: 300_000,
  });
}

export function useGeneratePlan() {
  return useMutation({
    mutationFn: indraApi.generatePlan,
  });
}

// ── PRAJAPATI — Intelligence ──────────────────────────────────────────────────

export function useStrategyOverview() {
  return useQuery({
    queryKey: QK.strategyOverview,
    queryFn: indraApi.getStrategyOverview,
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

export function useHealthReport() {
  return useQuery({
    queryKey: QK.healthReport,
    queryFn: indraApi.getHealthReport,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

// ── PRAJAPATI — Optimization ──────────────────────────────────────────────────

export function useOptimizationRecommendations() {
  return useQuery({
    queryKey: QK.optimizationRecs,
    queryFn: indraApi.getOptimizationRecommendations,
    refetchInterval: 30_000,
    staleTime: 29_000,
  });
}

// ── Agnih — Execution (VASU) ──────────────────────────────────────────────────

export function useExecutionRuns(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ["execution", "runs", params],
    queryFn: () => indraApi.listExecutionRuns(params),
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

export function useExecutionStats() {
  return useQuery({
    queryKey: ["execution", "stats"],
    queryFn: indraApi.getExecutionStats,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

// ── Akasah — Context (VASU) ───────────────────────────────────────────────────

export function useContextWindows(params?: { active_only?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ["context", "windows", params],
    queryFn: () => indraApi.listContextWindows(params),
    refetchInterval: 8_000,
    staleTime: 7_000,
  });
}

// ── Vayuh — Communication (VASU) ──────────────────────────────────────────────

export function useChannels(params?: { active_only?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ["communication", "channels", params],
    queryFn: () => indraApi.listChannels(params),
    refetchInterval: 8_000,
    staleTime: 7_000,
  });
}

export function useCommunicationOverview() {
  return useQuery({
    queryKey: ["communication", "overview"],
    queryFn: indraApi.getCommunicationOverview,
    refetchInterval: 8_000,
    staleTime: 7_000,
  });
}

// ── Amshah — Shares (ADITYA) ──────────────────────────────────────────────────

export function useShareAllocation() {
  return useQuery({
    queryKey: ["shares", "allocation"],
    queryFn: indraApi.getShareAllocation,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

// ── Dhata — Foundations (ADITYA) ──────────────────────────────────────────────

export function useFoundations() {
  return useQuery({
    queryKey: ["foundations"],
    queryFn: indraApi.getFoundations,
    refetchInterval: 30_000,
    staleTime: 29_000,
  });
}

// ── Mitrah — Alliances (ADITYA) ───────────────────────────────────────────────

export function useAlliances(params?: { limit?: number }) {
  return useQuery({
    queryKey: ["alliances", params],
    queryFn: () => indraApi.listAlliances(params),
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

// ── Pushanah — Discovery (ADITYA) ─────────────────────────────────────────────

export function useDiscoveryRegistry() {
  return useQuery({
    queryKey: ["discovery", "registry"],
    queryFn: indraApi.getDiscoveryRegistry,
    refetchInterval: 15_000,
    staleTime: 14_000,
  });
}

export function useClaudeEnv() {
  return useQuery({
    queryKey: ["discovery", "claude"],
    queryFn: indraApi.getClaudeEnv,
    refetchInterval: 30_000,
    staleTime: 29_000,
  });
}

// ── Vaults / Second Brain (Smriti) ──

export function useVaults() {
  return useQuery({
    queryKey: QK.vaults,
    queryFn: indraApi.getVaults,
    refetchInterval: 30_000,
    staleTime: 29_000,
  });
}

export function useVaultProjects() {
  return useQuery({
    queryKey: QK.vaultProjects,
    queryFn: indraApi.getVaultProjects,
    refetchInterval: 30_000,
    staleTime: 29_000,
  });
}

export function useVaultNotes(id: string | null, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: QK.vaultNotes(id ?? "", params),
    queryFn: () => indraApi.getVaultNotes(id as string, params),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useVaultNote(id: string | null, name: string | null) {
  return useQuery({
    queryKey: QK.vaultNote(id ?? "", name ?? ""),
    queryFn: () => indraApi.getVaultNote(id as string, name as string),
    enabled: !!id && !!name,
    staleTime: 60_000,
  });
}

export function useVaultGraph(id: string | null) {
  return useQuery({
    queryKey: QK.vaultGraph(id ?? ""),
    queryFn: () => indraApi.getVaultGraph(id as string),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useVaultsCombinedGraph() {
  return useQuery({
    queryKey: QK.vaultsCombinedGraph,
    queryFn: () => indraApi.getVaultsCombinedGraph(),
    refetchInterval: 60_000,
    staleTime: 59_000,
  });
}

// ── Projects / Tvasta auto-index ──

export function useProjects() {
  return useQuery({
    queryKey: QK.projects,
    queryFn: indraApi.getProjects,
    refetchInterval: 10_000,
  });
}

export function useIndexRuns() {
  return useQuery({
    queryKey: QK.indexRuns,
    queryFn: () => indraApi.getIndexRuns(20),
    refetchInterval: 4_000, // watch runs progress through the worker
  });
}

export function useDiscoverProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: indraApi.discoverProjects,
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.projects }),
  });
}

export function useSetProjectEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      indraApi.setProjectEnabled(id, enabled),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.projects }),
  });
}

export function useReindexProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode = "fast" }: { id: string; mode?: "fast" | "semantic" }) =>
      indraApi.reindexProject(id, mode),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.projects });
      void qc.invalidateQueries({ queryKey: QK.indexRuns });
    },
  });
}

export function useKgQuery() {
  return useMutation({
    mutationFn: ({ id, query, mode = "mix" }: { id: string; query: string; mode?: string }) =>
      indraApi.kgQuery(id, query, mode),
  });
}

export function useKgGraph(id: string | null) {
  return useQuery({
    queryKey: ["projects", id, "kg-graph"],
    queryFn: () => indraApi.getKgGraph(id as string),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ── Vishnuh — Pervasion (ADITYA) ──────────────────────────────────────────────

export function usePervasionOverview() {
  return useQuery({
    queryKey: ["pervasion", "overview"],
    queryFn: indraApi.getPervasionOverview,
    refetchInterval: 10_000,
    staleTime: 9_000,
  });
}

// ── Vivasvat — Telemetry (ADITYA) ─────────────────────────────────────────────

export function useTelemetryMetrics() {
  return useQuery({
    queryKey: ["telemetry", "metrics"],
    queryFn: indraApi.getTelemetryMetrics,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}
