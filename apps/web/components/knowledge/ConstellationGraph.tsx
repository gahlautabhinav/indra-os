"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

// ── Visual vocab ──────────────────────────────────────────────────────────────

// Structural minimum the graph needs. KnowledgeNode/KnowledgeEdge (master graph)
// and VaultGraphNode/VaultGraphEdge (per-vault graph) are both assignable.
export interface GraphNodeLike {
  id: string;
  entity_type: string;
  entity_id?: string | null;
  label: string;
  properties?: Record<string, unknown> | null;
}
export interface GraphEdgeLike {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relationship: string;
}

const PLUGIN_COLOR: Record<string, string> = {
  claude_code: "#d4843a",
  gemini_cli: "#4dc8c8",
  codex_cli: "#7c6af7",
  kiro_cli: "#2ab870",
  opencode: "#e04040",
  antigravity: "#a855f7",
};

// Palette for graphify "community" clusters in a per-vault graph.
const COMMUNITY_PALETTE = [
  "#6dd5e8", "#e0b050", "#7c6af7", "#2ab870", "#e0708a", "#d4843a",
  "#4dc8c8", "#a855f7", "#9acd4d", "#e04040", "#5a9ccf", "#c98ae0",
  "#48b3a0", "#d4b33a", "#8a7cff", "#6db86d", "#e08a5a", "#5ab0e0",
];

function nodeColor(n: GraphNodeLike): string {
  // Explicit per-node colour (e.g. combined vault clusters) wins.
  const explicit = n.properties?.color;
  if (typeof explicit === "string") return explicit;
  if (n.entity_type === "plugin") return PLUGIN_COLOR[n.entity_id ?? ""] ?? "#4dc8c8";
  if (n.entity_type === "project") return "#e0b050";
  if (n.entity_type === "mcp_server") return "#9a44d4";
  if (n.entity_type === "vault") return "#6db86d";
  if (n.entity_type === "symbol") {
    const c = n.properties?.community;
    if (typeof c === "number") return COMMUNITY_PALETTE[c % COMMUNITY_PALETTE.length]!;
    return "#6dd5e8";
  }
  const plugin = (n.properties?.plugin as string) ?? "";
  return PLUGIN_COLOR[plugin] ?? "#8aa0b4";
}

const REL_COLOR: Record<string, string> = {
  worked_in: "#e0b050",
  runs_on: "#4dc8c8",
  spawned: "#c44450",
  registered_with: "#9a44d4",
  documents: "#6db86d",
};

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null; // pinned (while dragged) position
  fy: number | null;
}

// d3-force-ish constants
const K_REP = 1600;
const K_SPRING = 0.035;
const REST = 90;
const K_CENTER = 0.015;
const VEL_DECAY = 0.6;
const ALPHA_DECAY = 0.0225;
const ALPHA_MIN = 0.004;

// ── Component ──────────────────────────────────────────────────────────────────

export function ConstellationGraph({
  nodes,
  edges,
  height = 560,
}: {
  nodes: GraphNodeLike[];
  edges: GraphEdgeLike[];
  height?: number;
}) {
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of edges) {
      d.set(e.from_node_id, (d.get(e.from_node_id) ?? 0) + 1);
      d.set(e.to_node_id, (d.get(e.to_node_id) ?? 0) + 1);
    }
    return d;
  }, [edges]);

  const { idx, links } = useMemo(() => {
    const m = new Map<string, number>();
    nodes.forEach((n, i) => m.set(n.id, i));
    const l: [number, number][] = [];
    for (const e of edges) {
      const a = m.get(e.from_node_id);
      const b = m.get(e.to_node_id);
      if (a != null && b != null) l.push([a, b]);
    }
    return { idx: m, links: l };
  }, [nodes, edges]);

  const bodies = useRef<Body[]>([]);
  const alpha = useRef(1);
  const dragNode = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [, frame] = useReducer((x: number) => x + 1, 0);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [hover, setHover] = useState<string | null>(null);
  const panRef = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  // (re)initialise bodies whenever the node set changes
  useEffect(() => {
    const N = nodes.length;
    bodies.current = nodes.map((_, i) => {
      const a = (i / Math.max(N, 1)) * Math.PI * 2;
      const r = 150 + ((i * 53) % 200);
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0, fx: null, fy: null };
    });
    alpha.current = 1;
    // fit view to a rough bound
    const w = wrapRef.current?.clientWidth ?? 900;
    setView({ x: w / 2, y: height / 2, k: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // one simulation step
  const tick = useCallback(() => {
    const b = bodies.current;
    const N = b.length;
    if (N === 0) return;
    const a = alpha.current;

    // repulsion (many-body)
    for (let i = 0; i < N; i++) {
      const bi = b[i]!;
      for (let j = i + 1; j < N; j++) {
        const bj = b[j]!;
        let dx = bi.x - bj.x;
        let dy = bi.y - bj.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = (i - j) * 0.1 + 0.1;
          dy = 0.1;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const f = (K_REP / d2) * a;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        bi.vx += fx;
        bi.vy += fy;
        bj.vx -= fx;
        bj.vy -= fy;
      }
    }
    // springs
    for (const [u, v] of links) {
      const bu = b[u]!;
      const bv = b[v]!;
      const dx = bv.x - bu.x;
      const dy = bv.y - bu.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - REST) * K_SPRING * a;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      bu.vx += fx;
      bu.vy += fy;
      bv.vx -= fx;
      bv.vy -= fy;
    }
    // centering
    for (let i = 0; i < N; i++) {
      const bi = b[i]!;
      bi.vx -= bi.x * K_CENTER * a;
      bi.vy -= bi.y * K_CENTER * a;
    }
    // integrate
    for (let i = 0; i < N; i++) {
      const bi = b[i]!;
      if (bi.fx != null) {
        bi.x = bi.fx;
        bi.y = bi.fy!;
        bi.vx = 0;
        bi.vy = 0;
        continue;
      }
      bi.vx *= VEL_DECAY;
      bi.vy *= VEL_DECAY;
      bi.x += bi.vx;
      bi.y += bi.vy;
    }
    alpha.current = a + (0 - a) * ALPHA_DECAY;
  }, [links]);

  // animation loop — runs while there's energy or an active drag
  const ensureRunning = useCallback(() => {
    if (rafRef.current != null) return;
    const loop = () => {
      tick();
      frame();
      if (alpha.current > ALPHA_MIN || dragNode.current != null) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [tick]);

  useEffect(() => {
    ensureRunning();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [ensureRunning, nodes]);

  const reheat = useCallback(
    (a = 0.5) => {
      alpha.current = Math.max(alpha.current, a);
      ensureRunning();
    },
    [ensureRunning]
  );

  const neighbours = useMemo(() => {
    if (!hover) return null;
    const s = new Set<string>([hover]);
    for (const e of edges) {
      if (e.from_node_id === hover) s.add(e.to_node_id);
      if (e.to_node_id === hover) s.add(e.from_node_id);
    }
    return s;
  }, [hover, edges]);

  function radius(n: GraphNodeLike): number {
    const deg = degree.get(n.id) ?? 0;
    if (n.entity_type === "plugin") return 13 + Math.min(deg, 40) * 0.2;
    if (n.entity_type === "project") return 7 + Math.min(deg, 20) * 0.45;
    if (n.entity_type === "vault") return 8 + Math.min(deg, 20) * 0.35;
    if (n.entity_type === "mcp_server") return 7;
    if (n.entity_type === "symbol") return 3.5 + Math.min(deg, 30) * 0.12;
    return 4;
  }

  // screen → graph coords
  const toGraph = (clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - (rect?.left ?? 0) - v.x) / v.k,
      y: (clientY - (rect?.top ?? 0) - v.y) / v.k,
    };
  };

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    const mx = e.clientX - (rect?.left ?? 0);
    const my = e.clientY - (rect?.top ?? 0);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => {
      const k = Math.max(0.15, Math.min(4, v.k * factor));
      return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
    });
  }

  function nodeMouseDown(e: React.MouseEvent, i: number) {
    e.stopPropagation();
    dragNode.current = i;
    const b = bodies.current[i];
    if (b) {
      const g = toGraph(e.clientX, e.clientY);
      b.fx = g.x;
      b.fy = g.y;
    }
    reheat(0.5);
  }

  function onBgDown(e: React.MouseEvent) {
    panRef.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
  }

  function onMove(e: React.MouseEvent) {
    const di = dragNode.current;
    if (di != null) {
      const b = bodies.current[di];
      if (b) {
        const g = toGraph(e.clientX, e.clientY);
        b.fx = g.x;
        b.fy = g.y;
      }
      reheat(0.3);
      return;
    }
    if (panRef.current) {
      const p = panRef.current;
      setView((v) => ({ ...v, x: p.vx + (e.clientX - p.sx), y: p.vy + (e.clientY - p.sy) }));
    }
  }

  function onUp() {
    const di = dragNode.current;
    if (di != null) {
      const b = bodies.current[di];
      if (b) {
        // release pin so it rejoins the simulation where dropped
        b.fx = null;
        b.fy = null;
      }
      dragNode.current = null;
      reheat(0.25);
    }
    panRef.current = null;
  }

  const b = bodies.current;

  return (
    <div
      ref={wrapRef}
      className="relative select-none overflow-hidden rounded-xl border border-hairline bg-surface-1"
      style={{ height }}
      onWheel={onWheel}
      onMouseDown={onBgDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "30px 30px",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" style={{ cursor: panRef.current ? "grabbing" : "grab" }}>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {edges.map((e) => {
            const a = idx.get(e.from_node_id);
            const c = idx.get(e.to_node_id);
            if (a == null || c == null) return null;
            const ba = b[a];
            const bc = b[c];
            if (!ba || !bc) return null;
            const active = !neighbours || (neighbours.has(e.from_node_id) && neighbours.has(e.to_node_id));
            return (
              <line
                key={e.id}
                x1={ba.x}
                y1={ba.y}
                x2={bc.x}
                y2={bc.y}
                stroke={REL_COLOR[e.relationship] ?? "#33455a"}
                strokeWidth={active ? 1 : 0.5}
                strokeOpacity={neighbours ? (active ? 0.55 : 0.05) : 0.18}
              />
            );
          })}
          {nodes.map((n, i) => {
            const bi = b[i];
            if (!bi) return null;
            const c = nodeColor(n);
            const r = radius(n);
            const dim = neighbours ? !neighbours.has(n.id) : false;
            const isHub =
              n.entity_type === "plugin" || n.entity_type === "project" || n.entity_type === "vault";
            return (
              <g
                key={n.id}
                transform={`translate(${bi.x} ${bi.y})`}
                opacity={dim ? 0.2 : 1}
                style={{ cursor: "grab" }}
                onMouseDown={(e) => nodeMouseDown(e, i)}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
              >
                <circle r={r + 4} fill={c} opacity={0.14} />
                <circle r={r} fill={c} stroke="#0c1018" strokeWidth={1} />
                {(isHub || hover === n.id) && (
                  <text
                    x={r + 4}
                    y={3}
                    fontSize={isHub ? 11 : 10}
                    fill={isHub ? "#e8eef4" : "#a8b8c8"}
                    style={{ pointerEvents: "none", fontWeight: isHub ? 600 : 400 }}
                  >
                    {n.label.length > 36 ? n.label.slice(0, 36) + "…" : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-hairline bg-surface-2/80 px-3 py-2 text-[10px] backdrop-blur-sm">
        {[
          ["Plugin", "#4dc8c8"],
          ["Project", "#e0b050"],
          ["Agent", "#8aa0b4"],
          ["MCP", "#9a44d4"],
          ["Vault", "#6db86d"],
          ["Symbol", "#6dd5e8"],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1 text-ink-tertiary">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <div className="absolute right-3 top-3 rounded-md border border-hairline bg-surface-2/80 px-2.5 py-1 font-mono text-[10px] text-ink-ghost backdrop-blur-sm">
        drag nodes · scroll = zoom · drag bg = pan
      </div>
    </div>
  );
}
