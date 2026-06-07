"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, BarChart2, Layers } from "lucide-react";
import { useCostSummary, useCostByAgent, useCostBySession, useCostTrend } from "@/lib/api/hooks";

const ADITYA = "#3a80d4";

type Tab = "summary" | "agents" | "sessions" | "trend";

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
  const { data: byAgent } = useCostByAgent();
  const { data: bySession } = useCostBySession();
  const { data: trend } = useCostTrend(days);

  const tabs: Array<{ id: Tab; label: string; icon: typeof DollarSign }> = [
    { id: "summary", label: "Summary", icon: DollarSign },
    { id: "agents", label: "By Agent", icon: Layers },
    { id: "sessions", label: "By Session", icon: BarChart2 },
    { id: "trend", label: "Trend", icon: TrendingUp },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="label-caps mb-1" style={{ color: ADITYA }}>
          Bhagah · Cost Analytics
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Resource Economics
        </h1>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Cost", value: fmt(summary.total_cost_usd) },
            { label: "Total Tokens", value: fmtTokens(summary.total_tokens) },
            { label: "Agents", value: String(summary.agent_count) },
            { label: "Avg/Agent", value: fmt(summary.avg_cost_per_agent) },
            { label: "Avg Tokens", value: fmtTokens(summary.avg_tokens_per_agent) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-1 border border-hairline rounded-lg p-4">
              <p className="label-caps text-ink-ghost mb-1">{label}</p>
              <p className="text-xl font-bold text-ink-primary">{value}</p>
            </div>
          ))}
        </div>
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
        <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
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
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: ADITYA }}>{fmt(a.cost_usd)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-secondary">{fmtTokens(a.token_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "sessions" && (
        <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
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
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-primary">{s.session_id.slice(0, 8)}…</td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: ADITYA }}>{fmt(s.cost_usd)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-secondary">{fmtTokens(s.token_count)}</td>
                  <td className="px-4 py-2.5 text-ink-ghost text-xs">{s.agent_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "trend" && (
        <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
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
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-primary">{t.period}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: ADITYA }}>{fmt(t.cost_usd)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-secondary">{fmtTokens(t.token_count)}</td>
                  <td className="px-4 py-2.5 text-ink-ghost text-xs">{t.agent_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "summary" && (
        <div className="bg-surface-1 border border-hairline rounded-lg p-8 text-center text-ink-ghost">
          <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
          <p className="label-caps">Select a tab above to drill into cost breakdowns</p>
        </div>
      )}
    </div>
  );
}
