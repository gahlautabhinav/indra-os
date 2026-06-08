"use client";

import { useMemo, useState } from "react";
import type { AgentHierarchyNode } from "@indra/types";
import { DOMAIN_COLORS } from "@indra/design-tokens";
import { GitBranch, Telescope } from "lucide-react";

// ── Status + plugin vocab ─────────────────────────────────────────────────────

const STATUS_META: Record<string, { color: string; label: string; live?: boolean }> = {
  active: { color: "#2ab870", label: "Active", live: true },
  running: { color: "#4dc8c8", label: "Running", live: true },
  idle: { color: "#4080a0", label: "Idle" },
  error: { color: "#e04040", label: "Error" },
  completed: { color: "#637585", label: "Completed" },
  dead: { color: "#3d5060", label: "Dead" },
};

// Lane display order (most operationally relevant first).
const STATUS_ORDER = ["active", "running", "idle", "error", "completed", "dead"];

const PLUGIN_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  gemini_cli: "Gemini CLI",
  codex_cli: "Codex CLI",
  opencode: "OpenCode",
  kiro_cli: "Kiro",
  antigravity: "Antigravity",
  custom: "Custom",
};

interface FlatAgent {
  id: string;
  name: string;
  type: string;
  status: string;
  domain: string;
  childCount: number;
  hasParent: boolean;
}

function flatten(nodes: AgentHierarchyNode[], hasParent = false, out: FlatAgent[] = []): FlatAgent[] {
  for (const n of nodes) {
    out.push({
      id: n.id,
      name: n.name,
      type: n.type,
      status: n.status,
      domain: n.domain,
      childCount: n.children.length,
      hasParent,
    });
    if (n.children.length) flatten(n.children, true, out);
  }
  return out;
}

// ── Tile ──────────────────────────────────────────────────────────────────────

function AgentTile({ agent, index }: { agent: FlatAgent; index: number }) {
  const domainColor = DOMAIN_COLORS[agent.domain as keyof typeof DOMAIN_COLORS] ?? "#4dc8c8";
  const meta = STATUS_META[agent.status] ?? { color: "#637585", label: agent.status };
  // Shorten the "plugin · project" name to just the leaf for the title line.
  const display = agent.name.includes(" · ") ? agent.name.split(" · ").slice(1).join(" · ") : agent.name;

  return (
    <div
      className="agent-tile group relative flex flex-col gap-1.5 rounded-lg border border-hairline bg-surface-2 p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-hairline-bright hover:bg-surface-3"
      style={{
        borderLeft: `2px solid ${domainColor}`,
        animation: `agentRise 240ms ease both`,
        animationDelay: `${Math.min(index, 24) * 18}ms`,
      }}
      title={agent.name}
    >
      <div className="flex items-center gap-2">
        <span
          className={meta.live ? "agent-dot-live" : ""}
          style={{
            display: "inline-block",
            height: 8,
            width: 8,
            borderRadius: 9999,
            background: meta.color,
            flexShrink: 0,
            // @ts-expect-error CSS custom property
            "--glow": `${meta.color}88`,
            animation: meta.live ? "agentGlow 1.8s ease-in-out infinite" : undefined,
          }}
        />
        <span className="truncate text-[12px] font-medium text-ink-primary">{display}</span>
        {agent.childCount > 0 && (
          <span
            className="ml-auto inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-mono text-ink-tertiary"
            style={{ background: `${domainColor}1a`, color: domainColor }}
            title={`${agent.childCount} sub-agents`}
          >
            <GitBranch className="h-2.5 w-2.5" />
            {agent.childCount}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-ink-tertiary">
          {PLUGIN_LABELS[agent.type] ?? agent.type}
        </span>
        <span
          className="font-mono text-[9px] uppercase tracking-wider"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
    </div>
  );
}

// ── Observatory ────────────────────────────────────────────────────────────────

interface AgentObservatoryProps {
  hierarchy: AgentHierarchyNode[];
  className?: string;
}

export function AgentObservatory({ hierarchy, className = "" }: AgentObservatoryProps) {
  const agents = useMemo(() => flatten(hierarchy), [hierarchy]);
  const [filter, setFilter] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of agents) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [agents]);

  // Lanes present in the data, in priority order.
  const lanes = STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0);
  const visibleLanes = filter ? lanes.filter((s) => s === filter) : lanes;

  if (agents.length === 0) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline bg-surface-1 ${className}`}
        style={{ minHeight: 260 }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-surface-2 text-accent">
          <Telescope className="h-5 w-5" />
        </div>
        <p className="text-sm text-ink-secondary">The observatory is quiet</p>
        <p className="max-w-xs text-center text-xs text-ink-ghost">
          Start a Claude Code, Gemini, Codex, or Kiro session — agents appear here live as they spin up.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-hairline bg-surface-1 ${className}`}
    >
      {/* faint constellation grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Stat / filter bar */}
      <div className="relative flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-md px-2.5 py-1 text-xs font-mono transition-colors ${
            filter === null ? "bg-surface-3 text-ink-primary" : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          All {agents.length}
        </button>
        {lanes.map((s) => {
          const meta = STATUS_META[s]!;
          const on = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(on ? null : s)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition-colors ${
                on ? "bg-surface-3 text-ink-primary" : "text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label} {counts[s]}
            </button>
          );
        })}
      </div>

      {/* Lanes */}
      <div className="relative max-h-[440px] overflow-y-auto p-4">
        <div className="flex flex-col gap-5">
          {visibleLanes.map((s) => {
            const meta = STATUS_META[s]!;
            const laneAgents = agents.filter((a) => a.status === s);
            return (
              <div key={s}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                  <span className="label-caps" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="font-mono text-[10px] text-ink-ghost">{laneAgents.length}</span>
                  <span className="ml-2 h-px flex-1 bg-hairline" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {laneAgents.map((a, i) => (
                    <AgentTile key={a.id} agent={a} index={i} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
