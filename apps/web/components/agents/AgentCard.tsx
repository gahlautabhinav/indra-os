"use client";

import type { Agent } from "@indra/types";
import { DOMAIN_COLORS } from "@indra/design-tokens";

const STATUS_COLORS: Record<string, string> = {
  idle: "#4080a0",
  running: "#4dc8c8",
  active: "#2ab870",
  error: "#e04040",
  completed: "#637585",
  dead: "#3d5060",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  running: "Running",
  active: "Active",
  error: "Error",
  completed: "Done",
  dead: "Dead",
};

const PLUGIN_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  gemini_cli: "Gemini CLI",
  codex_cli: "Codex CLI",
  opencode: "OpenCode",
  kiro_cli: "Kiro",
  antigravity: "Antigravity",
  custom: "Custom",
};

interface AgentCardProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
  selected?: boolean;
}

export function AgentCard({ agent, onClick, selected = false }: AgentCardProps) {
  const domainColor =
    DOMAIN_COLORS[agent.domain as keyof typeof DOMAIN_COLORS] ?? "#4dc8c8";
  const statusColor = STATUS_COLORS[agent.status] ?? "#637585";

  const costDisplay =
    agent.cost_usd >= 0.01
      ? `$${agent.cost_usd.toFixed(2)}`
      : `$${agent.cost_usd.toFixed(4)}`;
  const tokenDisplay =
    agent.token_count >= 1000
      ? `${(agent.token_count / 1000).toFixed(1)}k`
      : String(agent.token_count);

  return (
    <button
      type="button"
      onClick={() => onClick?.(agent)}
      className={[
        "domain-panel w-full text-left p-3 transition-all duration-150",
        "hover:bg-surface-3 focus-visible:outline focus-visible:outline-2",
        selected ? "bg-surface-3 ring-1" : "bg-surface-2",
      ].join(" ")}
      data-domain={agent.domain}
      style={selected ? { boxShadow: `0 0 0 1px ${domainColor}40` } : undefined}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {/* Status dot */}
        <span
          className="inline-block h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusColor }}
          aria-hidden
        />
        <span className="text-xs font-mono text-ink-secondary truncate flex-1">
          {PLUGIN_LABELS[agent.type] ?? agent.type}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-mono"
          style={{
            backgroundColor: `${statusColor}20`,
            color: statusColor,
          }}
        >
          {STATUS_LABELS[agent.status] ?? agent.status}
        </span>
      </div>

      {/* Name */}
      <p
        className="text-sm font-medium text-ink-primary truncate mb-2"
        title={agent.name}
      >
        {agent.name}
      </p>

      {/* Domain stripe + metrics */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-mono uppercase tracking-widest"
          style={{ color: domainColor }}
        >
          {agent.domain}
        </span>
        <div className="flex items-center gap-3 text-xs font-mono text-ink-tertiary">
          <span>{tokenDisplay} tok</span>
          <span>{costDisplay}</span>
        </div>
      </div>
    </button>
  );
}
