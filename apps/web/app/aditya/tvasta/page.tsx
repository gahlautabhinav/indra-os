"use client";

import { useState } from "react";
import { Workflow, Plus, Play, Trash2 } from "lucide-react";
import {
  useWorkflowDefs,
  useCreateWorkflowDef,
  useDeleteWorkflowDef,
  useExecuteWorkflowDef,
} from "@/lib/api/hooks";
import type { WorkflowDef, WorkflowStatus } from "@indra/types";

const ADITYA = "#3a80d4";

const STATUS_COLORS: Record<WorkflowStatus, string> = {
  draft: "#637585",
  active: "#2ab870",
  archived: "#e0a030",
};

function WorkflowCard({ wf }: { wf: WorkflowDef }) {
  const del = useDeleteWorkflowDef();
  const exec = useExecuteWorkflowDef();
  const steps = wf.definition?.steps ?? [];

  return (
    <div className="bg-surface-1 border border-hairline rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ background: `${STATUS_COLORS[wf.status]}22`, color: STATUS_COLORS[wf.status] }}
            >
              {wf.status}
            </span>
            <span className="text-xs text-ink-ghost">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
          </div>
          <p className="font-medium text-ink-primary">{wf.name}</p>
          {wf.description && (
            <p className="text-xs text-ink-ghost">{wf.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => exec.mutate(wf.id)}
            disabled={exec.isPending}
            className="p-1.5 rounded hover:bg-surface-2 transition-colors"
            title="Execute workflow"
          >
            <Play size={13} style={{ color: ADITYA }} />
          </button>
          <button
            onClick={() => del.mutate(wf.id)}
            className="p-1.5 rounded hover:bg-surface-2 transition-colors text-ink-ghost hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="space-y-1">
          {steps.map((s, i) => (
            <div key={s.id ?? i} className="flex items-center gap-2 text-xs text-ink-ghost">
              <span className="w-4 h-4 rounded-full bg-surface-2 flex items-center justify-center font-mono" style={{ fontSize: "9px" }}>
                {i + 1}
              </span>
              <span className="font-medium text-ink-secondary">{s.type}</span>
              {(s.config as { name?: string }).name && (
                <span className="text-ink-ghost">· {(s.config as { name: string }).name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_DEFINITION = JSON.stringify(
  {
    steps: [
      { id: "s1", type: "notify", config: { title: "Step 1", message: "Hello from workflow" } },
    ],
  },
  null,
  2
);

function AddWorkflowModal({ onClose }: { onClose: () => void }) {
  const create = useCreateWorkflowDef();
  const [form, setForm] = useState({ name: "", description: "", definition: DEFAULT_DEFINITION });

  function handleSubmit() {
    try {
      const def = JSON.parse(form.definition);
      create.mutate(
        {
          name: form.name,
          ...(form.description ? { description: form.description } : {}),
          definition: def,
        },
        { onSuccess: onClose }
      );
    } catch {
      alert("Definition must be valid JSON");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface-1 border border-hairline rounded-xl p-6 w-full max-w-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-ink-primary text-lg">New Workflow</h2>

        <div className="space-y-3">
          <input
            className="input-field w-full"
            placeholder="Workflow name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="input-field w-full"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div>
            <label className="label-caps text-ink-ghost mb-1 block">Definition (JSON)</label>
            <textarea
              className="input-field w-full font-mono text-xs h-48"
              value={form.definition}
              onChange={(e) => setForm((f) => ({ ...f, definition: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!form.name || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TvastaPage() {
  const { data: workflows, isLoading } = useWorkflowDefs();
  const [adding, setAdding] = useState(false);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps mb-1" style={{ color: ADITYA }}>
            Tvastah · Workflow Builder
          </p>
          <h1
            className="font-bold tracking-tight text-ink-primary"
            style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
          >
            Automation Workflows
          </h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setAdding(true)}>
          <Plus size={15} />
          New Workflow
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-ink-ghost label-caps">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(workflows ?? []).map((wf) => (
            <WorkflowCard key={wf.id} wf={wf} />
          ))}
          {(workflows ?? []).length === 0 && (
            <div className="col-span-3 p-12 text-center text-ink-ghost">
              <Workflow size={32} className="mx-auto mb-3 opacity-30" />
              <p className="label-caps">No workflows defined</p>
            </div>
          )}
        </div>
      )}

      {adding && <AddWorkflowModal onClose={() => setAdding(false)} />}
    </div>
  );
}
