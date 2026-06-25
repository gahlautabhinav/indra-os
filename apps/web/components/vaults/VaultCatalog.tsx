"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CircleDot, Link2, Network } from "lucide-react";
import type { VaultSummary } from "@indra/types";
import { useVaults } from "@/lib/api/hooks";
import { StatTile } from "@/components/common/DevaScaffold";
import { VaultDetail } from "./VaultDetail";

const ADITYA = "#3a80d4";

function VaultCard({
  v,
  selected,
  onClick,
}: {
  v: VaultSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border bg-surface-1 p-3 text-left transition-colors hover:bg-surface-2"
      style={{ borderColor: selected ? ADITYA : "var(--indra-hairline)" }}
    >
      <div className="flex items-center gap-2">
        <BookOpen className="h-3.5 w-3.5" style={{ color: ADITYA }} />
        <span className="truncate text-[13px] font-medium text-ink-primary">{v.name}</span>
        {v.open && (
          <span className="flex items-center gap-0.5 text-[9px] text-emerald-400">
            <CircleDot className="h-2.5 w-2.5" /> open
          </span>
        )}
      </div>
      {v.project_root && (
        <p className="mt-1 truncate font-mono text-[10px] text-ink-ghost">{v.project_root}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-ink-tertiary">
        <span>{v.note_count} notes</span>
        {v.graph && (
          <span className="flex items-center gap-1">
            <Network className="h-2.5 w-2.5" /> {v.graph.node_count}·{v.graph.edge_count}
          </span>
        )}
        {v.matched_project && (
          <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5" style={{ background: `${ADITYA}22`, color: ADITYA }}>
            <Link2 className="h-2.5 w-2.5" /> linked
          </span>
        )}
        {!v.exists && <span className="text-rose-400/80">missing</span>}
      </div>
    </button>
  );
}

export function VaultCatalog() {
  const { data, isLoading } = useVaults();
  const vaults = useMemo(() => data?.vaults ?? [], [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default to the first available graphify vault.
  useEffect(() => {
    if (selectedId || vaults.length === 0) return;
    const first = vaults.find((v) => v.exists && v.is_graphify) ?? vaults[0];
    if (first) setSelectedId(first.id);
  }, [vaults, selectedId]);

  const selected = vaults.find((v) => v.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatTile accent={ADITYA} label="Vaults" value={data?.counts.total ?? 0} />
        <StatTile accent="#6db86d" label="Graphify" value={data?.counts.graphify ?? 0} />
        <StatTile accent="#7c6af7" label="Linked to project" value={data?.counts.matched ?? 0} />
        <StatTile accent="#e0708a" label="Missing" value={data?.counts.missing ?? 0} />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-ink-ghost">Scanning vaults…</div>
      ) : vaults.length === 0 ? (
        <div className="py-12 text-center text-sm text-ink-ghost">
          No Obsidian vaults registered.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {vaults.map((v) => (
              <VaultCard
                key={v.id}
                v={v}
                selected={v.id === selectedId}
                onClick={() => setSelectedId(v.id)}
              />
            ))}
          </div>
          <div className="h-[640px] overflow-hidden rounded-lg border border-hairline bg-surface-1">
            {selected ? (
              <VaultDetail vault={selected} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink-ghost">
                Select a vault.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
