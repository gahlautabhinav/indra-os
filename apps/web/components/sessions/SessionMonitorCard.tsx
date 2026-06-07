"use client";

import type { Session } from "@indra/types";

const STATUS_COLORS: Record<string, string> = {
  active: "#2ab870",
  ended: "#637585",
  error: "#e04040",
};

const PLUGIN_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  gemini_cli: "Gemini CLI",
  codex_cli: "Codex CLI",
  opencode: "OpenCode",
  kiro_cli: "Kiro",
};

function formatDuration(startedAt: string, endedAt?: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const ms = end - start;
  const min = Math.floor(ms / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  if (min >= 60) {
    const h = Math.floor(min / 60);
    return `${h}h ${min % 60}m`;
  }
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

interface SessionMonitorCardProps {
  session: Session;
  onClick?: (session: Session) => void;
}

export function SessionMonitorCard({ session, onClick }: SessionMonitorCardProps) {
  const statusColor = STATUS_COLORS[session.status] ?? "#637585";
  const pluginLabel = PLUGIN_LABELS[session.plugin_type] ?? session.plugin_type;
  const meta = session.metadata as Record<string, unknown>;
  const tokenCount = (meta?.token_count as number) ?? 0;
  const costUsd = (meta?.cost_usd as number) ?? 0;
  const eventCount = (meta?.event_count as number) ?? 0;

  const projectName = session.project_path
    ? session.project_path.split(/[\\/]/).pop() ?? session.project_path
    : "Unknown project";

  return (
    <button
      type="button"
      onClick={() => onClick?.(session)}
      className="domain-panel w-full text-left p-3 bg-surface-2 hover:bg-surface-3 transition-colors"
      data-domain="rudra"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{
            backgroundColor: statusColor,
            boxShadow: session.status === "active" ? `0 0 5px ${statusColor}` : undefined,
          }}
        />
        <span className="text-xs font-mono text-ink-secondary">{pluginLabel}</span>
        <span className="ml-auto text-xs font-mono text-ink-tertiary">
          {formatDuration(session.started_at, session.ended_at)}
        </span>
      </div>

      {/* Project path */}
      <p className="text-sm text-ink-primary font-medium truncate mb-2" title={session.project_path ?? ""}>
        {projectName}
      </p>

      {/* Metrics row */}
      <div className="flex items-center gap-3 text-xs font-mono text-ink-tertiary">
        <span>{eventCount} turns</span>
        <span>{tokenCount >= 1000 ? `${(tokenCount / 1000).toFixed(1)}k` : tokenCount} tok</span>
        <span className="ml-auto">
          {costUsd >= 0.01 ? `$${costUsd.toFixed(2)}` : `$${costUsd.toFixed(4)}`}
        </span>
      </div>
    </button>
  );
}
