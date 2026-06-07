"use client";

import { useAgentHierarchy, useAgents, useDashboard, usePluginHealth } from "@/lib/api/hooks";
import { MetricTile } from "@/components/metrics/MetricTile";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentObservatory } from "@/components/agents/AgentObservatory";

export default function WorkforceDashboard() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: agentsData, isLoading: agentsLoading } = useAgents({ limit: 20 });
  const { data: hierarchy, isLoading: hierarchyLoading } = useAgentHierarchy();
  const { data: pluginHealth } = usePluginHealth();

  const healthPct = dashboard?.system_health ?? 0;
  const healthColor =
    healthPct >= 90 ? "text-healthy" : healthPct >= 60 ? "text-degraded" : "text-critical";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="label-caps mb-1">Command Layer · INDRA</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
          Workforce Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Mission control for your AI civilization
        </p>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile
          label="Active Agents"
          value={dashLoading ? "—" : (dashboard?.active_agents ?? 0)}
          domain="rudra"
          loading={dashLoading}
        />
        <MetricTile
          label="Active Sessions"
          value={dashLoading ? "—" : (dashboard?.active_sessions ?? 0)}
          domain="indra"
          loading={dashLoading}
        />
        <MetricTile
          label="Token Burn"
          value={dashLoading ? "—" : (dashboard?.token_burn_rate ?? 0).toLocaleString()}
          unit="tok"
          domain="vasu"
          loading={dashLoading}
        />
        <MetricTile
          label="System Health"
          value={dashLoading ? "—" : `${healthPct}%`}
          domain="aditya"
          loading={dashLoading}
          className={healthColor}
        />
      </div>

      {/* Plugin status banner */}
      {pluginHealth && pluginHealth.plugin_types.length > 0 && (
        <div className="flex items-center gap-3 text-xs font-mono text-ink-tertiary">
          <span className="label-caps">Connected:</span>
          {pluginHealth.plugin_types.map((pt) => {
            const status = pluginHealth.statuses[pt] ?? "unknown";
            const color =
              status === "healthy"
                ? "#2ab870"
                : status === "degraded"
                ? "#e0a030"
                : "#e04040";
            return (
              <span key={pt} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {pt}
              </span>
            );
          })}
          <span className="ml-auto">
            Cost today: ${(dashboard?.total_cost_today ?? 0).toFixed(4)}
          </span>
        </div>
      )}

      {/* Agent Observatory */}
      <section>
        <h2 className="text-sm font-semibold text-ink-secondary mb-3 label-caps">
          Agent Observatory
        </h2>
        {hierarchyLoading ? (
          <div className="h-[400px] rounded border border-hairline bg-canvas animate-pulse" />
        ) : (
          <AgentObservatory hierarchy={hierarchy ?? []} />
        )}
      </section>

      {/* Agent list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink-secondary label-caps">
            Active Agents
          </h2>
          <span className="text-xs text-ink-tertiary font-mono">
            {agentsData?.total ?? 0} total
          </span>
        </div>

        {agentsLoading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded bg-surface-2 animate-pulse border border-hairline"
              />
            ))}
          </div>
        ) : agentsData && agentsData.agents.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {agentsData.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-hairline border-dashed p-8 text-center">
            <p className="text-sm text-ink-tertiary">
              No agents found. Start a Claude Code session — it will appear here automatically.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
