"use client";

import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useStrategyOverview, useHealthReport } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { MetricTile } from "@/components/metrics/MetricTile";
import { SkeletonTiles } from "@/components/common/Skeleton";

const PRAJAPATI = "#9a44d4";

const DOMAIN_COLORS: Record<string, string> = {
  indra: "#4dc8c8",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

const STATUS_COLOR: Record<string, string> = {
  healthy: "var(--state-healthy)",
  ok: "var(--state-healthy)",
  degraded: "var(--state-degraded)",
  critical: "var(--state-critical)",
};

function fmtCost(n: number) {
  return `$${Number(n).toFixed(4)}`;
}
function fmtTokens(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
}

function HealthIcon({ status }: { status: string }) {
  if (status === "healthy" || status === "ok")
    return <CheckCircle size={14} style={{ color: "var(--state-healthy)" }} />;
  if (status === "critical") return <XCircle size={14} style={{ color: "var(--state-critical)" }} />;
  return <AlertTriangle size={14} style={{ color: "var(--state-degraded)" }} />;
}

export default function IntelligencePage() {
  const { data: overview, isLoading } = useStrategyOverview();
  const { data: health } = useHealthReport();

  const banner =
    health && (STATUS_COLOR[health.overall_status] ?? "var(--state-degraded)");

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={PRAJAPATI}
        deva="Intelligence"
        role="Strategy"
        title="Strategic Command Center"
        sanskrit="प्रज्ञा"
        description="cross-domain overview of the civilization."
      />

      {/* System health banner */}
      {health && (
        <div
          className="flex items-center gap-3 rounded-lg border px-4 py-3"
          style={{ borderColor: `${banner}`, background: `color-mix(in oklab, ${banner} 8%, transparent)` }}
        >
          <HealthIcon status={health.overall_status} />
          <span className="text-sm font-semibold" style={{ color: banner }}>
            System {health.overall_status.toUpperCase()}
          </span>
          {health.recommendations.length > 0 && (
            <span className="ml-2 truncate text-xs text-ink-tertiary">{health.recommendations[0]}</span>
          )}
        </div>
      )}

      {isLoading ? (
        <SkeletonTiles count={4} />
      ) : overview ? (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricTile
              label="Active Agents"
              value={overview.active_agents}
              domain="prajapati"
              hint={`${overview.total_agents} total`}
            />
            <MetricTile label="Running Tasks" value={overview.running_tasks} domain="rudra" />
            <MetricTile label="Total Cost" value={fmtCost(overview.total_cost_usd)} domain="aditya" />
            <MetricTile label="Total Tokens" value={fmtTokens(overview.total_tokens)} domain="vasu" />
          </div>

          {/* Secondary signals */}
          <div className="flex flex-wrap gap-3">
            <StatTile accent={PRAJAPATI} label="Active Goals" value={overview.active_goals} />
            <StatTile accent={PRAJAPATI} label="Pending Goals" value={overview.pending_goals} />
            <StatTile accent="#4dc8c8" label="Active Sessions" value={overview.total_sessions} />
            <StatTile accent="#e0a030" label="Unread Alerts" value={overview.unread_alerts} />
            <StatTile accent="#3a80d4" label="Memory Chunks" value={overview.memory_chunks} />
            <StatTile accent="#d4843a" label="Knowledge Nodes" value={overview.knowledge_nodes} />
            <StatTile accent="#3a80d4" label="Schedules" value={overview.active_schedules} />
            <StatTile accent="#3a80d4" label="Policies" value={overview.active_policies} />
          </div>

          {/* Domain health */}
          <section
            className="overflow-hidden rounded-xl border border-hairline bg-surface-1"
            style={{ borderTop: `2px solid ${PRAJAPATI}` }}
          >
            <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
              <Activity size={13} style={{ color: PRAJAPATI }} />
              <span className="label-caps text-ink-tertiary">Domain Health</span>
            </div>
            <div className="grid grid-cols-5 divide-x divide-hairline">
              {overview.domain_health.map((d) => (
                <div key={d.domain} className="space-y-1 p-4 text-center">
                  <span
                    className="mx-auto block h-2 w-2 rounded-full"
                    style={{ background: DOMAIN_COLORS[d.domain] ?? "#637585" }}
                  />
                  <p className="label-caps text-ink-ghost">{d.domain}</p>
                  <p className="font-mono text-xl font-bold tabular-nums text-ink-primary">{d.active_count}</p>
                  <p className="text-[10px] text-ink-ghost">active</p>
                </div>
              ))}
            </div>
          </section>

          {/* Subsystem checks */}
          {health && Object.keys(health.checks).length > 0 && (
            <section
              className="overflow-hidden rounded-xl border border-hairline bg-surface-1"
              style={{ borderTop: `2px solid ${PRAJAPATI}` }}
            >
              <div className="border-b border-hairline px-4 py-2.5">
                <span className="label-caps text-ink-tertiary">Subsystem Checks</span>
              </div>
              <div className="divide-y divide-hairline">
                {Object.entries(health.checks).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                    <HealthIcon status={val} />
                    <span className="text-[13px] text-ink-secondary">{key}</span>
                    <span className="ml-auto font-mono text-[11px] text-ink-tertiary">{val}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
