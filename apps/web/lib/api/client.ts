import axios, { type AxiosInstance } from "axios";
import type {
  Agent,
  AgentHierarchyNode,
  DashboardData,
  MCPServer,
  PaginatedResponse,
  Session,
  Trace,
  TraceWithSpans,
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
};
