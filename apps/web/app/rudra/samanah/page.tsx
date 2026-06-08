"use client";

import { useState } from "react";
import { GitBranch, Scale, Network } from "lucide-react";
import type { Agent, CoordinationTask, Task } from "@indra/types";
import {
  useAgents,
  useTasks,
  useCoordinationTasks,
  useAssignCoordinationTask,
} from "@/lib/api/hooks";
import { DevaHeader, StatPill, DevaEmptyState, RUDRA } from "@/components/rudra/DevaHeader";

export default function SamanahPage() {
  const { data, isLoading } = useCoordinationTasks();
  const { data: agentsData } = useAgents({ limit: 100 });
  const { data: tasksData } = useTasks({ status: "pending" });
  const assign = useAssignCoordinationTask();

  const agents = (agentsData?.agents ?? []) as Agent[];
  const pendingTasks = (tasksData?.tasks ?? []) as Task[];
  const coordTasks = (data?.tasks ?? []) as CoordinationTask[];

  const [taskId, setTaskId] = useState("");
  const [agentId, setAgentId] = useState("");

  function doAssign() {
    if (!taskId || !agentId) return;
    assign.mutate({ task_id: taskId, agent_id: agentId }, { onSuccess: () => setTaskId("") });
  }

  return (
    <div className="space-y-6 p-6">
      <DevaHeader
        deva="Samanah"
        role="Coordination · Load Balancing"
        title="The Balancing Breath"
        sanskrit="समानः"
        description="the equalizing current that distributes work evenly across the agent workforce."
      />

      <div className="flex flex-wrap gap-3">
        <StatPill label="In Coordination" value={data?.total ?? 0} />
        <StatPill label="Pending Tasks" value={pendingTasks.length} accent="#e0a030" />
        <StatPill label="Available Agents" value={agents.length} accent="#4dc8c8" />
      </div>

      {/* Assign */}
      <div className="rounded-lg border border-hairline bg-surface-1 p-4">
        <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-ghost">Assign task to agent</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="label-caps text-ink-ghost">Task</span>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="input-field min-w-[200px]">
              <option value="">Select task…</option>
              {pendingTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps text-ink-ghost">Agent</span>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="input-field min-w-[200px]">
              <option value="">Select agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <button
            onClick={doAssign}
            disabled={!taskId || !agentId || assign.isPending}
            className="flex items-center gap-1.5 rounded px-3 py-2 text-sm text-white transition-colors disabled:opacity-40"
            style={{ background: RUDRA }}
          >
            <GitBranch className="h-3.5 w-3.5" /> Assign
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-ink-ghost">Loading coordination state…</div>
        ) : coordTasks.length === 0 ? (
          <DevaEmptyState
            icon={<Scale className="h-5 w-5" />}
            title="No active coordination"
            hint="Samanah balances task assignment across agents. Assign a task above to begin coordinating."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {coordTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <Network className="h-3.5 w-3.5 text-ink-tertiary" />
                <span className="text-sm text-ink-secondary">{t.name ?? t.id.slice(0, 8)}</span>
                <span className="font-mono text-[11px] text-ink-ghost">{t.agent_id?.slice(0, 8) ?? "unassigned"}</span>
                <span className="ml-auto font-mono text-[10px] text-ink-ghost">{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
