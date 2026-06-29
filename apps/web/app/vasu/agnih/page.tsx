"use client";

import { Flame } from "lucide-react";
import { useExecutionRuns, useExecutionStats } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, VASU } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const STATUS_COLOR: Record<string, string> = {
  running: "#4dc8c8",
  completed: "#2ab870",
  failed: "#e04040",
  pending: "#e0a030",
  cancelled: "#637585",
};

function fmtDur(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function AgnihPage() {
  const { data, isLoading } = useExecutionRuns({ limit: 80 });
  const { data: stats } = useExecutionStats();
  const runs = data?.runs ?? [];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={VASU}
        deva="Agniḥ"
        role="Execution Engine"
        title="The Sacrificial Fire"
        sanskrit="अग्निः"
        description="every task run is an oblation into the fire — the live execution ledger."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile accent={VASU} label="Total Runs" value={stats?.total ?? 0} />
        <StatTile accent="#4dc8c8" label="Running" value={stats?.running ?? 0} />
        <StatTile accent="#2ab870" label="Completed" value={stats?.completed ?? 0} />
        <StatTile accent="#e04040" label="Failed" value={stats?.failed ?? 0} />
        <StatTile accent={VASU} label="Avg Duration" value={fmtDur(stats?.avg_duration_ms ?? 0)} />
      </div>

      <div
        className="overflow-hidden rounded-lg border border-hairline bg-surface-1"
        style={{ borderTop: `2px solid ${VASU}` }}
      >
        {isLoading ? (
          <div className="p-3">
            <SkeletonRows rows={8} />
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Flame}
            accent={VASU}
            title="No execution runs yet"
            body="Tasks dispatched to agents appear here as fire-runs with live status and duration."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-2 text-left">
                <th className="label-caps px-4 py-2 text-ink-tertiary">Run</th>
                <th className="label-caps px-4 py-2 text-ink-tertiary">Agent</th>
                <th className="label-caps px-4 py-2 text-ink-tertiary">Status</th>
                <th className="label-caps px-4 py-2 text-right text-ink-tertiary">Duration</th>
                <th className="label-caps px-4 py-2 text-ink-tertiary">When</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const color = STATUS_COLOR[r.status] ?? "#637585";
                return (
                  <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-3 text-ink-secondary">
                      {r.name}
                      {r.error && <div className="mt-0.5 font-mono text-[11px] text-critical">{r.error}</div>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink-tertiary">{r.agent_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {r.status === "running" && (
                          <span className="relative inline-flex h-1.5 w-1.5">
                            <span className="live-ring absolute inset-0 rounded-full" style={{ background: color }} />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                          </span>
                        )}
                        <span className="rounded px-2 py-0.5 text-[10px] font-mono uppercase" style={{ background: `${color}22`, color }}>
                          {r.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[12px] text-ink-tertiary">{fmtDur(r.duration_ms)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-ghost">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
