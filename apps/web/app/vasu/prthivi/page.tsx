"use client";

import { useState } from "react";
import { Folder, FolderOpen, File, Plus, RefreshCw, Trash2, HardDrive, X } from "lucide-react";
import type { Workspace, WorkspaceFile } from "@indra/types";
import {
  useWorkspaces,
  useStorageAnalytics,
  useWorkspaceFiles,
  useCreateWorkspace,
  useReindexWorkspace,
  useDeleteWorkspace,
} from "@/lib/api/hooks";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const ACCENT = "#d4843a";

function WorkspaceCard({
  ws,
  selected,
  onSelect,
  onReindex,
  onDelete,
}: {
  ws: Workspace;
  selected: boolean;
  onSelect: () => void;
  onReindex: () => void;
  onDelete: () => void;
}) {
  const statusColor = ws.status === "active" ? "#2ab870" : ws.status === "error" ? "#c44450" : "#637585";

  return (
    <div
      className={`rounded-[10px] border border-hairline p-4 cursor-pointer transition-all ${
        selected ? "bg-surface-3" : "bg-surface-1 hover:bg-surface-2"
      }`}
      style={selected ? { borderTop: `2px solid ${ACCENT}` } : {}}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <FolderOpen className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
          ) : (
            <Folder className="w-4 h-4 shrink-0 text-ink-ghost" />
          )}
          <span className="text-sm font-medium text-ink truncate">{ws.name}</span>
        </div>
        <span
          className="text-[10px] font-mono rounded px-1.5 py-0.5 shrink-0"
          style={{ color: statusColor, backgroundColor: `${statusColor}18` }}
        >
          {ws.status}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] font-mono text-ink-ghost truncate">{ws.path}</p>

      <div className="mt-3 flex items-center gap-3 font-mono tabular-nums text-[11px] text-ink-muted">
        <span>{ws.file_count.toLocaleString()} files</span>
        <span>·</span>
        <span>{formatBytes(ws.size_bytes)}</span>
        {ws.last_indexed_at && (
          <>
            <span>·</span>
            <span>indexed {timeAgo(ws.last_indexed_at)}</span>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onReindex}
          className="flex items-center gap-1 text-[11px] font-mono text-ink-ghost hover:text-ink-secondary transition-colors"
          title="Re-index workspace"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Index</span>
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-[11px] font-mono text-ink-ghost hover:text-state-critical transition-colors ml-auto"
          title="Remove workspace"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function FileBrowser({
  wsId,
  wsName,
}: {
  wsId: string;
  wsName: string;
}) {
  const [currentPath, setCurrentPath] = useState("");
  const { data, isLoading } = useWorkspaceFiles(wsId, currentPath);

  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];

  return (
    <div className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden" style={{ borderTop: `2px solid ${ACCENT}` }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-hairline bg-surface-2 flex items-center gap-2 flex-wrap">
        <span className="label-caps" style={{ color: ACCENT }}>{wsName}</span>
        <span className="text-hairline-bright">·</span>
        <button
          className="text-[11px] font-mono text-ink-ghost hover:text-ink-secondary transition-colors"
          onClick={() => setCurrentPath("")}
        >
          /
        </button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-ink-ghost text-[11px]">/</span>
            <button
              className="text-[11px] font-mono text-ink-ghost hover:text-ink-secondary transition-colors"
              onClick={() => setCurrentPath(pathParts.slice(0, i + 1).join("/"))}
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      {/* File list */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)", minHeight: "300px" }}>
        {isLoading ? (
          <SkeletonRows rows={8} height={36} className="p-4" />
        ) : !data?.entries.length ? (
          <EmptyState
            icon={Folder}
            accent={ACCENT}
            title="Empty directory"
            body="Nothing indexed at this path yet — re-index the workspace or browse a different folder."
          />
        ) : (
          <>
            {currentPath && (
              <button
                onClick={() => {
                  const parts = currentPath.split("/").filter(Boolean);
                  setCurrentPath(parts.slice(0, -1).join("/"));
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-hairline hover:bg-surface-2 transition-colors"
              >
                <Folder className="w-4 h-4 text-ink-ghost" />
                <span className="text-sm text-ink-ghost">..</span>
              </button>
            )}
            {data.entries.map((entry: WorkspaceFile) => (
              <button
                key={entry.path}
                onClick={() => entry.type === "directory" && setCurrentPath(entry.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-hairline last:border-0 transition-colors ${
                  entry.type === "directory" ? "hover:bg-surface-2" : "cursor-default"
                }`}
              >
                {entry.type === "directory" ? (
                  <Folder className="w-4 h-4 shrink-0" style={{ color: ACCENT, opacity: 0.7 }} />
                ) : (
                  <File className="w-4 h-4 shrink-0 text-ink-ghost" />
                )}
                <span className={`text-sm flex-1 truncate ${entry.type === "directory" ? "text-ink-secondary" : "text-ink-muted"}`}>
                  {entry.name}
                </span>
                {entry.type === "file" && (
                  <span className="text-[11px] font-mono tabular-nums text-ink-ghost shrink-0">
                    {formatBytes(entry.size)}
                  </span>
                )}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="px-4 py-2 border-t border-hairline">
        <span className="text-[10px] font-mono tabular-nums text-ink-ghost">
          {data?.total ?? 0} entries · {data?.path ?? "/"}
        </span>
      </div>
    </div>
  );
}

function AddWorkspaceModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [desc, setDesc] = useState("");
  const create = useCreateWorkspace();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;
    create.mutate(
      { name: name.trim(), path: path.trim(), ...(desc.trim() ? { description: desc.trim() } : {}) },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative rounded-xl border border-hairline bg-surface-1 w-full max-w-md p-6"
        style={{ borderTop: `2px solid ${ACCENT}`, boxShadow: "var(--shadow-floating)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="label-caps" style={{ color: ACCENT }}>Add Workspace</span>
          <button type="button" onClick={onClose} className="text-ink-ghost hover:text-ink-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-caps text-ink-ghost block mb-1">Name</label>
            <input
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-hairline-bright"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
            />
          </div>
          <div>
            <label className="label-caps text-ink-ghost block mb-1">Path</label>
            <input
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-hairline-bright"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/home/user/project"
              required
            />
          </div>
          <div>
            <label className="label-caps text-ink-ghost block mb-1">Description (optional)</label>
            <input
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-hairline-bright"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What this workspace contains"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="label-caps text-ink-ghost hover:text-ink-secondary transition-colors px-3 py-1.5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="label-caps px-4 py-1.5 rounded text-white transition-colors"
            style={{ backgroundColor: ACCENT, opacity: create.isPending ? 0.6 : 1 }}
          >
            {create.isPending ? "Adding…" : "Add Workspace"}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PrthiviPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: workspaces, isLoading } = useWorkspaces();
  const { data: analytics } = useStorageAnalytics();
  const reindex = useReindexWorkspace();
  const del = useDeleteWorkspace();

  const selected = workspaces?.find((w) => w.id === selectedId) ?? null;

  return (
    <div className="p-6 space-y-5">
      {showAdd && <AddWorkspaceModal onClose={() => setShowAdd(false)} />}

      {/* Page header */}
      <DevaPageHeader
        accent={ACCENT}
        deva="Pṛthivī"
        role="Storage"
        title="Storage & Workspace"
        sanskrit="पृथ्वी"
        description="filesystem roots tracked by INDRA — indexed and browsable."
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 label-caps px-3 py-2 rounded border border-hairline hover:border-hairline-bright transition-colors"
            style={{ color: ACCENT }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Workspace
          </button>
        }
      />

      {/* Stats strip */}
      <div className="flex items-start gap-3 flex-wrap">
        <StatTile accent={ACCENT} label="Workspaces" value={analytics?.total_workspaces ?? "—"} />
        <StatTile accent={ACCENT} label="Active" value={analytics?.active_workspaces ?? "—"} />
        <StatTile accent={ACCENT} label="Total Files" value={analytics ? analytics.total_files.toLocaleString() : "—"} />
        <StatTile accent={ACCENT} label="Total Size" value={analytics?.total_size_human ?? "—"} />
      </div>

      {/* Split: workspace list + file browser */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "300px 1fr" }}>
        {/* Workspace list */}
        <div className="space-y-2">
          {isLoading ? (
            <SkeletonRows rows={3} height={112} />
          ) : !workspaces?.length ? (
            <div
              className="rounded-[12px] border border-dashed border-hairline bg-surface-1"
              style={{ borderTop: `2px solid ${ACCENT}` }}
            >
              <EmptyState
                icon={HardDrive}
                accent={ACCENT}
                title="No workspaces yet"
                body="Add a filesystem root and INDRA will index it so agents can browse and search its files."
                action={
                  <button
                    onClick={() => setShowAdd(true)}
                    className="label-caps text-xs px-3 py-1.5 rounded border border-hairline hover:border-hairline-bright transition-colors"
                    style={{ color: ACCENT }}
                  >
                    Add first workspace
                  </button>
                }
              />
            </div>
          ) : (
            workspaces.map((ws: Workspace) => (
              <WorkspaceCard
                key={ws.id}
                ws={ws}
                selected={selectedId === ws.id}
                onSelect={() => setSelectedId(selectedId === ws.id ? null : ws.id)}
                onReindex={() => reindex.mutate(ws.id)}
                onDelete={() => {
                  if (confirm(`Remove workspace "${ws.name}"?`)) {
                    del.mutate(ws.id);
                    if (selectedId === ws.id) setSelectedId(null);
                  }
                }}
              />
            ))
          )}
        </div>

        {/* File browser */}
        {selected ? (
          <FileBrowser wsId={selected.id} wsName={selected.name} />
        ) : (
          <div className="rounded-[12px] border border-dashed border-hairline bg-surface-1 min-h-[300px]">
            <EmptyState
              icon={Folder}
              accent={ACCENT}
              title="Select a workspace"
              body="Click a workspace card to browse its indexed files and folders."
            />
          </div>
        )}
      </div>
    </div>
  );
}
