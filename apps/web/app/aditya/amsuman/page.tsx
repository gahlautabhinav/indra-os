"use client";

import { PieChart } from "lucide-react";
import { useShareAllocation } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, MeterBar, ADITYA } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const DOMAIN_COLOR: Record<string, string> = {
  indra: "#4dc8c8",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

export default function AmsumanPage() {
  const { data, isLoading } = useShareAllocation();
  const shares = data?.shares ?? [];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={ADITYA}
        deva="Aṃśah"
        role="Resource Shares"
        title="The Allotted Portion"
        sanskrit="अंशः"
        description="how the finite token & cost wealth is divided across the five domains — live."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile accent={ADITYA} label="Total Tokens" value={(data?.total_tokens ?? 0).toLocaleString()} />
        <StatTile accent="#2ab870" label="Total Cost" value={`$${(data?.total_cost_usd ?? 0).toFixed(2)}`} />
      </div>

      <div className="rounded-lg border border-hairline bg-surface-1 p-4" style={{ borderTop: `2px solid ${ADITYA}` }}>
        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : shares.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="No shares to divide yet"
            body="Once agents start spending tokens, each domain's portion of the finite token & cost wealth appears here."
            accent={ADITYA}
          />
        ) : (
          <ul className="space-y-4">
            {shares.map((s) => {
              const color = DOMAIN_COLOR[s.domain] ?? "#637585";
              return (
                <li key={s.domain}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-semibold uppercase tracking-wider" style={{ color }}>{s.domain}</span>
                    <span className="font-mono tabular-nums text-[10px] text-ink-ghost">{s.agents} agents</span>
                    <span className="ml-auto font-mono tabular-nums text-[12px] text-ink-secondary">{s.token_share_pct}%</span>
                  </div>
                  <MeterBar pct={s.token_share_pct} accent={color} />
                  <div className="mt-1 flex justify-between font-mono tabular-nums text-[10px] text-ink-ghost">
                    <span>{s.tokens.toLocaleString()} tok</span>
                    <span>${s.cost_usd.toFixed(4)} · {s.cost_share_pct}% cost</span>
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
