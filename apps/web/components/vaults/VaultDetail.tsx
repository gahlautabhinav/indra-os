"use client";

import { useMemo, useState } from "react";
import { Network, ScrollText, Search } from "lucide-react";
import type { VaultSummary } from "@indra/types";
import { useVaultGraph, useVaultNotes } from "@/lib/api/hooks";
import { ConstellationGraph } from "@/components/knowledge/ConstellationGraph";
import { NoteReader } from "./NoteReader";

const ADITYA = "#3a80d4";

type SubTab = "notes" | "graph";

export function VaultDetail({ vault }: { vault: VaultSummary }) {
  const [tab, setTab] = useState<SubTab>("notes");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data: notesData, isLoading: notesLoading } = useVaultNotes(vault.id, { limit: 500 });
  const { data: graph, isLoading: graphLoading } = useVaultGraph(tab === "graph" ? vault.id : null);

  const notes = useMemo(() => {
    const all = notesData?.notes ?? [];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((n) => n.stem.toLowerCase().includes(q));
  }, [notesData, query]);

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="text-sm font-semibold text-ink-primary">{vault.name}</span>
        {vault.project_root && (
          <span className="font-mono text-[11px] text-ink-ghost">· {vault.project_root}</span>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-md border border-hairline bg-surface-2 p-0.5">
          {([
            ["notes", "Notes", ScrollText],
            ["graph", "Graph", Network],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px]"
              style={
                tab === id
                  ? { background: `${ADITYA}22`, color: ADITYA }
                  : { color: "var(--indra-ink-ghost)" }
              }
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "notes" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr]">
          {/* note list */}
          <div className="flex min-h-0 flex-col border-r border-hairline">
            <div className="flex items-center gap-1.5 border-b border-hairline px-2.5 py-1.5">
              <Search className="h-3 w-3 text-ink-ghost" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${notesData?.total ?? 0} notes…`}
                className="w-full bg-transparent text-[12px] text-ink-secondary outline-none placeholder:text-ink-ghost"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {notesLoading ? (
                <p className="p-3 text-xs text-ink-ghost">Loading notes…</p>
              ) : notes.length === 0 ? (
                <p className="p-3 text-xs text-ink-ghost">No notes.</p>
              ) : (
                notes.map((n) => (
                  <button
                    key={n.name}
                    onClick={() => setSelected(n.name)}
                    className="block w-full truncate px-3 py-1.5 text-left font-mono text-[11px] hover:bg-surface-2"
                    style={
                      selected === n.name
                        ? { background: "var(--indra-surface-2)", color: "var(--indra-ink-primary)" }
                        : { color: "var(--indra-ink-tertiary)" }
                    }
                    title={n.stem}
                  >
                    {n.stem}
                  </button>
                ))
              )}
            </div>
          </div>
          {/* reader */}
          <NoteReader
            vaultId={vault.id}
            vaultName={vault.name}
            name={selected}
            onWiki={(t) => setSelected(t)}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden p-3">
          {graphLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-ink-ghost">
              Building constellation…
            </div>
          ) : !graph || !graph.is_graphify || graph.nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-ink-ghost">
              No graph for this vault.
            </div>
          ) : (
            <div className="flex h-full flex-col gap-2">
              <p className="text-[11px] text-ink-ghost">
                {graph.node_count} nodes · {graph.edge_count} edges · {graph.community_count} communities
                {graph.truncated && (
                  <span className="ml-1 text-amber-400/80">
                    (showing {graph.node_count} of {graph.total_node_count})
                  </span>
                )}
              </p>
              <div className="min-h-0 flex-1">
                <ConstellationGraph nodes={graph.nodes} edges={graph.edges} height={520} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
