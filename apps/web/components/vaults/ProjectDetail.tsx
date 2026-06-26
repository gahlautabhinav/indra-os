"use client";

import { useMemo, useState } from "react";
import { Activity, ExternalLink, Globe, Network, ScrollText } from "lucide-react";
import type { VaultProject } from "@indra/types";
import { useGraphHtml, useKgGraph, useSessions } from "@/lib/api/hooks";
import { ConstellationGraph } from "@/components/knowledge/ConstellationGraph";
import { VaultDetail } from "./VaultDetail";

const ADITYA = "#3a80d4";

type Tab = "notes" | "graph" | "html" | "sessions";

const PLUGIN_COLOR: Record<string, string> = {
  claude_code: "#d4843a",
  gemini_cli: "#4dc8c8",
  codex_cli: "#7c6af7",
  kiro_cli: "#2ab870",
  opencode: "#e04040",
  antigravity: "#a855f7",
};

function norm(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

// ── KG graph (LightRAG, cleaned) ──────────────────────────────────────────────
function GraphPane({ projectId }: { projectId: string }) {
  const { data: graph, isLoading } = useKgGraph(projectId || null);
  if (isLoading) return <Centered>Building knowledge graph…</Centered>;
  if (!graph?.available)
    return <Centered>No LightRAG store yet — reindex this project to build its KG.</Centered>;
  if (graph.nodes.length === 0) return <Centered>Graph is empty.</Centered>;
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <p className="text-[11px] text-ink-ghost">
        {graph.node_count} nodes · {graph.edge_count} links
        {graph.truncated ? (
          <span className="ml-1 text-amber-400/80">(top {graph.node_count} of {graph.total_nodes})</span>
        ) : null}
      </p>
      <div className="min-h-0 flex-1">
        <ConstellationGraph nodes={graph.nodes} edges={graph.edges} height={520} />
      </div>
    </div>
  );
}

// ── graphify graph.html (fetched authed, rendered sandboxed) ───────────────────
function HtmlPane({ projectId }: { projectId: string }) {
  const { data: html, isLoading, isError } = useGraphHtml(projectId || null);
  if (isLoading) return <Centered>Loading graph.html…</Centered>;
  if (isError || !html) return <Centered>No graph.html for this project.</Centered>;

  function openFull() {
    const url = URL.createObjectURL(new Blob([html as string], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b border-hairline px-3 py-1.5">
        <button
          onClick={openFull}
          className="flex items-center gap-1 rounded border border-hairline px-2 py-1 text-[11px] text-ink-tertiary hover:text-ink-secondary"
        >
          <ExternalLink className="h-3 w-3" /> Open full
        </button>
      </div>
      <iframe
        // Trusted local artifact (graphify's own output). Sandboxed to scripts only.
        srcDoc={html}
        sandbox="allow-scripts"
        title="graphify graph.html"
        className="min-h-0 flex-1 bg-white"
      />
    </div>
  );
}

// ── Sessions for this project root ────────────────────────────────────────────
function SessionsPane({ projectRoot }: { projectRoot: string }) {
  const { data } = useSessions({ limit: 200 });
  const target = norm(projectRoot);
  const sessions = useMemo(
    () => (data?.items ?? []).filter((s) => s.project_path && norm(s.project_path) === target),
    [data, target]
  );
  if (sessions.length === 0) return <Centered>No CLI sessions for this project.</Centered>;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="space-y-1">
        {sessions.map((s) => {
          const c = PLUGIN_COLOR[s.plugin_type] ?? "#8aa0b4";
          return (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded border border-hairline bg-surface-1 px-3 py-2"
            >
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase"
                style={{ background: `${c}22`, color: c }}
              >
                {s.plugin_type}
              </span>
              <span className="truncate font-mono text-[11px] text-ink-secondary">
                {s.external_id ?? s.id.slice(0, 8)}
              </span>
              <span className="ml-auto text-[10px] text-ink-ghost">
                {s.status} · {new Date(s.started_at).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-ink-ghost">
      {children}
    </div>
  );
}

export function ProjectDetail({ project }: { project: VaultProject }) {
  const canGraph = !!project.project_id && project.indexed;
  const hasNotes = project.vaults.length > 0;
  const [tab, setTab] = useState<Tab>(hasNotes ? "notes" : canGraph ? "graph" : "sessions");

  const tabs = [
    hasNotes && (["notes", "Notes", ScrollText] as const),
    canGraph && (["graph", "KG Graph", Network] as const),
    canGraph && (["html", "graph.html", Globe] as const),
    (["sessions", "Sessions", Activity] as const),
  ].filter(Boolean) as ReadonlyArray<readonly [Tab, string, typeof Activity]>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="text-sm font-semibold text-ink-primary">{project.leaf}</span>
        <span className="font-mono text-[11px] text-ink-ghost">· {project.project_root}</span>
        <span className="text-[10px] text-ink-ghost">
          {project.session_count} sessions · {project.vaults.length} vault
          {project.vaults.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-1 rounded-md border border-hairline bg-surface-2 p-0.5">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px]"
              style={
                tab === id ? { background: `${ADITYA}22`, color: ADITYA } : { color: "var(--indra-ink-ghost)" }
              }
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "notes" && hasNotes ? (
          <VaultDetail vault={project.vaults[0]!} />
        ) : tab === "graph" && project.project_id ? (
          <GraphPane projectId={project.project_id} />
        ) : tab === "html" && project.project_id ? (
          <HtmlPane projectId={project.project_id} />
        ) : (
          <SessionsPane projectRoot={project.project_root} />
        )}
      </div>
    </div>
  );
}
