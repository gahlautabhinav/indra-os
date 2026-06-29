"use client";

import { useState } from "react";
import { SearchIcon, TrashIcon, DatabaseIcon, ZapIcon } from "lucide-react";
import {
  useMemoryChunks,
  useMemoryStats,
  useIngestMemory,
  useSearchMemory,
  useDeleteMemoryChunk,
  useProjects,
} from "@/lib/api/hooks";

const SOURCE_TYPES = ["graph_symbol", "community", "vault_note", "session", "trace"];
import type { MemoryChunk, MemorySearchResult } from "@indra/types";

const ADITYA = "#3a80d4";

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 px-4 py-2.5 rounded-[6px] border border-hairline bg-surface-2 min-w-[120px]"
      style={{ borderTop: `2px solid ${ADITYA}` }}
    >
      <span className="label-caps text-ink-ghost">{label}</span>
      <span
        className="font-mono font-bold tabular-nums"
        style={{ fontSize: "22px", lineHeight: 1, color: color ?? "#e8eef4" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Chunk card ────────────────────────────────────────────────────────────────

function ChunkCard({
  chunk,
  similarity,
  onDelete,
}: {
  chunk: MemoryChunk | MemorySearchResult;
  similarity?: number;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="group rounded-[8px] border border-hairline bg-surface-1 p-3 transition-colors hover:bg-surface-2">
      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-secondary leading-relaxed line-clamp-3">
            {chunk.content}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Embedding badge */}
            <span
              className="label-caps px-1.5 py-0.5 rounded-[3px]"
              style={{
                background: chunk.has_embedding
                  ? "rgba(58,128,212,0.15)"
                  : "rgba(99,117,133,0.12)",
                color: chunk.has_embedding ? ADITYA : "#637585",
              }}
            >
              {chunk.has_embedding ? "⬡ embedded" : "◻ text only"}
            </span>

            {/* Source type (ingested second-brain chunks) */}
            {chunk.source_type && (
              <span
                className="label-caps px-1.5 py-0.5 rounded-[3px]"
                style={{ background: "rgba(124,106,247,0.14)", color: "#9a8cf7" }}
              >
                {chunk.source_type}
              </span>
            )}

            {/* Similarity score */}
            {similarity !== undefined && (
              <span
                className="label-caps px-1.5 py-0.5 rounded-[3px]"
                style={{ background: "rgba(42,184,112,0.12)", color: "#2ab870" }}
              >
                {(similarity * 100).toFixed(1)}% match
              </span>
            )}

            {/* Agent id */}
            {chunk.agent_id && (
              <span className="font-mono text-ink-ghost" style={{ fontSize: "10px" }}>
                agent {chunk.agent_id.slice(0, 8)}…
              </span>
            )}

            {/* Timestamp */}
            <span className="font-mono text-ink-ghost ml-auto" style={{ fontSize: "10px" }}>
              {new Date(chunk.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Delete */}
        <div className="shrink-0">
          {confirming ? (
            <div className="flex gap-1">
              <button
                onClick={() => { onDelete(chunk.id); setConfirming(false); }}
                className="label-caps px-2 py-1 rounded bg-critical/20 text-critical hover:bg-critical/30 transition-colors"
                style={{ fontSize: "10px", color: "#e04040" }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="label-caps px-2 py-1 rounded hover:bg-surface-3 transition-colors text-ink-ghost"
                style={{ fontSize: "10px" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-3"
              aria-label="Delete chunk"
            >
              <TrashIcon className="h-3.5 w-3.5 text-ink-ghost" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ingest panel ──────────────────────────────────────────────────────────────

function IngestPanel({ onSuccess }: { onSuccess: () => void }) {
  const [content, setContent] = useState("");
  const { mutateAsync: ingest, isPending } = useIngestMemory();

  const handleIngest = async () => {
    if (!content.trim()) return;
    await ingest({ content: content.trim() });
    setContent("");
    onSuccess();
  };

  return (
    <div
      className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden"
      style={{ borderTop: `2px solid ${ADITYA}` }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-surface-2">
        <DatabaseIcon className="h-3.5 w-3.5" style={{ color: ADITYA }} />
        <span className="label-caps text-ink-secondary">Ingest Memory Chunk</span>
      </div>
      <div className="p-4 space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste content to store as a memory chunk — it's embedded locally (model2vec) for semantic search."
          className="w-full rounded-[6px] border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-ghost resize-none focus:outline-none focus:ring-1 focus:ring-[#3a80d4]/50"
          rows={5}
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-ink-ghost" style={{ fontSize: "11px" }}>
            {content.length} / 32,000 chars
          </span>
          <button
            onClick={handleIngest}
            disabled={!content.trim() || isPending}
            className="label-caps px-4 py-1.5 rounded-[6px] transition-colors disabled:opacity-40"
            style={{
              background: ADITYA,
              color: "#fff",
            }}
          >
            {isPending ? "Ingesting…" : "Ingest"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Search panel ──────────────────────────────────────────────────────────────

function SearchPanel({
  onResults,
}: {
  onResults: (results: MemorySearchResult[], mode: string, query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [sourceTypes, setSourceTypes] = useState<string[]>([]);
  const { data: projects = [] } = useProjects();
  const { mutateAsync: search, isPending } = useSearchMemory();

  const toggleType = (t: string) =>
    setSourceTypes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const handleSearch = async () => {
    if (!query.trim()) return;
    const resp = await search({
      query: query.trim(),
      limit: 20,
      similarity_threshold: 0.1,
      ...(projectId ? { project_id: projectId } : {}),
      ...(sourceTypes.length ? { source_types: sourceTypes } : {}),
    });
    onResults(resp.results, resp.search_mode, resp.query);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
          placeholder="Search the second brain — symbols, communities, anything…"
          className="flex-1 rounded-[6px] border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-ghost focus:outline-none focus:ring-1 focus:ring-[#3a80d4]/50"
        />
        <button
          onClick={() => void handleSearch()}
          disabled={!query.trim() || isPending}
          className="flex items-center gap-1.5 label-caps px-4 py-2 rounded-[6px] transition-colors disabled:opacity-40"
          style={{ background: ADITYA, color: "#fff" }}
        >
          <SearchIcon className="h-3.5 w-3.5" />
          {isPending ? "Searching…" : "Search"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-[5px] border border-hairline bg-surface-2 px-2 py-1 text-[11px] text-ink-secondary focus:outline-none"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.root_path.split(/[\\/]/).pop() || p.root_path}
            </option>
          ))}
        </select>
        {SOURCE_TYPES.map((t) => {
          const on = sourceTypes.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className="rounded px-2 py-1 text-[10px] font-mono"
              style={
                on
                  ? { background: "rgba(124,106,247,0.18)", color: "#9a8cf7" }
                  : { background: "var(--indra-surface-2)", color: "var(--indra-ink-ghost)" }
              }
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MemoryBrowser() {
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [searchMeta, setSearchMeta] = useState<{ mode: string; query: string } | null>(null);

  const { data: stats } = useMemoryStats();
  const { data: chunksData, isLoading: chunksLoading, refetch: refetchChunks } = useMemoryChunks({ limit: 50 });
  const { mutateAsync: deleteChunk } = useDeleteMemoryChunk();

  const handleDelete = async (id: string) => {
    await deleteChunk(id);
    if (searchResults) {
      setSearchResults((prev) => prev?.filter((r) => r.id !== id) ?? null);
    }
  };

  const displayChunks = searchResults ?? chunksData?.chunks ?? [];
  const isSearchMode = searchResults !== null;

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="flex items-start gap-3 flex-wrap">
        <StatChip
          label="Total Chunks"
          value={stats?.total_chunks ?? "—"}
        />
        <StatChip
          label="Embedded"
          value={stats?.chunks_with_embedding ?? "—"}
          color={ADITYA}
        />
        <StatChip
          label="Coverage"
          value={stats ? `${stats.embedding_coverage_pct}%` : "—"}
          {...(stats?.embedding_coverage_pct === 100 ? { color: "#2ab870" } : {})}
        />
        <div
          className="flex flex-col gap-0.5 px-4 py-2.5 rounded-[6px] border border-hairline bg-surface-2 min-w-[120px]"
          style={{ borderTop: `2px solid ${ADITYA}` }}
        >
          <span className="label-caps text-ink-ghost">Embedding</span>
          <span className="flex items-center gap-1.5 mt-0.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background: stats?.embedding_enabled ? "#2ab870" : "#637585",
              }}
            />
            <span
              className="font-mono text-sm"
              style={{ color: stats?.embedding_enabled ? "#2ab870" : "#637585" }}
            >
              {stats?.embedding_enabled ? "Local" : "Disabled"}
            </span>
          </span>
        </div>
      </div>

      {/* Ingest */}
      <IngestPanel onSuccess={() => void refetchChunks()} />

      {/* Search */}
      <div
        className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden"
        style={{ borderTop: `2px solid ${ADITYA}` }}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-surface-2">
          <ZapIcon className="h-3.5 w-3.5" style={{ color: ADITYA }} />
          <span className="label-caps text-ink-secondary">RAG Search</span>
          {stats?.embedding_enabled && (
            <span
              className="ml-auto label-caps px-1.5 py-0.5 rounded-[3px]"
              style={{ background: "rgba(58,128,212,0.12)", color: ADITYA }}
            >
              vector mode
            </span>
          )}
          {!stats?.embedding_enabled && (
            <span
              className="ml-auto label-caps px-1.5 py-0.5 rounded-[3px]"
              style={{ background: "rgba(99,117,133,0.12)", color: "#637585" }}
            >
              trigram fallback
            </span>
          )}
        </div>
        <div className="p-4 space-y-4">
          <SearchPanel
            onResults={(results, mode, query) => {
              setSearchResults(results);
              setSearchMeta({ mode, query });
            }}
          />
          {isSearchMode && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-tertiary">
                {searchMeta?.mode === "vector" ? "⬡ Vector" : "◻ Trigram"} search ·{" "}
                <span className="text-ink-secondary">&ldquo;{searchMeta?.query}&rdquo;</span>
                {" "}— {searchResults?.length ?? 0} results
              </p>
              <button
                onClick={() => { setSearchResults(null); setSearchMeta(null); }}
                className="label-caps text-ink-ghost hover:text-ink-secondary transition-colors"
                style={{ fontSize: "10px" }}
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chunk list / search results */}
      <div
        className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden"
        style={{ borderTop: `2px solid ${ADITYA}` }}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-surface-2">
          <span className="label-caps text-ink-secondary flex-1">
            {isSearchMode ? "Search Results" : "All Memory Chunks"}
          </span>
          <span className="font-mono text-ink-ghost" style={{ fontSize: "11px" }}>
            {isSearchMode
              ? `${searchResults?.length ?? 0} matched`
              : `${chunksData?.total ?? 0} total`}
          </span>
        </div>

        <div className="p-3 space-y-2" style={{ maxHeight: "500px", overflowY: "auto" }}>
          {chunksLoading && !isSearchMode ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-[6px]" />
            ))
          ) : displayChunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
                style={{ background: "rgba(58,128,212,0.1)" }}
              >
                <DatabaseIcon className="h-5 w-5" style={{ color: ADITYA, opacity: 0.5 }} />
              </div>
              <p className="label-caps text-ink-ghost mb-1">
                {isSearchMode ? "No Results" : "No Memory Chunks"}
              </p>
              <p className="text-xs text-ink-tertiary">
                {isSearchMode
                  ? "Try a different query or lower the similarity threshold."
                  : "Ingest content above to build INDRA's memory."}
              </p>
            </div>
          ) : (
            displayChunks.map((chunk) => (
              <ChunkCard
                key={chunk.id}
                chunk={chunk}
                {...("similarity" in chunk ? { similarity: (chunk as MemorySearchResult).similarity } : {})}
                onDelete={(id) => void handleDelete(id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
