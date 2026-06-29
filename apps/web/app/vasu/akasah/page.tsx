"use client";

import { Layers } from "lucide-react";
import { useContextWindows } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, MeterBar, VASU } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const PRESSURE_COLOR: Record<string, string> = {
  healthy: "#2ab870",
  moderate: "#4dc8c8",
  high: "#e0a030",
  critical: "#e04040",
};

export default function AkasahPage() {
  const { data, isLoading } = useContextWindows({ active_only: true, limit: 120 });
  const windows = data?.windows ?? [];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={VASU}
        deva="Ākāśaḥ"
        role="Context & Space"
        title="The Context Field"
        sanskrit="आकाशः"
        description="the ether holding each agent's finite token-space — live context-window pressure."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile accent={VASU} label="Active Windows" value={data?.total ?? 0} />
        <StatTile accent="#4dc8c8" label="Tokens In Use" value={(data?.aggregate_used ?? 0).toLocaleString()} />
        <StatTile
          accent={(data?.aggregate_pct ?? 0) > 70 ? "#e0a030" : "#2ab870"}
          label="Aggregate Fill"
          value={`${data?.aggregate_pct ?? 0}%`}
        />
      </div>

      <div
        className="overflow-hidden rounded-lg border border-hairline bg-surface-1"
        style={{ borderTop: `2px solid ${VASU}` }}
      >
        {isLoading ? (
          <div className="p-3">
            <SkeletonRows rows={6} height={56} />
          </div>
        ) : windows.length === 0 ? (
          <EmptyState
            icon={Layers}
            accent={VASU}
            title="No active context windows"
            body="Each live agent session reserves a finite token-space. Active windows and their fill-pressure appear here as sessions run."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {windows.map((w) => {
              const color = PRESSURE_COLOR[w.pressure] ?? "#637585";
              const project = w.project_path?.split(/[\\/]/).pop() ?? w.plugin_type;
              return (
                <li key={w.session_id} className="px-4 py-3 transition-colors hover:bg-surface-2">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-sm text-ink-secondary">{project}</span>
                    <span className="font-mono text-[10px] text-ink-ghost">{w.plugin_type}</span>
                    <span className="ml-auto rounded px-2 py-0.5 text-[10px] font-mono uppercase" style={{ background: `${color}22`, color }}>
                      {w.pressure}
                    </span>
                  </div>
                  <MeterBar pct={w.used_pct} accent={color} />
                  <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-ink-ghost">
                    <span>{w.tokens_used.toLocaleString()} tok</span>
                    <span>{w.used_pct}% of {(w.context_window / 1000).toFixed(0)}k</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
