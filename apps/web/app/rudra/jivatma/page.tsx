"use client";

import { useState } from "react";
import { ChevronRight, GitBranch, Users } from "lucide-react";
import type { LineageAncestor, LineageChild } from "@indra/types";
import { useAgents, useAgentLineage } from "@/lib/api/hooks";
import { DevaPageHeader } from "@/components/common/DevaScaffold";
import { Skeleton, SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const RUDRA = "#c44450";

const DOMAIN_COLOR: Record<string, string> = {
  indra: "#4dc8c8",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

const STATUS_COLOR: Record<string, string> = {
  idle: "var(--state-idle)",
  running: "var(--state-healthy)",
  active: "var(--state-healthy)",
  error: "var(--state-critical)",
  completed: "var(--indra-ink-tertiary)",
  dead: "var(--state-dead)",
};

function AncestorChip({ a }: { a: LineageAncestor }) {
  const color = DOMAIN_COLOR[a.domain] ?? "#637585";
  return (
    <div
      className="flex items-center gap-2 rounded border border-hairline bg-surface-2 px-3 py-2 text-xs"
      style={{ borderTop: `2px solid ${color}` }}
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
      className="flex items-center gap-2 rounded border border-hairline bg-surface-2 px-3 py-2 text-xs"
      style={{ borderTop: `2px solid ${color}` }}
    >
      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
      <span className="font-medium text-ink">{c.name}</span>
      <span className="font-mono text-ink-ghost">{c.type}</span>
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
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={RUDRA}
        deva="Jivatma"
        role="Identity"
        title="Agent Identity"
        sanskrit="जीवात्मा"
        description="the individual soul of each agent. Explore lineage, ancestry, and descendants."
      />

      <div className="grid grid-cols-3 gap-6">
        {/* agent selector */}
        <div className="col-span-1">
          <div
            className="overflow-hidden rounded-lg border border-hairline bg-surface-1"
            style={{ borderTop: `2px solid ${RUDRA}` }}
          >
            <div className="border-b border-hairline px-4 py-3">
              <span className="label-caps text-ink-ghost">Select Agent</span>
            </div>
            <div className="max-h-96 divide-y divide-hairline overflow-y-auto">
              {agents.isLoading ? (
                <div className="p-3">
                  <SkeletonRows rows={8} height={48} />
                </div>
              ) : agentList.length === 0 ? (
                <EmptyState
                  icon={Users}
                  accent={RUDRA}
                  title="No agents yet"
                  body="Spawn an agent in Pranah and it will appear here for lineage inspection."
                />
              ) : (
                agentList.map((a) => {
                  const color = DOMAIN_COLOR[a.domain] ?? "#637585";
                  const statusColor = STATUS_COLOR[a.status] ?? "#637585";
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${selectedId === a.id ? "bg-surface-2" : ""}`}
                    >
                      <div
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink">{a.name}</p>
                        <p className="font-mono text-[10px] text-ink-ghost">{a.type}</p>
                      </div>
                      <div
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* lineage view */}
        <div className="col-span-2">
          {!selectedId ? (
            <div className="rounded-lg border border-hairline bg-surface-1">
              <EmptyState
                icon={GitBranch}
                title="Select an agent"
                body="Choose an agent on the left to trace its lineage, ancestry, and descendants."
              />
            </div>
          ) : lineage.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-44 rounded-lg" />
            </div>
          ) : l ? (
            <div className="space-y-4">
              {/* ancestors */}
              {l.ancestors.length > 0 && (
                <div className="space-y-2 rounded-lg border border-hairline bg-surface-1 p-4">
                  <span className="label-caps mb-3 block text-ink-ghost">Ancestors</span>
                  <div className="flex flex-wrap gap-2">
                    {l.ancestors.map((a, i) => (
                      <div key={a.id} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="h-3 w-3 text-ink-ghost" />}
                        <AncestorChip a={a} />
                      </div>
                    ))}
                    <div className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-ink-ghost" />
                      <div
                        className="rounded border-2 bg-surface-3 px-3 py-2 text-xs font-medium text-ink"
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
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-ink">{l.agent.name}</h2>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-ink-muted">{l.agent.id}</p>
                  </div>
                  <span
                    className="rounded px-2 py-1 font-mono text-xs"
                    style={{
                      color: STATUS_COLOR[l.agent.status] ?? "#637585",
                      backgroundColor: `color-mix(in oklab, ${STATUS_COLOR[l.agent.status] ?? "#637585"} 14%, transparent)`,
                    }}
                  >
                    {l.agent.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="label-caps text-ink-ghost">Type</p>
                    <p className="mt-0.5 font-mono text-ink">{l.agent.type}</p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Domain</p>
                    <p
                      className="mt-0.5 font-medium"
                      style={{ color: DOMAIN_COLOR[l.agent.domain] }}
                    >
                      {l.agent.domain.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Children</p>
                    <p className="mt-0.5 font-mono tabular-nums text-ink">{l.agent.children_count}</p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Tokens</p>
                    <p className="mt-0.5 font-mono tabular-nums text-ink">{l.agent.token_count.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Cost</p>
                    <p className="mt-0.5 font-mono tabular-nums text-ink">${Number(l.agent.cost_usd).toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="label-caps text-ink-ghost">Created</p>
                    <p className="mt-0.5 font-mono tabular-nums text-ink">
                      {new Date(l.agent.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* children */}
              {l.children.length > 0 && (
                <div className="rounded-lg border border-hairline bg-surface-1 p-4">
                  <span className="label-caps mb-3 block text-ink-ghost">
                    Direct Children ({l.children.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {l.children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className="transition-opacity hover:opacity-80"
                      >
                        <ChildChip c={c} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-hairline bg-surface-1">
              <EmptyState
                icon={GitBranch}
                accent={RUDRA}
                title="Agent not found"
                body="This agent may have been removed. Pick another from the list."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
