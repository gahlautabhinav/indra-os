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
