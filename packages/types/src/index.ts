// ── Agent ──────────────────────────────────────────────────────────────────
export type AgentStatus = "idle" | "running" | "active" | "error" | "completed" | "dead";
export type AgentType = "claude_code" | "gemini_cli" | "codex_cli" | "opencode" | "kiro_cli" | "antigravity" | "custom";
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

// ── Session conversation timeline / Somah detail ───────────────────────────
export type SessionEventType =
  | "user_message"
  | "assistant_message"
  | "tool_call"
  | "tool_result";

export interface SessionEventItem {
  id: string;
  event_type: SessionEventType | string;
  content: string | null;
  timestamp: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface SessionEventsResponse {
  deva?: string;
  session_id: string;
  external_id: string | null;
  plugin_type: string;
  project_path: string | null;
  status: string;
  token_count?: number;
  cost_usd?: number;
  events: SessionEventItem[];
  total: number;
  available: boolean;
  truncated?: boolean;
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

// ── Errors / Nagah ─────────────────────────────────────────────────────────

export interface RuntimeError {
  id: string;
  type: string;
  title: string;
  severity: "critical" | "warning" | "info";
  source_type: string;
  source_id: string;
  domain: string;
  created_at: string;
  error: string | null;
}

// ── Checkpoints / Kurmah ───────────────────────────────────────────────────

export interface Checkpoint {
  id: string;
  agent_id: string;
  label: string | null;
  created_at: string;
  state?: Record<string, unknown>;
}

// ── Coordination / Samanah ─────────────────────────────────────────────────

export interface CoordinationTask {
  id: string;
  name?: string;
  agent_id: string | null;
  status: string;
  created_at?: string;
}

// ── Escalations / Udanah ───────────────────────────────────────────────────

export interface Escalation {
  id: string;
  reason: string;
  agent_id: string | null;
  priority: string;
  status: string;
  created_at?: string;
}

// ── Phase-8 devas, now live (VASU/ADITYA computed endpoints) ───────────────

export interface ExecutionRun {
  id: string;
  name: string;
  status: string;
  agent_id: string | null;
  agent_name: string | null;
  duration_ms: number | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}
export interface ExecutionRunsResponse {
  deva: string;
  runs: ExecutionRun[];
  total: number;
}
export interface ExecutionStats {
  deva: string;
  total: number;
  running: number;
  completed: number;
  failed: number;
  pending: number;
  avg_duration_ms: number;
}

export interface ContextWindow {
  session_id: string;
  plugin_type: string;
  project_path: string | null;
  tokens_used: number;
  context_window: number;
  used_pct: number;
  pressure: "healthy" | "moderate" | "high" | "critical";
  status: string;
}
export interface ContextWindowsResponse {
  deva: string;
  windows: ContextWindow[];
  total: number;
  aggregate_used: number;
  aggregate_capacity: number;
  aggregate_pct: number;
}

export interface Channel {
  channel_id: string;
  plugin_type: string;
  project_path: string | null;
  participants: number;
  status: string;
  last_activity: string | null;
}
export interface ChannelsResponse {
  deva: string;
  channels: Channel[];
  total: number;
}
export interface CommunicationOverview {
  deva: string;
  active_channels: number;
  total_channels: number;
  participants: number;
  channels_by_protocol: Record<string, number>;
}

export interface ShareEntry {
  domain: string;
  agents: number;
  tokens: number;
  cost_usd: number;
  token_share_pct: number;
  cost_share_pct: number;
}
export interface ShareAllocation {
  deva: string;
  shares: ShareEntry[];
  total_tokens: number;
  total_cost_usd: number;
}

export interface FoundationEntity {
  entity: string;
  rows: number;
}
export interface FoundationsOverview {
  deva: string;
  entities: FoundationEntity[];
  total_rows: number;
  schema_version: string | null;
  devas: number;
  domains: number;
  infrastructure: { database: string; schema_version: string | null };
}

export interface Alliance {
  type: string;
  source_id: string;
  source_name: string;
  target_id: string;
  target_name: string;
  domain: string;
}
export interface AlliancesResponse {
  deva: string;
  alliances: Alliance[];
  total: number;
  linked_agents: number;
}

export interface DiscoveryResource {
  type?: string;
  name?: string;
  kind: string;
  status: string;
  transport?: string;
}
export interface DiscoveryRegistry {
  deva: string;
  plugins: DiscoveryResource[];
  mcp_servers: DiscoveryResource[];
  counts: {
    plugins: number;
    mcp_servers: number;
    active_agents: number;
    reachable_total: number;
  };
}

export interface DomainReach {
  domain: string;
  agents: number;
  active_agents: number;
  reach_pct: number;
}
export interface PervasionOverview {
  deva: string;
  reach: DomainReach[];
  domains_reached: number;
  domains_total: number;
  pervasion_pct: number;
  total_agents: number;
  active_agents: number;
  total_sessions: number;
}

export interface TelemetryMetrics {
  deva: string;
  host: {
    cpu_percent: number;
    cpu_count: number;
    memory_percent: number;
    memory_used_gb: number;
    memory_total_gb: number;
    process_count: number;
  };
  workload: {
    total_tokens: number;
    total_cost_usd: number;
    active_sessions: number;
    total_traces: number;
  };
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

// ── Storage / Prthivi ────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  path: string;
  description: string | null;
  status: "active" | "inactive" | "error";
  file_count: number;
  size_bytes: number;
  last_indexed_at: string | null;
  created_at: string;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified_at: string;
}

export interface WorkspaceFileList {
  workspace_id: string;
  path: string;
  entries: WorkspaceFile[];
  total: number;
}

export interface StorageAnalytics {
  total_workspaces: number;
  active_workspaces: number;
  total_files: number;
  total_size_bytes: number;
  total_size_human: string;
}

// ── Event Streams / Apah ─────────────────────────────────────────────────

export interface StreamEvent {
  id: string;
  stream: string;
  data: Record<string, string>;
  timestamp_ms: number;
}

export interface StreamInfo {
  name: string;
  length: number;
}

export interface StreamListResponse {
  streams: StreamInfo[];
  total: number;
}

export interface StreamEventsResponse {
  stream: string;
  events: StreamEvent[];
  total: number;
}

// ── Knowledge Graph / Naksatrani ─────────────────────────────────────────

export interface KnowledgeNode {
  id: string;
  entity_type: string;
  entity_id: string | null;
  label: string;
  domain: string;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface KnowledgeEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relationship: string;
  weight: number;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface GraphResponse {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  node_count: number;
  edge_count: number;
}

// ── RBAC / Aryamah ───────────────────────────────────────────────────────

export type UserRole = "viewer" | "user" | "admin";

export interface UserRoleRead {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export interface RoleStats {
  viewer: number;
  user: number;
  admin: number;
  total: number;
}

// ── Policy Engine / Varunah ───────────────────────────────────────────────

export type PolicyType = "cost_limit" | "token_limit" | "tool_block" | "rate_limit";
export type PolicyTargetType = "global" | "agent" | "session" | "domain";

export interface Policy {
  id: string;
  name: string;
  description: string | null;
  policy_type: PolicyType;
  target_type: PolicyTargetType;
  target_id: string | null;
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  violations: Array<{ policy_id: string; policy_name: string; reason: string }>;
}

// ── Scheduler / Savita ────────────────────────────────────────────────────

export type TriggerType = "interval" | "cron" | "once";
export type ActionType = "notify" | "spawn_agent";

export interface Schedule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

export interface TriggerResponse {
  schedule_id: string;
  triggered_at: string;
  action_type: string;
}

// ── Cost Analytics / Bhagah ───────────────────────────────────────────────

export interface CostSummary {
  total_cost_usd: number;
  total_tokens: number;
  agent_count: number;
  avg_cost_per_agent: number;
  avg_tokens_per_agent: number;
}

export interface AgentCostEntry {
  agent_id: string;
  agent_name: string;
  domain: string;
  cost_usd: number;
  token_count: number;
  status: string;
  created_at: string;
}

export interface SessionCostEntry {
  session_id: string;
  cost_usd: number;
  token_count: number;
  agent_count: number;
}

export interface TrendEntry {
  period: string;
  cost_usd: number;
  token_count: number;
  agent_count: number;
}

// ── Workflow Builder / Tvastah ────────────────────────────────────────────

export type WorkflowStatus = "draft" | "active" | "archived";

export interface WorkflowDef {
  id: string;
  name: string;
  description: string | null;
  definition: { steps: WorkflowStep[] };
  status: WorkflowStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  type: "notify" | "create_task" | string;
  config: Record<string, unknown>;
}

export interface ExecuteResponse {
  workflow_id: string;
  steps_executed: number;
  results: Array<{ step_id: string; type: string; status: string; id?: string; error?: string; reason?: string }>;
}

// ── PRAJAPATI Strategy Layer ──────────────────────────────────────────────

export type GoalPriority = 0 | 1 | 2 | 3;
export type GoalStatus = "pending" | "planning" | "active" | "completed" | "failed";

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_outcome: string;
  priority: GoalPriority;
  status: GoalStatus;
  definition: { steps: GoalStep[] };
  progress_pct: number;
  agent_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface GoalStep {
  id: string;
  type: "task" | "agent" | "notify" | string;
  title: string;
  config: Record<string, unknown>;
}

export interface DecomposeResponse {
  goal_id: string;
  steps_created: number;
  task_ids: string[];
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  category: "research" | "build" | "ops" | "monitor" | string;
  steps: GoalStep[];
}

export interface GeneratePlanResponse {
  goal_title: string;
  template_id: string;
  definition: { steps: GoalStep[] };
  recommended_agents: number;
  estimated_tasks: number;
}

export interface DomainHealth {
  domain: string;
  status: string;
  active_count: number;
  notes: string;
}

export interface StrategyOverview {
  total_agents: number;
  active_agents: number;
  total_sessions: number;
  running_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_cost_usd: number;
  total_tokens: number;
  active_goals: number;
  pending_goals: number;
  unread_alerts: number;
  memory_chunks: number;
  knowledge_nodes: number;
  active_schedules: number;
  active_policies: number;
  domain_health: DomainHealth[];
}

export interface SystemHealthReport {
  overall_status: "healthy" | "degraded" | "critical";
  checks: Record<string, string>;
  recommendations: string[];
}

export interface Recommendation {
  id: string;
  category: "cost" | "performance" | "reliability" | "governance" | string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  action: string;
  affected_domain: string;
  estimated_savings: string | null;
}

export interface OptimizationReport {
  total_recommendations: number;
  critical: number;
  warnings: number;
  info: number;
  recommendations: Recommendation[];
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
