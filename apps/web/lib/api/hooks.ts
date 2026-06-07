import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { indraApi } from "./client";

// ── Query keys ─────────────────────────────────────────────────────────────

export const QK = {
  dashboard: ["dashboard"] as const,
  agents: (params?: object) => ["agents", params] as const,
  agentHierarchy: ["agents", "hierarchy"] as const,
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
