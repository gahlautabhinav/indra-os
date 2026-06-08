"use client";

import { Trash2, Wind, Recycle } from "lucide-react";
import type { Agent } from "@indra/types";
import { useAgents, useCleanupAgent } from "@/lib/api/hooks";
import { DevaHeader, StatPill, DevaEmptyState, RUDRA } from "@/components/rudra/DevaHeader";

// Agents that have finished their lifecycle and can have resources reclaimed.
const RECLAIMABLE = new Set(["dead", "completed", "error"]);

export default function ApanahPage() {
  const { data, isLoading } = useAgents({ limit: 200 });
  const cleanup = useCleanupAgent();

  const agents = (data?.agents ?? []) as Agent[];
  const reclaimable = agents.filter((a) => RECLAIMABLE.has(a.status));

  return (
    <div className="space-y-6 p-6">
      <DevaHeader
        deva="Apanah"
        role="Cleanup · Resource Reclamation"
        title="The Downward Breath"
        sanskrit="अपानः"
        description="the eliminating current that reclaims spent agents and frees their resources."
      />

      <div className="flex flex-wrap gap-3">
        <StatPill label="Total Agents" value={agents.length} />
        <StatPill label="Reclaimable" value={reclaimable.length} accent="#e0a030" />
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-ink-ghost">Loading agents…</div>
        ) : reclaimable.length === 0 ? (
          <DevaEmptyState
            icon={<Recycle className="h-5 w-5" />}
            title="Nothing to reclaim"
            hint="Apanah lists finished, dead, or errored agents whose resources can be freed. None right now."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-wider text-ink-ghost">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Tokens</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {reclaimable.map((a) => (
                <tr key={a.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3 text-ink-secondary">{a.name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-tertiary">{a.type}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-ghost">{a.status}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[11px] text-ink-tertiary">
                    {a.token_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Reclaim resources for "${a.name}"?`)) cleanup.mutate(a.id);
                      }}
                      disabled={cleanup.isPending}
                      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] text-ink-tertiary transition-colors hover:bg-surface-2 hover:text-ink-secondary disabled:opacity-50"
                      style={{ borderColor: `${RUDRA}44` }}
                    >
                      <Trash2 className="h-3 w-3" /> Cleanup
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-ink-ghost">
        <Wind className="h-3 w-3" /> Cleanup is non-destructive to source CLI sessions — it only releases INDRA-side runtime state.
      </p>
    </div>
  );
}
