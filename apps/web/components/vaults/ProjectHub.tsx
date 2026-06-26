"use client";

import { useState } from "react";
import { Activity, BookOpen, FolderGit2, Network, X } from "lucide-react";
import type { VaultProject, VaultSummary } from "@indra/types";
import { useVaultProjects } from "@/lib/api/hooks";
import { StatTile } from "@/components/common/DevaScaffold";
import { SecondBrainHero } from "./SecondBrainHero";
import { VaultDetail } from "./VaultDetail";
import { ProjectDetail } from "./ProjectDetail";

const ADITYA = "#3a80d4";

function ProjectCard({
  p,
  onOpen,
  onOpenProject,
}: {
  p: VaultProject;
  onOpen: (v: VaultSummary) => void;
  onOpenProject: (p: VaultProject) => void;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4">
      <button
        onClick={() => onOpenProject(p)}
        className="group flex w-full items-center gap-2 text-left"
        title="Open project — notes, KG graph, graph.html, sessions"
      >
        <FolderGit2 className="h-4 w-4" style={{ color: ADITYA }} />
        <span className="truncate text-sm font-semibold text-ink-primary group-hover:text-white">
          {p.leaf}
        </span>
        {p.indexed && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-ink-ghost group-hover:text-ink-tertiary">
            <Network className="h-2.5 w-2.5" /> KG
          </span>
        )}
      </button>
      <p className="mt-0.5 truncate font-mono text-[10px] text-ink-ghost">{p.project_root}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="flex items-center gap-1 text-ink-tertiary">
          <Activity className="h-3 w-3" /> {p.session_count} sessions
        </span>
        {p.active_count > 0 && (
          <span className="rounded px-1.5 py-0.5 text-[10px] text-emerald-400" style={{ background: "#2ab87022" }}>
            {p.active_count} active
          </span>
        )}
        <span className="flex items-center gap-1 text-ink-tertiary">
          <BookOpen className="h-3 w-3" /> {p.vaults.length} vault{p.vaults.length === 1 ? "" : "s"}
        </span>
      </div>

      {p.vaults.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-hairline pt-3">
          {p.vaults.map((v) => (
            <button
              key={v.id}
              onClick={() => onOpen(v)}
              className="flex w-full items-center gap-2 rounded border border-hairline bg-surface-2 px-2.5 py-1.5 text-left hover:bg-surface-3"
            >
              <BookOpen className="h-3 w-3" style={{ color: ADITYA }} />
              <span className="truncate text-[12px] text-ink-secondary">{v.name}</span>
              <span className="ml-auto flex items-center gap-2 text-[10px] text-ink-ghost">
                <span>{v.note_count}n</span>
                {v.graph && (
                  <span className="flex items-center gap-0.5">
                    <Network className="h-2.5 w-2.5" /> {v.graph.node_count}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectHub() {
  const { data, isLoading } = useVaultProjects();
  const projects = data?.projects ?? [];
  const [open, setOpen] = useState<VaultSummary | null>(null);
  const [openProject, setOpenProject] = useState<VaultProject | null>(null);

  return (
    <div className="space-y-4">
      {!isLoading && projects.length > 0 && (
        <SecondBrainHero projects={projects} onOpenVault={setOpen} />
      )}

      <div className="flex flex-wrap gap-3">
        <StatTile accent={ADITYA} label="Projects" value={data?.counts.projects ?? 0} />
        <StatTile accent="#6db86d" label="With a vault" value={data?.counts.with_vaults ?? 0} />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-ink-ghost">Joining projects, vaults & sessions…</div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-sm text-ink-ghost">No projects yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.project_root} p={p} onOpen={setOpen} onOpenProject={setOpenProject} />
          ))}
        </div>
      )}

      {/* vault detail overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setOpen(null)}
        >
          <div
            className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-hairline bg-canvas shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
              <span className="text-xs text-ink-ghost">Vault · {open.project_root}</span>
              <button onClick={() => setOpen(null)} className="text-ink-ghost hover:text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <VaultDetail vault={open} />
            </div>
          </div>
        </div>
      )}

      {/* consolidated project detail overlay */}
      {openProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setOpenProject(null)}
        >
          <div
            className="flex h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-hairline bg-canvas shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
              <span className="text-xs text-ink-ghost">Project · Second Brain</span>
              <button
                onClick={() => setOpenProject(null)}
                className="text-ink-ghost hover:text-ink-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ProjectDetail project={openProject} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
