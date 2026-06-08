"use client";

import { usePervasionOverview } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, MeterBar, ADITYA } from "@/components/common/DevaScaffold";

const DOMAIN_COLOR: Record<string, string> = {
  indra: "#4dc8c8",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

export default function VisnuhPage() {
  const { data, isLoading } = usePervasionOverview();
  const reach = data?.reach ?? [];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={ADITYA}
        deva="Viṣṇuḥ"
        role="Pervasion"
        title="The All-Pervader"
        sanskrit="विष्णुः"
        description="how far the system has spread — agent reach and active presence across every domain."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile accent={ADITYA} label="Pervasion" value={`${data?.pervasion_pct ?? 0}%`} sub={`${data?.domains_reached ?? 0}/${data?.domains_total ?? 5} domains`} />
        <StatTile accent="#2ab870" label="Active Agents" value={data?.active_agents ?? 0} />
        <StatTile accent="#637585" label="Total Agents" value={data?.total_agents ?? 0} />
        <StatTile accent="#4dc8c8" label="Sessions" value={data?.total_sessions ?? 0} />
      </div>

      <div className="rounded-lg border border-hairline bg-surface-1 p-4">
        <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-ghost">Reach by domain</p>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-ink-ghost">Measuring pervasion…</div>
        ) : (
          <ul className="space-y-4">
            {reach.map((r) => {
              const color = DOMAIN_COLOR[r.domain] ?? "#637585";
              return (
                <li key={r.domain}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-semibold uppercase tracking-wider" style={{ color }}>{r.domain}</span>
                    <span className="ml-auto font-mono text-[12px] text-ink-secondary">
                      {r.active_agents}/{r.agents} active
                    </span>
                  </div>
                  <MeterBar pct={r.reach_pct} accent={color} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
