"use client";

import { useState } from "react";
import { ArrowUpCircle, Siren, Megaphone } from "lucide-react";
import type { Agent, Escalation } from "@indra/types";
import { useAgents, useEscalations, useCreateEscalation } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/Skeleton";

const RUDRA = "#c44450";

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const PRIO_COLOR: Record<string, string> = {
  low: "#637585",
  normal: "#4dc8c8",
  high: "#e0a030",
  urgent: "#e04040",
};

export default function UdanahPage() {
  const { data, isLoading } = useEscalations();
  const { data: agentsData } = useAgents({ limit: 100 });
  const create = useCreateEscalation();

  const agents = (agentsData?.agents ?? []) as Agent[];
  const escalations = (data?.escalations ?? []) as Escalation[];

  const [reason, setReason] = useState("");
  const [agentId, setAgentId] = useState("");
  const [priority, setPriority] = useState<string>("normal");

  function raise() {
    if (!reason.trim()) return;
    create.mutate(
      { reason: reason.trim(), priority, ...(agentId ? { agent_id: agentId } : {}) },
      { onSuccess: () => setReason("") }
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={RUDRA}
        deva="Udanah"
        role="Escalations"
        title="Escalation Center"
        sanskrit="उदानः"
        description="the ascending current that lifts critical issues to human operators for decision."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile label="Open Escalations" value={data?.total ?? 0} accent={RUDRA} />
      </div>

      {/* Raise escalation */}
      <div className="rounded-lg border border-hairline bg-surface-1 p-4" style={{ borderTop: `2px solid ${RUDRA}` }}>
        <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-ghost">Raise escalation</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="label-caps text-ink-ghost">Reason</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && raise()}
              placeholder="Agent stuck in retry loop on payment API"
              className="input-field"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps text-ink-ghost">Agent (optional)</span>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="input-field min-w-[160px]">
              <option value="">None</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps text-ink-ghost">Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <button
            onClick={raise}
            disabled={!reason.trim() || create.isPending}
            className="flex items-center gap-1.5 rounded px-3 py-2 text-sm text-white transition-colors disabled:opacity-40"
            style={{ background: RUDRA }}
          >
            <ArrowUpCircle className="h-3.5 w-3.5" /> Escalate
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1" style={{ borderTop: `2px solid ${RUDRA}` }}>
        {isLoading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : escalations.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No open escalations"
            body="Udanah raises critical issues to operators. Raise one above, or it triggers automatically on severe faults."
            accent={RUDRA}
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {escalations.map((e) => {
              const color = PRIO_COLOR[e.priority] ?? "#637585";
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <Siren className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-secondary">{e.reason}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-ghost">
                      {e.agent_id ? `agent ${e.agent_id.slice(0, 8)} · ` : ""}{e.status}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-[10px] font-mono uppercase" style={{ background: `${color}22`, color }}>
                    {e.priority}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
