"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FolderGit2,
  Loader2,
  PlayCircle,
  Plus,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Workflow,
  XCircle,
} from "lucide-react";
import {
  useCreateWorkflowDef,
  useDeleteWorkflowDef,
  useDiscoverProjects,
  useExecuteWorkflowDef,
  useIndexRuns,
  useProjects,
  useReindexProject,
  useSetProjectEnabled,
  useWorkflowDefs,
} from "@/lib/api/hooks";
import type {
  IndexRun,
  IndexStage,
  ProjectInfo,
  WorkflowDef,
  WorkflowStatus,
} from "@indra/types";

const ADITYA = "#3a80d4";

type Tab = "index" | "workflows";

// ── Auto-index (Projects + Runs) ─────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  idle: "#637585",
  queued: "#e0a030",
  running: "#3a80d4",
  ok: "#2ab870",
  succeeded: "#2ab870",
  failed: "#e04040",
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? "#637585";
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase"
      style={{ background: `${c}22`, color: c }}
    >
      {status === "running" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {status}
    </span>
  );
}

function StageChips({ stages }: { stages: IndexStage[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {stages.map((s, i) => {
        const c = STATUS_COLOR[s.status] ?? "#637585";
        const tip = typeof s.reason === "string" ? s.reason : typeof s.error === "string" ? s.error : undefined;
        return (
          <span
            key={`${s.stage}-${i}`}
            className="rounded px-1.5 py-0.5 text-[9px] font-mono"
            style={{ background: `${c}1a`, color: c }}
            title={tip}
          >
            {s.stage}:{s.status}
          </span>
        );
      })}
    </div>
  );
}

function ProjectRow({ p }: { p: ProjectInfo }) {
  const toggle = useSetProjectEnabled();
  const reindex = useReindexProject();
  const leaf = p.root_path.split("/").pop() || p.root_path;
  const busy = p.status === "queued" || p.status === "running";

  return (
    <div className="flex items-center gap-3 border-b border-hairline px-3 py-2 last:border-0">
      <button
        onClick={() => toggle.mutate({ id: p.id, enabled: !p.enabled })}
        className="relative h-4 w-7 shrink-0 rounded-full transition-colors"
        style={{ background: p.enabled ? ADITYA : "var(--indra-surface-3)" }}
        title={p.enabled ? "Auto-index enabled" : "Click to enable auto-index"}
      >
        <span
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
          style={{ left: p.enabled ? "14px" : "2px" }}
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] text-ink-secondary">{leaf}</span>
          <StatusBadge status={p.status} />
          {p.graphify_out ? (
            <span className="text-[9px] text-emerald-400/80" title="Graph + Obsidian vault rebuilt each run">
              vault
            </span>
          ) : (
            <span className="text-[9px] text-ink-ghost" title="Not graphified yet — run /graphify once, then enable">
              no graph
            </span>
          )}
        </div>
        <p className="truncate font-mono text-[10px] text-ink-ghost">{p.root_path}</p>
      </div>

      {p.index_version > 0 && (
        <span className="font-mono text-[10px] text-ink-ghost">v{p.index_version}</span>
      )}

      <button
        onClick={() => reindex.mutate({ id: p.id, mode: "fast" })}
        disabled={!p.enabled || busy || reindex.isPending}
        className="flex items-center gap-1 rounded border border-hairline px-2 py-1 text-[11px] text-ink-tertiary enabled:hover:text-ink-secondary disabled:opacity-40"
        title={p.enabled ? "Fast deterministic reindex (graph + vault)" : "Enable first"}
      >
        <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} /> Reindex
      </button>
      <button
        onClick={() => reindex.mutate({ id: p.id, mode: "semantic" })}
        disabled={!p.enabled || busy || reindex.isPending}
        className="flex items-center gap-1 rounded border px-2 py-1 text-[11px] disabled:opacity-40"
        style={{ borderColor: "#9a44d433", color: "#b07ce0" }}
        title={p.enabled ? "AI build: a headless Claude session names the communities, then rebuilds the vault with real names" : "Enable first"}
      >
        <Sparkles className="h-3 w-3" /> AI
      </button>
    </div>
  );
}

function RunRow({ r }: { r: IndexRun }) {
  const Icon =
    r.status === "succeeded"
      ? CheckCircle2
      : r.status === "failed"
        ? XCircle
        : r.status === "running"
          ? Loader2
          : PlayCircle;
  const c = STATUS_COLOR[r.status] ?? "#637585";
  return (
    <div className="border-b border-hairline px-3 py-2 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${r.status === "running" ? "animate-spin" : ""}`} style={{ color: c }} />
        <span className="truncate font-mono text-[11px] text-ink-secondary">{r.name}</span>
        {r.trigger && <span className="text-[9px] text-ink-ghost">· {r.trigger}</span>}
        <span className="ml-auto">
          <StatusBadge status={r.status} />
        </span>
      </div>
      {r.stages.length > 0 && (
        <div className="mt-1.5 pl-5">
          <StageChips stages={r.stages} />
        </div>
      )}
      {r.error && <p className="mt-1 pl-5 text-[10px] text-rose-400/80">{r.error}</p>}
    </div>
  );
}

function AutoIndexTab() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: runs = [] } = useIndexRuns();
  const discover = useDiscoverProjects();
  const enabled = projects.filter((p) => p.enabled);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-tertiary">
            <FolderGit2 className="h-3.5 w-3.5" /> {projects.length} projects
          </span>
          <span className="text-[11px] text-emerald-400/80">{enabled.length} auto-indexing</span>
        </div>
        <button
          onClick={() => discover.mutate()}
          disabled={discover.isPending}
          className="ml-auto flex items-center gap-1.5 rounded border border-hairline px-3 py-1.5 text-[12px] text-ink-secondary hover:bg-surface-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${discover.isPending ? "animate-spin" : ""}`} /> Discover projects
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-surface-1">
          <p className="border-b border-hairline px-3 py-2 text-[10px] uppercase tracking-wider text-ink-ghost">
            Projects — toggle to auto-index
          </p>
          {isLoading ? (
            <p className="p-4 text-xs text-ink-ghost">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="p-4 text-xs text-ink-ghost">No projects. Click “Discover projects”.</p>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {projects.map((p) => (
                <ProjectRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-hairline bg-surface-1">
          <p className="border-b border-hairline px-3 py-2 text-[10px] uppercase tracking-wider text-ink-ghost">
            Index runs — live
          </p>
          {runs.length === 0 ? (
            <p className="p-4 text-xs text-ink-ghost">No runs yet. Enable a project and hit Reindex.</p>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {runs.map((r) => (
                <RunRow key={r.id} r={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Workflows (existing builder) ─────────────────────────────────────────────

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
          {wf.description && <p className="text-xs text-ink-ghost">{wf.description}</p>}
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
              <span
                className="w-4 h-4 rounded-full bg-surface-2 flex items-center justify-center font-mono"
                style={{ fontSize: "9px" }}
              >
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
  { steps: [{ id: "s1", type: "notify", config: { title: "Step 1", message: "Hello from workflow" } }] },
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
          <button className="btn-primary" onClick={handleSubmit} disabled={!form.name || create.isPending}>
            {create.isPending ? "Creating…" : "Create Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowsTab() {
  const { data: workflows, isLoading } = useWorkflowDefs();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2" onClick={() => setAdding(true)}>
          <Plus size={15} /> New Workflow
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TvastaPage() {
  const [tab, setTab] = useState<Tab>("index");

  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="label-caps mb-1" style={{ color: ADITYA }}>
          Tvaṣṭā · Orchestration
        </p>
        <h1 className="font-bold tracking-tight text-ink-primary" style={{ fontSize: "28px", letterSpacing: "-0.8px" }}>
          The Craftsman
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          त्वष्टा — shapes raw code into knowledge: graphify → vault → graph → memory, with no manual prompts.
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-hairline">
        {([
          ["index", "Auto-Index"],
          ["workflows", "Workflows"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="border-b-2 px-3 py-2 text-[13px] transition-colors"
            style={
              tab === id
                ? { borderColor: ADITYA, color: "var(--indra-ink-primary)" }
                : { borderColor: "transparent", color: "var(--indra-ink-ghost)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "index" ? <AutoIndexTab /> : <WorkflowsTab />}
    </div>
  );
}
