"use client";

import type { MCPServer } from "@indra/types";

const STATUS_CONFIG: Record<
  string,
  { color: string; label: string; pulse: boolean }
> = {
  healthy: { color: "#2ab870", label: "Healthy", pulse: false },
  degraded: { color: "#e0a030", label: "Degraded", pulse: true },
  unreachable: { color: "#e04040", label: "Unreachable", pulse: false },
  unknown: { color: "#637585", label: "Unknown", pulse: false },
};

const TRANSPORT_ICONS: Record<string, string> = {
  stdio: "⬡",
  sse: "⟳",
  http: "⬡",
};

interface MCPServerTileProps {
  server: MCPServer;
}

export function MCPServerTile({ server }: MCPServerTileProps) {
  const cfg = STATUS_CONFIG[server.status] ?? STATUS_CONFIG.unknown!;

  return (
    <div
      className="domain-panel p-3 bg-surface-2 flex flex-col gap-2"
      data-domain="vasu"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.pulse ? "animate-pulse" : ""}`}
          style={{ backgroundColor: cfg.color }}
          aria-hidden
        />
        <span className="text-xs font-mono text-ink-secondary flex-1 truncate">
          {TRANSPORT_ICONS[server.transport] ?? "○"}{" "}
          {server.transport.toUpperCase()}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-mono"
          style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Server name */}
      <p className="text-sm font-medium text-ink-primary truncate" title={server.name}>
        {server.name}
      </p>

      {/* Metrics */}
      <div className="flex items-center gap-3 text-xs font-mono text-ink-tertiary">
        {server.tool_count > 0 && (
          <span>{server.tool_count} tools</span>
        )}
        {server.latency_p50_ms !== null && server.latency_p50_ms !== undefined && (
          <span>{server.latency_p50_ms}ms p50</span>
        )}
        {server.endpoint && (
          <span className="truncate" title={server.endpoint}>
            {server.endpoint}
          </span>
        )}
      </div>
    </div>
  );
}
