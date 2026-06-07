"use client";

import { useState } from "react";
import { ChevronRight, GitBranch } from "lucide-react";
import type { LineageAncestor, LineageChild } from "@indra/types";
import { useAgents, useAgentLineage } from "@/lib/api/hooks";

const DOMAIN_COLOR: Record<string, string> = {
  indra: "#4dc8c8",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

const STATUS_COLOR: Record<string, string> = {
  idle: "#4080a0",
  running: "#2ab870",
  active: "#2ab870",
  error: "#c44450",
  completed: "#637585",
  dead: "#3d5060",
};

function AncestorChip({ a }: { a: LineageAncestor }) {
  const color = DOMAIN_COLOR[a.domain] ?? "#637585";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded border border-hairline bg-surface-2 text-xs"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <span className="font-medium text-ink">{a.name}</span>
      <span className="text-ink-ghost">·</span>
      <span className="font-mono text-ink-ghost">{a.type}</span>
    </div>
  );
}

function ChildChip({ c }: { c: LineageChild }) {
  const color = DOMAIN_COLOR[c.domain] ?? "#637585";
  const statusColor = STATUS_COLOR[c.status] ?? "#637585";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded border border-hairline bg-surface-2 text-xs"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
      <span className="font-medium text-ink">{c.name}</span>
      <span className="text-ink-ghost font-mono">{c.type}</span>
    </div>
  );
}

export default function JivatmaPage() {
  const agents = useAgents({ limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lineage = useAgentLineage(selectedId);

  const agentList = agents.data?.agents ?? [];
  const l = lineage.data;

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div>
        <h1 className="text-xl font-semibold text-ink">Agent Identity</h1>
        <p className="text-sm text-ink-muted mt-1">
          Jivatma — the individual soul of each agent. Explore lineage, ancestry, and descendants.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* agent selector */}
        <div className="col-span-1">
          <div className="rounded-lg border border-hairline bg-surface-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-hairline">
              <span className="label-caps text-ink-ghost">Select Agent</span>
            </div>
            <div className="divide-y divide-hairline max-h-96 overflow-y-auto">
              {agentList.map((a) => {
                const color = DOMAIN_COLOR[a.domain] ?? "#637585";
                const statusColor = STATUS_COLOR[a.status] ?? "#637585";
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors ${selectedId === a.id ? "bg-surface-2" : ""}`}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: statusColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{a.name}</p>
                      <p className="text-[10px] font-mono text-ink-ghost">{a.type}</p>
                    </div>
                    <div
                      className="w-1 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  </button>
                );
              })}
              {agentList.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-ink-ghost">No agents</div>
              )}
            </div>
          </div>
        </div>

        {/* lineage view */}
        <div className="col-span-2">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-64 text-ink-ghost gap-3 rounded-lg border border-hairline bg-surface-1">
              <GitBranch className="w-8 h-8 opacity-30" />
              <p className="text-sm">Select an agent to view its lineage</p>
            </div>
          ) : lineage.isLoading ? (
            <div className="flex items-center justify-center h-64 text-ink-ghost text-sm rounded-lg border border-hairline bg-surface-1">
              Loading lineage…
            </div>
          ) : l ? (
            <div className="space-y-4">
              {/* ancestors */}
              {l.ancestors.length > 0 && (
                <div className="rounded-lg border border-hairline bg-surface-1 p-4 space-y-2">
                  <span className="label-caps text-ink-ghost block mb-3">Ancestors</span>
                  <div className="flex flex-wrap gap-2">
                    {l.ancestors.map((a, i) => (
                      <div key={a.id} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="w-3 h-3 text-ink-ghost" />}
                        <AncestorChip a={a} />
                      </div>
                    ))}
                    <div className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-ink-ghost" />
                      <div
                        className="px-3 py-2 rounded border-2 bg-surface-3 text-xs font-medium text-ink"
                        style={{
                          borderColor: DOMAIN_COLOR[l.agent.domain] ?? "#637585",
                        }}
                      >
                        {l.agent.name} (this agent)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* agent profile */}
              <div
                className="rounded-lg border border-hairline bg-surface-1 p-4"
                style={{
                  borderTop: `2px solid ${DOMAIN_COLOR[l.agent.domain] ?? "#637585"}`,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-ink">{l.agent.name}</h2>
                    <p className="text-xs text-ink-muted font-mono mt-0.5">{l.agent.id}</p>
                  </div>
                  <span
                    className="text-xs font-mono px-2 py-1 rounded"
                    style={{
                      color: STATUS_COLOR[l.agent.status] ?? "#637585",
                      backgroundColor: `${STATUS_COLOR[l.agent.status] ?? "#637585"}18`,
                    }}
                  >
                    {l.agent.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="label-caps text-ink-ghost">Type</p>
                    <p className="text-ink font-mono mt-0.5">{l.agent.type}</p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Domain</p>
                    <p
                      className="font-medium mt-0.5"
                      style={{ color: DOMAIN_COLOR[l.agent.domain] }}
                    >
                      {l.agent.domain.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Children</p>
                    <p className="text-ink font-mono mt-0.5">{l.agent.children_count}</p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Tokens</p>
                    <p className="text-ink font-mono mt-0.5">{l.agent.token_count.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Cost</p>
                    <p className="text-ink font-mono mt-0.5">${Number(l.agent.cost_usd).toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Created</p>
                    <p className="text-ink font-mono mt-0.5">
                      {new Date(l.agent.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* children */}
              {l.children.length > 0 && (
                <div className="rounded-lg border border-hairline bg-surface-1 p-4">
                  <span className="label-caps text-ink-ghost block mb-3">
                    Direct Children ({l.children.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {l.children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <ChildChip c={c} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-ink-ghost text-sm rounded-lg border border-hairline bg-surface-1">
              Agent not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
