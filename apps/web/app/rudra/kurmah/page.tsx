"use client";

import { useState } from "react";
import { Save, Anchor } from "lucide-react";
import type { Agent, Checkpoint } from "@indra/types";
import { useAgents, useCheckpoints, useCreateCheckpoint } from "@/lib/api/hooks";
import { DevaHeader, StatPill, DevaEmptyState, RUDRA } from "@/components/rudra/DevaHeader";

export default function KurmahPage() {
  const { data, isLoading } = useCheckpoints();
  const { data: agentsData } = useAgents({ limit: 100 });
  const create = useCreateCheckpoint();

  const agents = (agentsData?.agents ?? []) as Agent[];
  const checkpoints = (data?.checkpoints ?? []) as Checkpoint[];

  const [agentId, setAgentId] = useState("");
  const [label, setLabel] = useState("");

  function save() {
    if (!agentId) return;
    create.mutate(
      { agent_id: agentId, ...(label.trim() ? { label: label.trim() } : {}) },
      { onSuccess: () => setLabel("") }
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DevaHeader
        deva="Kurmah"
        role="Checkpoints · State Persistence"
        title="The Tortoise Anchor"
        sanskrit="कूर्मः"
        description="the steadying breath that snapshots agent state so work can be restored after interruption."
      />

      <div className="flex flex-wrap gap-3">
        <StatPill label="Checkpoints" value={data?.total ?? 0} />
        <StatPill label="Agents" value={agents.length} accent="#4dc8c8" />
      </div>

      {/* Create checkpoint */}
      <div className="rounded-lg border border-hairline bg-surface-1 p-4">
        <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-ghost">Capture checkpoint</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="label-caps text-ink-ghost">Agent</span>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="input-field min-w-[200px]"
            >
              <option value="">Select agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="label-caps text-ink-ghost">Label (optional)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="before-refactor"
              className="input-field"
            />
          </label>
          <button
            onClick={save}
            disabled={!agentId || create.isPending}
            className="flex items-center gap-1.5 rounded px-3 py-2 text-sm text-white transition-colors disabled:opacity-40"
            style={{ background: RUDRA }}
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-ink-ghost">Loading checkpoints…</div>
        ) : checkpoints.length === 0 ? (
          <DevaEmptyState
            icon={<Anchor className="h-5 w-5" />}
            title="No checkpoints saved"
            hint="Capture a checkpoint above to snapshot an agent's state. Saved checkpoints will list here."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {checkpoints.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <Anchor className="h-3.5 w-3.5 text-ink-tertiary" />
                <span className="text-sm text-ink-secondary">{c.label ?? "checkpoint"}</span>
                <span className="font-mono text-[11px] text-ink-ghost">{c.agent_id.slice(0, 8)}</span>
                <span className="ml-auto font-mono text-[10px] text-ink-ghost">
                  {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
