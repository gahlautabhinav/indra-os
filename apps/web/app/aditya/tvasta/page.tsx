"use client";

import { useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  FolderGit2,
  Loader2,
  Network,
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
  useKgGraph,
  useKgQuery,
  useProjects,
  useReindexProject,
  useSetProjectEnabled,
  useWorkflowDefs,
} from "@/lib/api/hooks";
import { ConstellationGraph } from "@/components/knowledge/ConstellationGraph";
import type {
  IndexRun,
  IndexStage,
  ProjectInfo,
  WorkflowDef,
  WorkflowStatus,
} from "@indra/types";

const ADITYA = "#3a80d4";

type Tab = "index" | "kg" | "workflows";

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

// ── Ask KG (LightRAG retrieval) ──────────────────────────────────────────────

const KG_MODES = ["mix", "hybrid", "local", "global", "naive"] as const;

// LightRAG `only_need_context` returns markdown with ```json fences (one object per
// line) for entities / relationships / chunks + a plain reference list. Parse it into
// sections; fall back to raw if the shape ever changes.
type KgEntity = { entity: string; type?: string; description?: string };
type KgRel = { entity1: string; entity2: string; description?: string };
type KgChunk = { content: string; content_headings?: string };

function parseKg(ctx: string) {
  const entities: KgEntity[] = [];
  const relationships: KgRel[] = [];
  const chunks: KgChunk[] = [];
  for (const m of ctx.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) {
    for (const line of (m[1] ?? "").split("\n")) {
      const s = line.trim();
      if (!s.startsWith("{")) continue;
      try {
        const o = JSON.parse(s);
        if (o.entity1 !== undefined && o.entity2 !== undefined) relationships.push(o);
        else if (o.entity !== undefined) entities.push(o);
        else if (o.content !== undefined) chunks.push(o);
      } catch {
        /* tolerate partial lines */
      }
    }
  }
  const references = [...ctx.matchAll(/^\[\d+\]\s+(.+)$/gm)].map((m) => (m[1] ?? "").trim());
  const found = entities.length + relationships.length + chunks.length + references.length;
  return { entities, relationships, chunks, references, found };
}

const ENTITY_COLOR: Record<string, string> = {
  code: "#3a80d4",
  document: "#2ab870",
  rationale: "#b07ce0",
};

function splitDesc(desc?: string): { file?: string; community?: string } {
  const m = (desc ?? "").match(/ in (.*?) — community (.+)$/);
  if (!m) return {};
  const out: { file?: string; community?: string } = {};
  if (m[1]) out.file = m[1];
  if (m[2]) out.community = m[2];
  return out;
}

function uniqBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="rounded-lg border border-hairline bg-surface-1">
      <p className="border-b border-hairline px-3 py-2 text-[10px] uppercase tracking-wider text-ink-ghost">
        {title} · {count}
      </p>
      <div className="max-h-[360px] overflow-auto p-2">{children}</div>
    </div>
  );
}

function KgResult({ context }: { context: string }) {
  const [raw, setRaw] = useState(false);
  const parsed = parseKg(context);
  const entities = uniqBy(parsed.entities, (e) => e.entity);
  const relationships = uniqBy(parsed.relationships, (r) => `${r.entity1}|${r.description}|${r.entity2}`);
  const chunks = uniqBy(parsed.chunks, (c) => c.content);
  const references = [...new Set(parsed.references)];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-ink-ghost">
          {entities.length} entities · {relationships.length} relations · {chunks.length} chunks
        </p>
        <button
          onClick={() => setRaw((v) => !v)}
          className="rounded border border-hairline px-2 py-0.5 text-[10px] text-ink-tertiary hover:text-ink-secondary"
        >
          {raw ? "Pretty" : "Raw JSON"}
        </button>
      </div>

      {raw || parsed.found === 0 ? (
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg border border-hairline bg-surface-1 px-3 py-3 font-mono text-[11px] leading-relaxed text-ink-tertiary">
          {context || "(empty — nothing retrieved)"}
        </pre>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Section title="Entities" count={entities.length}>
            <div className="space-y-1">
              {entities.map((e, i) => {
                const { file, community } = splitDesc(e.description);
                const c = ENTITY_COLOR[e.type ?? ""] ?? "#637585";
                return (
                  <div key={i} className="rounded px-2 py-1.5 hover:bg-surface-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12px] text-ink-secondary">{e.entity}</span>
                      {e.type && (
                        <span
                          className="shrink-0 rounded px-1 py-0.5 text-[9px] font-mono uppercase"
                          style={{ background: `${c}22`, color: c }}
                        >
                          {e.type}
                        </span>
                      )}
                    </div>
                    {file && <p className="truncate font-mono text-[9px] text-ink-ghost">{file}</p>}
                    {community && <p className="truncate text-[9px] text-ink-ghost/70">▤ {community}</p>}
                  </div>
                );
              })}
            </div>
          </Section>

          <div className="space-y-3">
            <Section title="Relationships" count={relationships.length}>
              <div className="space-y-1">
                {relationships.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 text-[11px]">
                    <span className="truncate text-ink-secondary">{r.entity1}</span>
                    <span className="shrink-0 font-mono text-[9px]" style={{ color: ADITYA }}>
                      ─{r.description ?? "rel"}→
                    </span>
                    <span className="truncate text-ink-secondary">{r.entity2}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Sources" count={references.length}>
              <div className="space-y-0.5">
                {references.map((r, i) => (
                  <p key={i} className="truncate font-mono text-[10px] text-ink-tertiary">
                    {r}
                  </p>
                ))}
              </div>
            </Section>
          </div>

          <div className="lg:col-span-2">
            <Section title="Context chunks" count={chunks.length}>
              <div className="space-y-1">
                {chunks.map((c, i) => (
                  <p key={i} className="rounded px-2 py-1 font-mono text-[10px] text-ink-tertiary hover:bg-surface-2">
                    {c.content_headings ? <span className="text-ink-ghost">{c.content_headings} · </span> : null}
                    {c.content}
                  </p>
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function KgGraphView({ projectId }: { projectId: string }) {
  const { data: graph, isLoading } = useKgGraph(projectId || null);

  if (isLoading) return <p className="p-6 text-center text-xs text-ink-ghost">Loading graph…</p>;
  if (!graph?.available)
    return (
      <div className="rounded-lg border border-hairline bg-surface-1 p-6 text-center text-xs text-ink-ghost">
        No LightRAG store yet — reindex this project to build its knowledge graph.
      </div>
    );
  if (graph.nodes.length === 0)
    return (
      <div className="rounded-lg border border-hairline bg-surface-1 p-6 text-center text-xs text-ink-ghost">
        Graph is empty.
      </div>
    );

  return (
    <div className="relative rounded-lg border border-hairline bg-surface-1">
      <ConstellationGraph nodes={graph.nodes} edges={graph.edges} height={520} />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-hairline bg-surface-2/80 px-2.5 py-1 font-mono text-[10px] text-ink-tertiary backdrop-blur-sm">
        {graph.node_count} nodes · {graph.edge_count} links
        {graph.truncated ? ` · top ${graph.node_count} of ${graph.total_nodes}` : ""}
      </div>
    </div>
  );
}

function KgQueryTab() {
  const { data: projects = [] } = useProjects();
  const kg = useKgQuery();
  const indexed = projects.filter((p) => p.enabled && p.graphify_out);
  const [projectId, setProjectId] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<string>("mix");
  const [view, setView] = useState<"answer" | "graph">("answer");

  const selected = projectId || indexed[0]?.id || "";

  function ask() {
    if (!selected || !query.trim()) return;
    kg.mutate({ id: selected, query: query.trim(), mode });
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink-tertiary">
        A project&apos;s knowledge graph (LightRAG, seeded from graphify — fully local). <b>Answer</b>{" "}
        retrieves KG-aware context for a question; <b>Graph</b> draws the live knowledge graph.
      </p>

      {indexed.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-surface-1 p-6 text-center text-xs text-ink-ghost">
          No indexed projects yet. Enable a project in <span className="text-ink-secondary">Auto-Index</span> and
          reindex it first.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded border border-hairline bg-surface-1 px-2 py-1.5 text-[12px] text-ink-secondary"
            >
              {indexed.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.root_path.split("/").pop() || p.root_path}
                </option>
              ))}
            </select>
            {view === "answer" && (
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="rounded border border-hairline bg-surface-1 px-2 py-1.5 text-[12px] text-ink-secondary"
                title="LightRAG retrieval mode"
              >
                {KG_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
            <div className="ml-auto flex items-center gap-1 rounded border border-hairline p-0.5">
              {(["answer", "graph"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] capitalize transition-colors"
                  style={
                    view === v
                      ? { background: ADITYA, color: "#fff" }
                      : { color: "var(--indra-ink-ghost)" }
                  }
                >
                  {v === "graph" ? <Network className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
                  {v}
                </button>
              ))}
            </div>
          </div>

          {view === "graph" ? (
            <KgGraphView projectId={selected} />
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask()}
                  placeholder="Ask the knowledge graph… e.g. how does auth work?"
                  className="flex-1 rounded border border-hairline bg-surface-1 px-3 py-2 text-[13px] text-ink-secondary placeholder:text-ink-ghost"
                />
                <button
                  onClick={ask}
                  disabled={!query.trim() || kg.isPending}
                  className="flex items-center gap-1.5 rounded px-3 py-2 text-[12px] text-white disabled:opacity-40"
                  style={{ background: ADITYA }}
                >
                  {kg.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
                  Ask
                </button>
              </div>

              {kg.isError && (
                <p className="text-[11px] text-rose-400/80">
                  {(kg.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                    "Query failed — is LightRAG available and the project indexed?"}
                </p>
              )}

              {kg.data && <KgResult context={kg.data.context} />}
            </>
          )}
        </>
      )}
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
          ["kg", "Ask KG"],
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

      {tab === "index" ? <AutoIndexTab /> : tab === "kg" ? <KgQueryTab /> : <WorkflowsTab />}
    </div>
  );
}
