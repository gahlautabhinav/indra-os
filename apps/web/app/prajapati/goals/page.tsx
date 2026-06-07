"use client";

import { useState } from "react";
import { Target, Plus, Trash2, Zap, ChevronRight } from "lucide-react";
import { useGoals, useCreateGoal, useDeleteGoal, useDecomposeGoal, useUpdateGoal } from "@/lib/api/hooks";
import type { Goal, GoalPriority, GoalStatus } from "@indra/types";

const PRAJAPATI = "#9a44d4";

const PRIORITY_LABELS: Record<GoalPriority, { label: string; color: string }> = {
  0: { label: "low", color: "#637585" },
  1: { label: "medium", color: "#3a80d4" },
  2: { label: "high", color: "#e0a030" },
  3: { label: "critical", color: "#c44450" },
};

const STATUS_COLORS: Record<GoalStatus, string> = {
  pending: "#637585",
  planning: "#3a80d4",
  active: "#9a44d4",
  completed: "#2ab870",
  failed: "#c44450",
};

function PriorityBadge({ priority }: { priority: GoalPriority }) {
  const { label, color } = PRIORITY_LABELS[priority];
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const del = useDeleteGoal();
  const decompose = useDecomposeGoal();
  const update = useUpdateGoal();
  const steps = goal.definition?.steps ?? [];

  return (
    <div className="bg-surface-1 border border-hairline rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={goal.priority as GoalPriority} />
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{ background: `${STATUS_COLORS[goal.status as GoalStatus]}22`, color: STATUS_COLORS[goal.status as GoalStatus] }}
            >
              {goal.status}
            </span>
          </div>
          <p className="font-semibold text-ink-primary truncate">{goal.title}</p>
          <p className="text-xs text-ink-ghost line-clamp-2">{goal.target_outcome}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => decompose.mutate(goal.id)}
            disabled={decompose.isPending}
            className="p-1.5 rounded hover:bg-surface-2 transition-colors"
            title="Decompose into tasks"
          >
            <Zap size={13} style={{ color: PRAJAPATI }} />
          </button>
          <button
            onClick={() => del.mutate(goal.id)}
            className="p-1.5 rounded hover:bg-surface-2 text-ink-ghost hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Steps preview */}
      {steps.length > 0 && (
        <div className="space-y-1">
          {steps.slice(0, 3).map((s, i) => (
            <div key={s.id ?? i} className="flex items-center gap-2 text-xs text-ink-ghost">
              <ChevronRight size={10} style={{ color: PRAJAPATI }} />
              <span className="font-medium text-ink-secondary">{s.type}</span>
              <span className="truncate">{s.title}</span>
            </div>
          ))}
          {steps.length > 3 && (
            <p className="text-xs text-ink-ghost pl-3">+{steps.length - 3} more steps</p>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-ink-ghost mb-1">
          <span>{goal.agent_count} tasks</span>
          <span>{goal.progress_pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-surface-2">
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${goal.progress_pct}%`, background: PRAJAPATI }}
          />
        </div>
      </div>

      {/* Status control */}
      {goal.status !== "completed" && goal.status !== "failed" && (
        <div className="flex gap-2">
          {goal.status === "pending" && (
            <button
              className="text-xs px-2 py-1 rounded border border-hairline hover:bg-surface-2 transition-colors"
              onClick={() => update.mutate({ goalId: goal.id, body: { status: "active" } })}
            >
              Activate
            </button>
          )}
          <button
            className="text-xs px-2 py-1 rounded border border-hairline hover:bg-surface-2 transition-colors text-green-400"
            onClick={() => update.mutate({ goalId: goal.id, body: { status: "completed" } })}
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}

function AddGoalModal({ onClose }: { onClose: () => void }) {
  const create = useCreateGoal();
  const [form, setForm] = useState({
    title: "",
    description: "",
    target_outcome: "",
    priority: 1 as GoalPriority,
    steps: "",
  });

  function handleSubmit() {
    create.mutate(
      {
        title: form.title,
        target_outcome: form.target_outcome,
        priority: form.priority,
        ...(form.description ? { description: form.description } : {}),
      },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface-1 border border-hairline rounded-xl p-6 w-full max-w-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-ink-primary text-lg">New Strategic Goal</h2>

        <div className="space-y-3">
          <input
            className="input-field w-full"
            placeholder="Goal title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="input-field w-full h-16"
            placeholder="Target outcome — what does success look like?"
            value={form.target_outcome}
            onChange={(e) => setForm((f) => ({ ...f, target_outcome: e.target.value }))}
          />
          <input
            className="input-field w-full"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div>
            <label className="label-caps text-ink-ghost mb-1 block">Priority</label>
            <div className="flex gap-2">
              {([0, 1, 2, 3] as GoalPriority[]).map((p) => (
                <button
                  key={p}
                  className="px-3 py-1.5 rounded border text-xs font-medium transition-colors"
                  style={
                    form.priority === p
                      ? { background: `${PRIORITY_LABELS[p].color}22`, borderColor: PRIORITY_LABELS[p].color, color: PRIORITY_LABELS[p].color }
                      : { borderColor: "var(--hairline)", color: "#637585" }
                  }
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                >
                  {PRIORITY_LABELS[p].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!form.title || !form.target_outcome || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const [adding, setAdding] = useState(false);
  const [filterStatus, setFilterStatus] = useState<GoalStatus | "all">("all");

  const filtered = (goals ?? []).filter((g) => filterStatus === "all" || g.status === filterStatus);
  const statuses: Array<GoalStatus | "all"> = ["all", "pending", "active", "completed", "failed"];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps mb-1" style={{ color: PRAJAPATI }}>
            Goals · Strategic Objectives
          </p>
          <h1
            className="font-bold tracking-tight text-ink-primary"
            style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
          >
            Mission Goals
          </h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setAdding(true)}>
          <Plus size={15} />
          New Goal
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-hairline">
        {statuses.map((s) => (
          <button
            key={s}
            className="px-3 py-1.5 text-xs font-medium transition-colors border-b-2"
            style={
              filterStatus === s
                ? { borderColor: PRAJAPATI, color: PRAJAPATI }
                : { borderColor: "transparent", color: "#637585" }
            }
            onClick={() => setFilterStatus(s)}
          >
            {s === "all" ? `All (${(goals ?? []).length})` : `${s} (${(goals ?? []).filter((g) => g.status === s).length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-ink-ghost label-caps">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 p-12 text-center text-ink-ghost">
              <Target size={32} className="mx-auto mb-3 opacity-30" />
              <p className="label-caps">No goals yet</p>
            </div>
          )}
        </div>
      )}

      {adding && <AddGoalModal onClose={() => setAdding(false)} />}
    </div>
  );
}
