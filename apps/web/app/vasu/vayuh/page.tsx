"use client";

import { Wind, Radio } from "lucide-react";
import { useChannels, useCommunicationOverview } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, VASU } from "@/components/common/DevaScaffold";

const PLUGIN_COLOR: Record<string, string> = {
  claude_code: "#d4843a",
  gemini_cli: "#4dc8c8",
  codex_cli: "#7c6af7",
  kiro_cli: "#2ab870",
  opencode: "#e04040",
  antigravity: "#a855f7",
};

export default function VayuhPage() {
  const { data: overview } = useCommunicationOverview();
  const { data, isLoading } = useChannels({ active_only: true, limit: 120 });
  const channels = data?.channels ?? [];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={VASU}
        deva="Vāyuḥ"
        role="Communication Bus"
        title="The Wind Carrier"
        sanskrit="वायुः"
        description="the wind that moves between agents — each session a channel, its agents the participants."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile accent={VASU} label="Active Channels" value={overview?.active_channels ?? 0} />
        <StatTile accent="#637585" label="Total Channels" value={overview?.total_channels ?? 0} />
        <StatTile accent="#4dc8c8" label="Participants" value={overview?.participants ?? 0} />
      </div>

      {overview && Object.keys(overview.channels_by_protocol).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(overview.channels_by_protocol).map(([proto, n]) => {
            const color = PLUGIN_COLOR[proto] ?? "#637585";
            return (
              <span key={proto} className="inline-flex items-center gap-1.5 rounded border border-hairline px-2.5 py-1 text-[11px]" style={{ color }}>
                <Radio className="h-3 w-3" /> {proto} · {n}
              </span>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-ink-ghost">Tuning channels…</div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Wind className="h-6 w-6" style={{ color: VASU, opacity: 0.5 }} />
            <p className="text-sm text-ink-secondary">No active channels</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-wider text-ink-ghost">
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">Protocol</th>
                <th className="px-4 py-2 font-medium">Participants</th>
                <th className="px-4 py-2 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => {
                const color = PLUGIN_COLOR[c.plugin_type] ?? "#637585";
                const project = c.project_path?.split(/[\\/]/).pop() ?? c.channel_id.slice(0, 8);
                return (
                  <tr key={c.channel_id} className="border-b border-hairline last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-3 text-ink-secondary">{project}</td>
                    <td className="px-4 py-3">
                      <span className="rounded px-2 py-0.5 text-[10px] font-mono" style={{ background: `${color}22`, color }}>
                        {c.plugin_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-[12px] text-ink-tertiary">{c.participants}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-ghost">
                      {c.last_activity ? new Date(c.last_activity).toLocaleString() : "—"}
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
