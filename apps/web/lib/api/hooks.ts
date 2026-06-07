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
