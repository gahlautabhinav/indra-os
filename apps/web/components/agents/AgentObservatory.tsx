"use client";

import { useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { AgentHierarchyNode } from "@indra/types";
import { DOMAIN_COLORS } from "@indra/design-tokens";

// ── Custom node ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  idle: "#4080a0",
  running: "#4dc8c8",
  active: "#2ab870",
  error: "#e04040",
  completed: "#637585",
  dead: "#3d5060",
};

function AgentNode({ data }: NodeProps) {
  const domainColor =
    DOMAIN_COLORS[data.domain as keyof typeof DOMAIN_COLORS] ?? "#4dc8c8";
  const statusColor = STATUS_COLORS[data.status] ?? "#637585";

  return (
    <div
      className="bg-surface-2 border rounded px-3 py-2 min-w-[140px] max-w-[180px]"
      style={{ borderColor: `${domainColor}60` }}
    >
      {/* Status pulse */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{
            backgroundColor: statusColor,
            boxShadow: data.status === "running" ? `0 0 6px ${statusColor}` : undefined,
          }}
        />
        <span
          className="text-xs font-mono uppercase tracking-widest truncate"
          style={{ color: domainColor }}
        >
          {data.domain}
        </span>
      </div>
      <p className="text-xs text-ink-primary font-medium truncate" title={data.name}>
        {data.name}
      </p>
      <p className="text-xs text-ink-tertiary font-mono mt-0.5">{data.type}</p>
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

// ── Layout helper (simple tree layout) ───────────────────────────────────────

function flattenHierarchy(
  nodes: AgentHierarchyNode[],
  parentId: string | null = null,
  depth = 0,
  xOffset = 0
): { nodes: Node[]; edges: Edge[]; width: number } {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  const XGAP = 200;
  const YGAP = 100;
  const NODE_WIDTH = 180;

  let totalWidth = 0;
  let xCursor = xOffset;

  for (const node of nodes) {
    const childResult =
      node.children.length > 0
        ? flattenHierarchy(node.children, node.id, depth + 1, xCursor)
        : { nodes: [], edges: [], width: NODE_WIDTH };

    const nodeX = node.children.length > 0
      ? xCursor + childResult.width / 2 - NODE_WIDTH / 2
      : xCursor;

    rfNodes.push({
      id: node.id,
      type: "agentNode",
      position: { x: nodeX, y: depth * YGAP },
      data: {
        name: node.name,
        type: node.type,
        status: node.status,
        domain: node.domain,
      },
    });

    if (parentId) {
      rfEdges.push({
        id: `e-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        animated: node.status === "running",
        style: { stroke: "#263445", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#263445" },
      });
    }

    rfNodes.push(...childResult.nodes);
    rfEdges.push(...childResult.edges);

    const itemWidth = Math.max(NODE_WIDTH, childResult.width);
    xCursor += itemWidth + XGAP;
    totalWidth += itemWidth + XGAP;
  }

  return { nodes: rfNodes, edges: rfEdges, width: Math.max(totalWidth - XGAP, NODE_WIDTH) };
}

// ── Observatory ───────────────────────────────────────────────────────────────

interface AgentObservatoryProps {
  hierarchy: AgentHierarchyNode[];
  className?: string;
}

export function AgentObservatory({ hierarchy, className = "" }: AgentObservatoryProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const { nodes, edges } = flattenHierarchy(hierarchy);
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [hierarchy, setRfNodes, setRfEdges]);

  return (
    <div
      className={`relative rounded border border-hairline bg-canvas ${className}`}
      style={{ height: 400 }}
    >
      {hierarchy.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-ink-tertiary">
            No agents yet — start a Claude Code session to see it appear here.
          </p>
        </div>
      ) : (
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#263445" gap={24} size={1} />
          <Controls
            className="!bg-surface-2 !border-hairline"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-surface-1 !border-hairline"
            nodeColor={(n) =>
              DOMAIN_COLORS[n.data?.domain as keyof typeof DOMAIN_COLORS] ?? "#4dc8c8"
            }
            maskColor="#07090daa"
          />
        </ReactFlow>
      )}
    </div>
  );
}
