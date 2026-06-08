"use client";

import { ShieldCheck, Check } from "lucide-react";
import type { RuntimeError } from "@indra/types";
import { useErrors, useAcknowledgeError } from "@/lib/api/hooks";
import { DevaHeader, StatPill, DevaEmptyState, RUDRA } from "@/components/rudra/DevaHeader";

const SEV_COLOR: Record<string, string> = {
  critical: "#e04040",
  warning: "#e0a030",
  info: "#4080a0",
};

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEV_COLOR[severity] ?? "#637585";
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {severity}
    </span>
  );
}

export default function NagahPage() {
  const { data, isLoading } = useErrors();
  const ack = useAcknowledgeError();

  const errors = (data?.errors ?? []) as RuntimeError[];
  const critical = errors.filter((e) => e.severity === "critical").length;
  const warnings = errors.filter((e) => e.severity === "warning").length;

  return (
    <div className="space-y-6 p-6">
      <DevaHeader
        deva="Nagah"
        role="Error Detection"
        title="Error Serpent"
        sanskrit="नागः"
        description="the serpent that detects faults lurking in the runtime — agents in error and failed tasks."
      />

      <div className="flex flex-wrap gap-3">
        <StatPill label="Total" value={errors.length} />
        <StatPill label="Critical" value={critical} accent="#e04040" />
        <StatPill label="Warnings" value={warnings} accent="#e0a030" />
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-ink-ghost">Scanning for errors…</div>
        ) : errors.length === 0 ? (
          <DevaEmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No errors detected"
            hint="Nagah continuously watches for agents in an error state and failed tasks. All clear."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-wider text-ink-ghost">
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Issue</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {errors.map((e) => (
                <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3"><SeverityBadge severity={e.severity} /></td>
                  <td className="px-4 py-3">
                    <div className="text-ink-secondary">{e.title}</div>
                    {e.error && <div className="mt-0.5 font-mono text-[11px] text-ink-ghost">{e.error}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-tertiary">
                    {e.source_type}:{e.source_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-ghost">
                    {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => ack.mutate(e.id)}
                      disabled={ack.isPending}
                      className="inline-flex items-center gap-1 rounded border border-hairline px-2 py-1 text-[11px] text-ink-tertiary transition-colors hover:bg-surface-2 hover:text-ink-secondary disabled:opacity-50"
                      style={{ borderColor: `${RUDRA}44` }}
                    >
                      <Check className="h-3 w-3" /> Ack
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
