"use client";

import Link from "next/link";
import { useAgentHierarchy, useAgents, useDashboard, usePluginHealth, useTraces } from "@/lib/api/hooks";
import { MetricTile } from "@/components/metrics/MetricTile";
import { AgentObservatory } from "@/components/agents/AgentObservatory";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { ConnectedSystems } from "@/components/dashboard/ConnectedSystems";

function healthColor(pct: number): string {
  if (pct >= 90) return "var(--state-healthy)";
  if (pct >= 60) return "var(--state-degraded)";
  return "var(--state-critical)";
}

function HealthVital({ pct, loading }: { pct: number; loading: boolean }) {
  const color = healthColor(pct);
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end">
        <span className="label-caps text-ink-ghost">System Health</span>
        {loading ? (
          <div className="skeleton mt-1 h-6 w-14 rounded" />
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="font-mono text-xl font-bold tabular-nums leading-none" style={{ color }}>
              {pct}%
            </span>
          </span>
        )}
      </div>
      <span className="h-8 w-px bg-hairline" />
      <span className="flex items-center gap-1.5" title="Live — refreshing every 5s">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="live-ring absolute inset-0 rounded-full bg-accent" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        <span className="label-caps text-accent">Live</span>
      </span>
    </div>
  );
}

export default function CommandCenter() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: agentsData } = useAgents({ limit: 1 });
  const { data: hierarchy, isLoading: hierarchyLoading } = useAgentHierarchy();
  const { data: pluginHealth } = usePluginHealth();
  const { data: tracesData } = useTraces({ limit: 8 });

  const d = dashboard;
  const agentTotal = agentsData?.total ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* ── Command header + vitals ── */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps mb-1 text-accent">Command Layer · INDRA</p>
          <h1
            className="font-bold tracking-tight text-ink-primary"
            style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
          >
            Command Center
          </h1>
          <p className="mt-1 text-sm text-ink-tertiary">
            <span className="font-mono text-ink-secondary">इन्द्रः</span> — mission control for your AI
            civilization.
          </p>
        </div>
        <HealthVital pct={d?.system_health ?? 0} loading={dashLoading} />
      </header>

      {/* ── Vital metrics ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile
          label="Active Agents"
          value={dashLoading ? "—" : (d?.active_agents ?? 0)}
          domain="rudra"
          live
          loading={dashLoading}
          hint={`${agentTotal} total tracked`}
        />
        <MetricTile
          label="Active Sessions"
          value={dashLoading ? "—" : (d?.active_sessions ?? 0)}
          domain="indra"
          live
          loading={dashLoading}
          hint={`${d?.connected_systems.length ?? 0} systems connected`}
        />
        <MetricTile
          label="Running Tasks"
          value={dashLoading ? "—" : (d?.running_tasks ?? 0)}
          domain="vasu"
          loading={dashLoading}
          hint={`${d?.active_traces ?? 0} live traces`}
        />
        <MetricTile
          label="Token Burn"
          value={dashLoading ? "—" : (d?.token_burn_rate ?? 0).toLocaleString()}
          unit="tok"
          domain="aditya"
          loading={dashLoading}
        />
      </div>

      {/* ── Observatory + Alert feed ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="label-caps mb-2.5 text-ink-tertiary">Agent Observatory</h2>
          {hierarchyLoading ? (
            <div className="skeleton h-[300px] rounded-xl" />
          ) : (
            <AgentObservatory hierarchy={hierarchy ?? []} />
          )}
        </section>
        <div className="lg:col-span-1">
          <h2 className="label-caps mb-2.5 text-ink-tertiary">Signals</h2>
          <AlertFeed alerts={d?.alerts ?? []} loading={dashLoading} />
        </div>
      </div>

      {/* ── Connected systems + recent traces ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h2 className="label-caps mb-2.5 text-ink-tertiary">Infrastructure</h2>
          <ConnectedSystems
            pluginTypes={pluginHealth?.plugin_types ?? []}
            statuses={pluginHealth?.statuses ?? {}}
            costToday={d?.total_cost_today ?? 0}
            tokenBurn={d?.token_burn_rate ?? 0}
            loading={dashLoading}
          />
        </div>

        <section className="lg:col-span-2">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="label-caps" style={{ color: "#d4843a" }}>
              Recent Traces · Sūryaḥ
            </h2>
            <Link
              href="/vasu/suryah"
              className="font-mono text-xs text-ink-tertiary transition-colors hover:text-ink-secondary"
            >
              View all →
            </Link>
          </div>

          <div
            className="overflow-hidden rounded-xl border border-hairline bg-surface-1"
            style={{ borderTop: "2px solid #d4843a" }}
          >
            {!tracesData || tracesData.traces.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-ink-ghost">
                  No traces yet — agent executions appear here as Vivarta spans.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-hairline bg-surface-2 px-4 py-2">
                  <span className="w-1.5 shrink-0" />
                  <span className="label-caps text-ink-ghost" style={{ width: "72px" }}>
                    ID
                  </span>
                  <span className="label-caps flex-1 text-ink-ghost">Name</span>
                  <span className="label-caps text-ink-ghost">Spans</span>
                  <span className="label-caps w-14 text-right text-ink-ghost">Duration</span>
                </div>
                {tracesData.traces.map((trace) => {
                  const statusColor =
                    trace.status === "ok"
                      ? "#2ab870"
                      : trace.status === "error"
                        ? "#e04040"
                        : trace.status === "running"
                          ? "#4dc8c8"
                          : "#637585";
                  return (
                    <div
                      key={trace.id}
                      className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      <span className="font-mono text-ink-ghost" style={{ fontSize: "10px", width: "72px" }}>
                        {trace.trace_id.slice(0, 8)}…
                      </span>
                      <span className="flex-1 truncate text-xs text-ink-secondary">
                        {trace.name ?? "Unnamed trace"}
                      </span>
                      <span className="font-mono text-ink-ghost tabular-nums" style={{ fontSize: "11px" }}>
                        {trace.span_count ?? 0}
                      </span>
                      <span
                        className="font-mono tabular-nums text-ink-tertiary"
                        style={{ fontSize: "11px", width: "56px", textAlign: "right" }}
                      >
                        {trace.duration_ms != null
                          ? trace.duration_ms < 1000
                            ? `${trace.duration_ms}ms`
                            : `${(trace.duration_ms / 1000).toFixed(2)}s`
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
