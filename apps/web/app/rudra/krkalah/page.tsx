"use client";

import { HeartPulse, RotateCcw, ShieldCheck } from "lucide-react";
import type { Agent } from "@indra/types";
import { useAgents, useRecoveryStatus, useRecoverAgent } from "@/lib/api/hooks";
import { DevaHeader, StatPill, DevaEmptyState, RUDRA } from "@/components/rudra/DevaHeader";

export default function KrkalahPage() {
  const { data, isLoading } = useAgents({ limit: 200 });
  const { data: status } = useRecoveryStatus();
  const recover = useRecoverAgent();

  const agents = (data?.agents ?? []) as Agent[];
  const failing = agents.filter((a) => a.status === "error" || a.status === "dead");

  return (
    <div className="space-y-6 p-6">
      <DevaHeader
        deva="Krkalah"
        role="Recovery · Self-Healing"
        title="The Healing Breath"
        sanskrit="कृकलः"
        description="the regenerating current that revives stalled and errored agents back into the workforce."
      />

      <div className="flex flex-wrap gap-3">
        <StatPill label="Needs Recovery" value={failing.length} accent="#e04040" />
        <StatPill label="Active Recoveries" value={status?.active_recoveries ?? 0} accent="#2ab870" />
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-ink-ghost">Loading agents…</div>
        ) : failing.length === 0 ? (
          <DevaEmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="All agents healthy"
            hint="Krkalah surfaces errored or dead agents and can trigger a recovery cycle. None need it now."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-wider text-ink-ghost">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {failing.map((a) => (
                <tr key={a.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3 text-ink-secondary">{a.name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-tertiary">{a.type}</td>
                  <td className="px-4 py-3">
                    <span className="rounded px-2 py-0.5 text-[10px] font-mono uppercase" style={{ background: "#e0404022", color: "#e04040" }}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => recover.mutate(a.id)}
                      disabled={recover.isPending}
                      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] text-ink-tertiary transition-colors hover:bg-surface-2 hover:text-ink-secondary disabled:opacity-50"
                      style={{ borderColor: `${RUDRA}44` }}
                    >
                      <RotateCcw className="h-3 w-3" /> Recover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-ink-ghost">
        <HeartPulse className="h-3 w-3" /> Recovery status polls every 10s.
      </p>
    </div>
  );
}
