"use client";

import { useState } from "react";
import { Network, RefreshCw, Plus, Trash2, X, Search } from "lucide-react";
import type { KnowledgeNode, KnowledgeEdge } from "@indra/types";
import { ConstellationGraph } from "@/components/knowledge/ConstellationGraph";
import {
  useKnowledgeGraph,
  useSyncAgentNodes,
  useCreateKnowledgeNode,
  useDeleteKnowledgeNode,
  useCreateKnowledgeEdge,
  useDeleteKnowledgeEdge,
} from "@/lib/api/hooks";

const ACCENT = "#d4843a";

const ENTITY_COLORS: Record<string, string> = {
  agent: "#8aa0b4",
  plugin: "#4dc8c8",
  project: "#e0b050",
  session: "#2ab870",
  task: "#e0a030",
  mcp_server: "#9a44d4",
  custom: "#637585",
};

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex flex-col gap-0.5 px-4 py-2.5 rounded-[6px] border border-hairline bg-surface-2 min-w-[100px]"
      style={{ borderTop: `2px solid ${ACCENT}` }}
    >
      <span className="label-caps text-ink-ghost">{label}</span>
      <span className="font-mono font-bold tabular-nums text-ink-primary" style={{ fontSize: "22px", lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

function AddNodeModal({ onClose }: { onClose: () => void }) {
  const [entityType, setEntityType] = useState("custom");
  const [entityId, setEntityId] = useState("");
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState("vasu");
  const create = useCreateKnowledgeNode();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    create.mutate(
      {
        entity_type: entityType,
        label: label.trim(),
        domain,
        ...(entityId.trim() ? { entity_id: entityId.trim() } : {}),
      },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative rounded-[12px] border border-hairline bg-surface-1 w-full max-w-md p-6 shadow-xl"
        style={{ borderTop: `2px solid ${ACCENT}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="label-caps" style={{ color: ACCENT }}>Add Knowledge Node</span>
          <button type="button" onClick={onClose} className="text-ink-ghost hover:text-ink-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-caps text-ink-ghost block mb-1">Entity Type</label>
            <select
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-hairline-bright"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              {["agent", "session", "task", "mcp_server", "custom"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-caps text-ink-ghost block mb-1">Label</label>
            <input
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-hairline-bright"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Node label"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-caps text-ink-ghost block mb-1">Entity ID (opt)</label>
              <input
                className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-hairline-bright"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="uuid..."
              />
            </div>
            <div>
              <label className="label-caps text-ink-ghost block mb-1">Domain</label>
              <select
                className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-hairline-bright"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                {["indra", "vasu", "rudra", "aditya", "prajapati"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="label-caps text-ink-ghost hover:text-ink-secondary px-3 py-1.5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="label-caps px-4 py-1.5 rounded text-white"
            style={{ backgroundColor: ACCENT, opacity: create.isPending ? 0.6 : 1 }}
          >
            {create.isPending ? "Adding…" : "Add Node"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddEdgeModal({ nodes, onClose }: { nodes: KnowledgeNode[]; onClose: () => void }) {
  const [fromId, setFromId] = useState(nodes[0]?.id ?? "");
  const [toId, setToId] = useState(nodes[1]?.id ?? "");
  const [relationship, setRelationship] = useState("depends_on");
  const create = useCreateKnowledgeEdge();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { from_node_id: fromId, to_node_id: toId, relationship },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative rounded-[12px] border border-hairline bg-surface-1 w-full max-w-md p-6 shadow-xl"
        style={{ borderTop: `2px solid ${ACCENT}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="label-caps" style={{ color: ACCENT }}>Add Knowledge Edge</span>
          <button type="button" onClick={onClose} className="text-ink-ghost hover:text-ink-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-caps text-ink-ghost block mb-1">From Node</label>
            <select
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm text-ink focus:outline-none"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.label} ({n.entity_type})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-caps text-ink-ghost block mb-1">Relationship</label>
            <input
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-hairline-bright"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="spawned / calls / depends_on"
              required
            />
          </div>
          <div>
            <label className="label-caps text-ink-ghost block mb-1">To Node</label>
            <select
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm text-ink focus:outline-none"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.label} ({n.entity_type})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="label-caps text-ink-ghost hover:text-ink-secondary px-3 py-1.5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="label-caps px-4 py-1.5 rounded text-white"
            style={{ backgroundColor: ACCENT, opacity: create.isPending ? 0.6 : 1 }}
          >
            {create.isPending ? "Adding…" : "Add Edge"}
          </button>
        </div>
      </form>
    </div>
  );
}

type Tab = "graph" | "nodes" | "edges";

export default function NaksatraniPage() {
  const [tab, setTab] = useState<Tab>("graph");
  const [search, setSearch] = useState("");
  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);

  const { data: graph, isLoading } = useKnowledgeGraph();
  const sync = useSyncAgentNodes();
  const delNode = useDeleteKnowledgeNode();
  const delEdge = useDeleteKnowledgeEdge();

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];

  const filteredNodes = search
    ? nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()) || n.entity_type.includes(search.toLowerCase()))
    : nodes;

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="p-6 space-y-5">
      {showAddNode && <AddNodeModal onClose={() => setShowAddNode(false)} />}
      {showAddEdge && nodes.length >= 2 && (
        <AddEdgeModal nodes={nodes} onClose={() => setShowAddEdge(false)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps mb-1" style={{ color: ACCENT }}>
            Nakṣatrāṇi · Knowledge Graph
          </p>
          <h1 className="font-bold tracking-tight text-ink-primary" style={{ fontSize: "28px", letterSpacing: "-0.8px" }}>
            Entity Graph
          </h1>
          <p className="mt-1 text-sm text-ink-tertiary">
            The constellation of CLIs, projects and agent sessions — and how they connect across tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="flex items-center gap-1.5 label-caps px-3 py-2 rounded border border-hairline hover:border-hairline-bright transition-colors text-ink-ghost hover:text-ink-secondary"
          >
            <RefreshCw className={`w-3 h-3 ${sync.isPending ? "animate-spin" : ""}`} />
            {sync.isPending ? "Syncing…" : "Sync Agents"}
          </button>
          <button
            onClick={() => setShowAddNode(true)}
            className="flex items-center gap-1.5 label-caps px-3 py-2 rounded border border-hairline hover:border-hairline-bright transition-colors"
            style={{ color: ACCENT }}
          >
            <Plus className="w-3 h-3" />
            Node
          </button>
          {nodes.length >= 2 && (
            <button
              onClick={() => setShowAddEdge(true)}
              className="flex items-center gap-1.5 label-caps px-3 py-2 rounded border border-hairline hover:border-hairline-bright transition-colors"
              style={{ color: ACCENT }}
            >
              <Plus className="w-3 h-3" />
              Edge
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-start gap-3 flex-wrap">
        <StatChip label="Nodes" value={graph?.node_count ?? "—"} />
        <StatChip label="Edges" value={graph?.edge_count ?? "—"} />
        {sync.data && (
          <div className="flex items-center self-center text-xs text-ink-muted font-mono">
            Synced {sync.data.synced} agent nodes
          </div>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-[6px] border border-hairline">
          {(["graph", "nodes", "edges"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`label-caps px-3 py-1 rounded-[4px] transition-colors ${
                tab === t ? "bg-surface-4 text-ink-primary" : "text-ink-ghost hover:text-ink-tertiary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "nodes" && (
          <div className="flex items-center gap-2 rounded border border-hairline bg-surface-2 px-3 py-1.5 text-xs">
            <Search className="w-3 h-3 text-ink-ghost" />
            <input
              className="bg-transparent text-ink-secondary placeholder:text-ink-ghost outline-none"
              placeholder="Filter nodes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Constellation / Table */}
      {tab === "graph" ? (
        isLoading ? (
          <div className="h-[560px] rounded-xl border border-hairline bg-surface-1 animate-pulse" />
        ) : nodes.length === 0 ? (
          <div className="flex h-[560px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-surface-1">
            <Network className="h-7 w-7 text-ink-ghost opacity-40" />
            <p className="text-sm text-ink-ghost">No constellation yet — click “Sync Agents” to build it</p>
          </div>
        ) : (
          <ConstellationGraph nodes={nodes} edges={edges} />
        )
      ) : (
      <div
        className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden"
        style={{ borderTop: `2px solid ${ACCENT}` }}
      >
        {tab === "nodes" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-hairline bg-surface-2">
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">Label</th>
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">Type</th>
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">Domain</th>
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">Entity ID</th>
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">Created</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-5 rounded bg-surface-2 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : !filteredNodes.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Network className="w-8 h-8 text-ink-ghost opacity-30 mx-auto mb-2" />
                      <p className="text-ink-ghost text-sm">
                        {search ? "No nodes match filter" : "No nodes yet — sync agents or add manually"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredNodes.map((n: KnowledgeNode) => {
                    const typeColor = ENTITY_COLORS[n.entity_type] ?? ENTITY_COLORS.custom;
                    return (
                      <tr key={n.id} className="border-b border-hairline last:border-0 hover:bg-surface-2 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-ink">{n.label}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-flex items-center text-[10px] font-mono rounded px-1.5 py-0.5"
                            style={{ color: typeColor, backgroundColor: `${typeColor}18` }}
                          >
                            {n.entity_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-ink-ghost font-mono">{n.domain}</td>
                        <td className="px-4 py-2.5 text-ink-ghost font-mono text-[10px]">
                          {n.entity_id ? n.entity_id.slice(0, 12) + "…" : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-ink-ghost font-mono">
                          {new Date(n.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => {
                              if (confirm(`Delete node "${n.label}"? This will also delete connected edges.`)) {
                                delNode.mutate(n.id);
                              }
                            }}
                            className="p-1 rounded text-ink-ghost hover:text-state-critical hover:bg-surface-3 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-hairline bg-surface-2">
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">From</th>
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">Relationship</th>
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">To</th>
                  <th className="label-caps text-left px-4 py-2.5 text-ink-ghost">Weight</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-5 rounded bg-surface-2 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : !edges.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <p className="text-ink-ghost text-sm">No edges yet — add nodes first, then connect them</p>
                    </td>
                  </tr>
                ) : (
                  edges.map((e: KnowledgeEdge) => {
                    const fromNode = nodeById[e.from_node_id];
                    const toNode = nodeById[e.to_node_id];
                    return (
                      <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-surface-2 transition-colors">
                        <td className="px-4 py-2.5 text-ink-secondary">{fromNode?.label ?? e.from_node_id.slice(0, 8)}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className="text-[10px] font-mono rounded px-1.5 py-0.5"
                            style={{ color: ACCENT, backgroundColor: `${ACCENT}18` }}
                          >
                            {e.relationship}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-ink-secondary">{toNode?.label ?? e.to_node_id.slice(0, 8)}</td>
                        <td className="px-4 py-2.5 text-ink-ghost font-mono">{e.weight.toFixed(1)}</td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => {
                              if (confirm("Delete this edge?")) delEdge.mutate(e.id);
                            }}
                            className="p-1 rounded text-ink-ghost hover:text-state-critical hover:bg-surface-3 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
