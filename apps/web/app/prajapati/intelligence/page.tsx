"use client";

import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useStrategyOverview, useHealthReport } from "@/lib/api/hooks";

const PRAJAPATI = "#9a44d4";

const DOMAIN_COLORS: Record<string, string> = {
  indra: "#9a44d4",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

function fmt(n: number) {
  return `$${Number(n).toFixed(4)}`;
}

function fmtTokens(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
}

function HealthIcon({ status }: { status: string }) {
  if (status === "healthy" || status === "ok") return <CheckCircle size={14} className="text-green-400" />;
  if (status === "critical") return <XCircle size={14} className="text-red-400" />;
  return <AlertTriangle size={14} className="text-yellow-400" />;
}

export default function IntelligencePage() {
  const { data: overview, isLoading } = useStrategyOverview();
  const { data: health } = useHealthReport();

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="label-caps mb-1" style={{ color: PRAJAPATI }}>
          Intelligence · Cross-Domain Overview
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Strategic Command Center
        </h1>
      </div>

      {/* System health banner */}
      {health && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg border"
          style={
            health.overall_status === "healthy"
              ? { borderColor: "#2ab870", background: "#2ab87011" }
              : health.overall_status === "critical"
              ? { borderColor: "#c44450", background: "#c4445011" }
              : { borderColor: "#e0a030", background: "#e0a03011" }
          }
        >
          <HealthIcon status={health.overall_status} />
          <span
            className="font-semibold text-sm"
            style={
              health.overall_status === "healthy"
                ? { color: "#2ab870" }
                : health.overall_status === "critical"
                ? { color: "#c44450" }
                : { color: "#e0a030" }
            }
          >
            System {health.overall_status.toUpperCase()}
          </span>
          {health.recommendations.length > 0 && (
            <span className="text-xs text-ink-ghost ml-2">
              {health.recommendations[0]}
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-ink-ghost label-caps">Loading…</div>
      ) : overview ? (
        <>
          {/* Primary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Active Agents", value: overview.active_agents, total: overview.total_agents },
              { label: "Running Tasks", value: overview.running_tasks },
              { label: "Total Cost", value: fmt(overview.total_cost_usd) },
              { label: "Total Tokens", value: fmtTokens(overview.total_tokens) },
              { label: "Active Goals", value: overview.active_goals },
              { label: "Pending Goals", value: overview.pending_goals },
              { label: "Unread Alerts", value: overview.unread_alerts },
              { label: "Active Sessions", value: overview.total_sessions },
            ].map(({ label, value, total }) => (
              <div key={label} className="bg-surface-1 border border-hairline rounded-lg p-4">
                <p className="label-caps text-ink-ghost mb-1">{label}</p>
                <p className="text-2xl font-bold text-ink-primary">
                  {value}
                  {total !== undefined && (
                    <span className="text-sm font-normal text-ink-ghost ml-1">/{total}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Memory Chunks", value: overview.memory_chunks },
              { label: "Knowledge Nodes", value: overview.knowledge_nodes },
              { label: "Active Schedules", value: overview.active_schedules },
              { label: "Active Policies", value: overview.active_policies },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-1 border border-hairline rounded-lg p-3">
                <p className="label-caps text-ink-ghost mb-1">{label}</p>
                <p className="text-xl font-bold text-ink-primary">{value}</p>
              </div>
            ))}
          </div>

          {/* Domain health */}
          <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline">
              <Activity size={14} style={{ color: PRAJAPATI }} />
              <span className="label-caps text-ink-secondary">Domain Health</span>
            </div>
            <div className="grid grid-cols-5 divide-x divide-hairline">
              {overview.domain_health.map((d) => (
                <div key={d.domain} className="p-4 text-center space-y-1">
                  <div
                    className="w-2 h-2 rounded-full mx-auto"
                    style={{ background: DOMAIN_COLORS[d.domain] ?? "#637585" }}
                  />
                  <p className="label-caps text-ink-ghost">{d.domain.toUpperCase()}</p>
                  <p className="text-xl font-bold text-ink-primary">{d.active_count}</p>
                  <p className="text-xs text-ink-ghost">active</p>
                </div>
              ))}
            </div>
          </div>

          {/* Health checks */}
          {health && Object.keys(health.checks).length > 0 && (
            <div className="bg-surface-1 border border-hairline rounded-lg p-4 space-y-2">
              <p className="label-caps text-ink-ghost mb-3">Subsystem Checks</p>
              {Object.entries(health.checks).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <HealthIcon status={val} />
                  <span className="label-caps text-ink-secondary w-24">{key}</span>
                  <span className="text-xs text-ink-ghost">{val}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
