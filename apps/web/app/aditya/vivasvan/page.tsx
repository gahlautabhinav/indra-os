"use client";

import { Cpu, MemoryStick, Activity, Coins } from "lucide-react";
import { useTelemetryMetrics } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, MeterBar, ADITYA } from "@/components/common/DevaScaffold";
import { SkeletonCards } from "@/components/common/Skeleton";

function gaugeColor(pct: number): string {
  if (pct >= 90) return "#e04040";
  if (pct >= 70) return "#e0a030";
  return "#2ab870";
}

export default function VivasvanPage() {
  const { data, isLoading } = useTelemetryMetrics();
  const host = data?.host;
  const work = data?.workload;

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={ADITYA}
        deva="Vivasvān"
        role="Telemetry"
        title="The Radiant One"
        sanskrit="विवस्वान्"
        description="the shining sun whose light reveals all — live host metrics and workload telemetry."
      />

      {isLoading ? (
        <SkeletonCards count={2} className="grid gap-4 md:grid-cols-2" height={120} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-hairline bg-surface-1 p-4" style={{ borderTop: `2px solid ${ADITYA}` }}>
              <p className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-ghost">
                <Cpu className="h-3 w-3" /> CPU
              </p>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-mono tabular-nums text-2xl font-bold text-ink-primary">{host?.cpu_percent ?? 0}%</span>
                <span className="font-mono tabular-nums text-[11px] text-ink-ghost">{host?.cpu_count ?? 0} cores</span>
              </div>
              <MeterBar pct={host?.cpu_percent ?? 0} accent={gaugeColor(host?.cpu_percent ?? 0)} />
            </div>

            <div className="rounded-lg border border-hairline bg-surface-1 p-4" style={{ borderTop: `2px solid ${ADITYA}` }}>
              <p className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-ghost">
                <MemoryStick className="h-3 w-3" /> Memory
              </p>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-mono tabular-nums text-2xl font-bold text-ink-primary">{host?.memory_percent ?? 0}%</span>
                <span className="font-mono tabular-nums text-[11px] text-ink-ghost">
                  {host?.memory_used_gb ?? 0} / {host?.memory_total_gb ?? 0} GB
                </span>
              </div>
              <MeterBar pct={host?.memory_percent ?? 0} accent={gaugeColor(host?.memory_percent ?? 0)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatTile accent="#4dc8c8" label="Processes" value={host?.process_count ?? 0} />
            <StatTile accent={ADITYA} label="Total Tokens" value={(work?.total_tokens ?? 0).toLocaleString()} />
            <StatTile accent="#2ab870" label="Total Cost" value={`$${(work?.total_cost_usd ?? 0).toFixed(2)}`} />
            <StatTile accent="#d4843a" label="Active Sessions" value={work?.active_sessions ?? 0} />
            <StatTile accent="#9a44d4" label="Traces" value={work?.total_traces ?? 0} />
          </div>

          <p className="flex items-center gap-1.5 text-xs text-ink-ghost">
            <Activity className="h-3 w-3" /> Live host telemetry · refreshes every 5s
            <Coins className="ml-3 h-3 w-3" /> Workload burn from real agent token usage
          </p>
        </>
      )}
    </div>
  );
}
