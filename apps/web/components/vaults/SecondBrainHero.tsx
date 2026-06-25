"use client";

import { useState } from "react";
import { Network, Orbit } from "lucide-react";
import type { VaultProject, VaultSummary } from "@indra/types";
import { useVaultsCombinedGraph } from "@/lib/api/hooks";
import { ConstellationGraph } from "@/components/knowledge/ConstellationGraph";
import { SecondBrainConstellation } from "./SecondBrainConstellation";

const ADITYA = "#3a80d4";
type Mode = "graph" | "orbit";

export function SecondBrainHero({
  projects,
  onOpenVault,
}: {
  projects: VaultProject[];
  onOpenVault: (v: VaultSummary) => void;
}) {
  const [mode, setMode] = useState<Mode>("graph");
  const { data: graph, isLoading } = useVaultsCombinedGraph();

  return (
    <div className="relative">
      {/* mode toggle */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-md border border-hairline bg-surface-2/80 p-0.5 backdrop-blur-sm">
        {([
          ["graph", "Graph", Network],
          ["orbit", "Orbit", Orbit],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px]"
            style={
              mode === id
                ? { background: `${ADITYA}22`, color: ADITYA }
                : { color: "var(--indra-ink-ghost)" }
            }
          >
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>

      {mode === "orbit" ? (
        <SecondBrainConstellation projects={projects} onOpenVault={onOpenVault} />
      ) : isLoading || !graph ? (
        <div className="flex h-[460px] items-center justify-center rounded-2xl border border-hairline bg-surface-1 text-xs text-ink-ghost">
          Weaving the second brain…
        </div>
      ) : (
        <div className="relative">
          <ConstellationGraph nodes={graph.nodes} edges={graph.edges} height={460} />
          <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-hairline bg-surface-2/80 px-2.5 py-1 font-mono text-[10px] text-ink-tertiary backdrop-blur-sm">
            {graph.node_count} nodes · {graph.edge_count} links · {graph.vault_count} vaults
          </div>
        </div>
      )}
    </div>
  );
}
