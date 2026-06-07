// ── Agent ──────────────────────────────────────────────────────────────────
export type AgentStatus = "idle" | "running" | "active" | "error" | "completed" | "dead";
export type AgentType = "claude_code" | "gemini_cli" | "codex_cli" | "opencode" | "kiro_cli" | "custom";
export type DomainId = "indra" | "vasu" | "rudra" | "aditya" | "prajapati";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  domain: DomainId;
  plugin_id: string | null;
  parent_id: string | null;
  session_id: string | null;
  token_count: number;
  cost_usd: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface AgentHierarchyNode extends Omit<Agent, "parent_id" | "session_id" | "plugin_id" | "token_count" | "cost_usd" | "started_at" | "finished_at" | "created_at"> {
  children: AgentHierarchyNode[];
}

// ── Session ────────────────────────────────────────────────────────────────
export type SessionStatus = "active" | "ended" | "error";

export interface Session {
  id: string;
  external_id: string | null;
  plugin_type: string;
  project_path: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

// ── Trace ──────────────────────────────────────────────────────────────────
export type TraceStatus = "running" | "ok" | "error" | "unset";

export interface Trace {
  id: string;
  trace_id: string;
  session_id: string | null;
  agent_id: string | null;
  name: string | null;
  duration_ms: number | null;
  status: TraceStatus | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  span_count?: number;
}

export interface TraceWithSpans extends Trace {
  spans: Span[];
}

export interface Span {
  id: string;
  span_id: string;
  trace_id: string;
  parent_span_id: string | null;
  name: string;
  kind: string | null;
  status: TraceStatus | null;
  duration_ms: number | null;
  attributes: Record<string, unknown>;
  events: unknown[];
  started_at: string | null;
  finished_at: string | null;
}

// ── MCP Server ────────────────────────────────────────────────────────────
export type MCPServerStatus = "healthy" | "degraded" | "unreachable" | "unknown";

export interface MCPServer {
  id: string;
  name: string;
  transport: "stdio" | "sse" | "http";
  endpoint: string | null;
  status: MCPServerStatus;
  latency_p50_ms: number | null;
  latency_p99_ms: number | null;
  tool_count: number;
  last_seen_at: string | null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardData {
  active_agents: number;
  active_sessions: number;
  running_tasks: number;
  connected_systems: string[];
  system_health: number;
  token_burn_rate: number;
  total_cost_today: number;
  active_traces: number;
  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  domain: DomainId;
  created_at: string;
}

// ── WebSocket Events ──────────────────────────────────────────────────────
export type WSEventType =
  | "agent.status_changed"
  | "session.created"
  | "session.ended"
  | "trace.completed"
  | "mcp_server.status_changed"
  | "alert.created";

export interface WSEvent<T = unknown> {
  event_type: WSEventType;
  domain: DomainId;
  data: T;
  timestamp: string;
}

// ── Task ──────────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type TaskPriority = 0 | 1 | 2;

export interface Task {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  agent_id: string | null;
  workflow_id: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface TaskStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}

// ── Memory / RAG ──────────────────────────────────────────────────────────

export interface MemoryChunk {
  id: string;
  content: string;
  has_embedding: boolean;
  agent_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MemorySearchResult extends MemoryChunk {
  similarity: number;
}

export interface MemoryStats {
  total_chunks: number;
  chunks_with_embedding: number;
  embedding_coverage_pct: number;
  embedding_enabled: boolean;
}

// ── Notifications / Devadattah ────────────────────────────────────────────

export type NotificationSeverity = "info" | "warning" | "critical";

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  domain: string;
  source_type: string | null;
  source_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationStats {
  total: number;
  unread: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread: number;
}

// ── Process / Dhananjayah ─────────────────────────────────────────────────

export interface ProcessInfo {
  pid: number;
  name: string;
  status: string;
  cpu_percent: number;
  memory_mb: number;
  agent_id: string | null;
  agent_name: string | null;
  started_at: string | null;
}

// ── Agent Identity / Jivatma ──────────────────────────────────────────────

export interface AgentProfile {
  id: string;
  name: string;
  type: string;
  status: string;
  domain: string;
  parent_id: string | null;
  session_id: string | null;
  token_count: number;
  cost_usd: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
  children_count: number;
}

export interface LineageAncestor {
  id: string;
  name: string;
  type: string;
  status: string;
  domain: string;
  depth: number;
}

export interface LineageChild {
  id: string;
  name: string;
  type: string;
  status: string;
  domain: string;
}

export interface LineageResponse {
  agent: AgentProfile;
  ancestors: LineageAncestor[];
  children: LineageChild[];
}

// ── Agent Messages / Vyanah ───────────────────────────────────────────────

export type MessageRole = "human" | "agent" | "system";

export interface AgentMessage {
  id: string;
  agent_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  timestamp_ms: number;
}

// ── API ───────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
  message: string;
  domain?: string;
}
