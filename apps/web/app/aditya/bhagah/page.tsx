"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { DollarSign, TrendingUp, BarChart2, Layers, type LucideIcon } from "lucide-react";
import { useCostSummary, useCostByAgent, useCostBySession, useCostTrend } from "@/lib/api/hooks";
import { DevaPageHeader } from "@/components/common/DevaScaffold";
import { MetricTile } from "@/components/metrics/MetricTile";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonRows, SkeletonTiles } from "@/components/common/Skeleton";

const ADITYA = "#3a80d4";

type Tab = "summary" | "agents" | "sessions" | "trend";

/** Bordered cost-table panel with domain top-strip, skeleton + teaching empty. */
function CostPanel({
  loading,
  count,
  emptyIcon: Icon,
  emptyTitle,
  emptyBody,
  children,
}: {
  loading: boolean;
  count: number;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyBody: string;
  children: ReactNode;
}) {
  return (
    <div
      className="bg-surface-1 border border-hairline rounded-lg overflow-hidden"
      style={{ borderTop: "2px solid #3a80d4" }}
    >
      {loading ? (
        <div className="p-4">
          <SkeletonRows rows={5} height={40} />
        </div>
      ) : count === 0 ? (
        <EmptyState icon={Icon} title={emptyTitle} body={emptyBody} accent={ADITYA} />
      ) : (
        children
      )}
    </div>
  );
}

function fmt(n: number) {
  return `$${Number(n).toFixed(4)}`;
}

function fmtTokens(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : String(n);
}

export default function BhagahPage() {
  const [tab, setTab] = useState<Tab>("summary");
  const [days, setDays] = useState(30);

  const { data: summary } = useCostSummary();
  const { data: byAgent, isLoading: agentsLoading } = useCostByAgent();
  const { data: bySession, isLoading: sessionsLoading } = useCostBySession();
  const { data: trend, isLoading: trendLoading } = useCostTrend(days);

  const tabs: Array<{ id: Tab; label: string; icon: typeof DollarSign }> = [
    { id: "summary", label: "Summary", icon: DollarSign },
    { id: "agents", label: "By Agent", icon: Layers },
    { id: "sessions", label: "By Session", icon: BarChart2 },
    { id: "trend", label: "Trend", icon: TrendingUp },
  ];

  return (
    <div className="p-6 space-y-5">
      <DevaPageHeader
        accent={ADITYA}
        deva="Bhagah"
        role="Resource & Cost"
        title="Cost"
        sanskrit="भगः"
        description="resource economics — where tokens and dollars go across the civilization."
      />

      {/* Summary strip */}
      {summary ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Cost", value: fmt(summary.total_cost_usd) },
            { label: "Total Tokens", value: fmtTokens(summary.total_tokens) },
            { label: "Agents", value: String(summary.agent_count) },
            { label: "Avg/Agent", value: fmt(summary.avg_cost_per_agent) },
            { label: "Avg Tokens", value: fmtTokens(summary.avg_tokens_per_agent) },
          ].map(({ label, value }) => (
            <MetricTile key={label} label={label} value={value} domain="aditya" />
          ))}
        </div>
      ) : (
        <SkeletonTiles count={5} className="grid grid-cols-2 md:grid-cols-5 gap-3" />
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-hairline">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2"
            style={
              tab === id
                ? { borderColor: ADITYA, color: ADITYA }
                : { borderColor: "transparent", color: "#637585" }
            }
            onClick={() => setTab(id)}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
        {tab === "trend" && (
          <div className="ml-auto flex items-center gap-2 pb-1">
            <span className="label-caps text-ink-ghost">Days:</span>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                style={
                  days === d
                    ? { background: `${ADITYA}33`, color: ADITYA }
                    : { color: "#637585" }
                }
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab content */}
      {tab === "agents" && (
        <CostPanel
          loading={agentsLoading}
          count={(byAgent ?? []).length}
          emptyIcon={Layers}
          emptyTitle="No agent costs yet"
          emptyBody="Once agents run and burn tokens, their per-agent cost breakdown shows up here."
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {["Agent", "Domain", "Status", "Cost", "Tokens"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 label-caps text-ink-ghost">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(byAgent ?? []).map((a) => (
                <tr key={a.agent_id} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-primary">{a.agent_name}</td>
                  <td className="px-4 py-2.5 text-ink-ghost text-xs">{a.domain}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-surface-2 text-ink-secondary">{a.status}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-xs" style={{ color: ADITYA }}>{fmt(a.cost_usd)}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-xs text-ink-secondary">{fmtTokens(a.token_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CostPanel>
      )}

      {tab === "sessions" && (
        <CostPanel
          loading={sessionsLoading}
          count={(bySession ?? []).length}
          emptyIcon={BarChart2}
          emptyTitle="No session costs yet"
          emptyBody="Cost grouped by session appears here once sessions start spending tokens."
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {["Session ID", "Cost", "Tokens", "Agents"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 label-caps text-ink-ghost">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(bySession ?? []).map((s) => (
                <tr key={s.session_id} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-2.5 font-mono tabular-nums text-xs text-ink-primary">{s.session_id.slice(0, 8)}…</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-xs" style={{ color: ADITYA }}>{fmt(s.cost_usd)}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-xs text-ink-secondary">{fmtTokens(s.token_count)}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-ink-ghost text-xs">{s.agent_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CostPanel>
      )}

      {tab === "trend" && (
        <CostPanel
          loading={trendLoading}
          count={(trend ?? []).length}
          emptyIcon={TrendingUp}
          emptyTitle="No trend data yet"
          emptyBody="Daily cost and token trends appear here as usage accumulates over time."
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {["Date", "Cost", "Tokens", "Agents"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 label-caps text-ink-ghost">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(trend ?? []).map((t) => (
                <tr key={t.period} className="border-b border-hairline last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-2.5 font-mono tabular-nums text-xs text-ink-primary">{t.period}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-xs" style={{ color: ADITYA }}>{fmt(t.cost_usd)}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-xs text-ink-secondary">{fmtTokens(t.token_count)}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-ink-ghost text-xs">{t.agent_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CostPanel>
      )}

      {tab === "summary" && (
        <div
          className="bg-surface-1 border border-hairline rounded-lg"
          style={{ borderTop: "2px solid #3a80d4" }}
        >
          <EmptyState
            icon={DollarSign}
            title="Pick a breakdown"
            body="Select By Agent, By Session, or Trend above to drill into where cost and tokens are going."
            accent={ADITYA}
          />
        </div>
      )}
    </div>
  );
}
