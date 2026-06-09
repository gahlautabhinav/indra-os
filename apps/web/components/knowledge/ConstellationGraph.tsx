"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KnowledgeNode, KnowledgeEdge } from "@indra/types";

// ── Visual vocab ──────────────────────────────────────────────────────────────

const PLUGIN_COLOR: Record<string, string> = {
  claude_code: "#d4843a",
  gemini_cli: "#4dc8c8",
  codex_cli: "#7c6af7",
  kiro_cli: "#2ab870",
  opencode: "#e04040",
  antigravity: "#a855f7",
};

function nodeColor(n: KnowledgeNode): string {
  if (n.entity_type === "plugin") return PLUGIN_COLOR[n.entity_id ?? ""] ?? "#4dc8c8";
  if (n.entity_type === "project") return "#e0b050";
  if (n.entity_type === "mcp_server") return "#9a44d4";
  // agent — tint by its CLI
  const plugin = (n.properties?.plugin as string) ?? "";
  return PLUGIN_COLOR[plugin] ?? "#8aa0b4";
}

const REL_COLOR: Record<string, string> = {
  worked_in: "#e0b050",
  runs_on: "#4dc8c8",
  spawned: "#c44450",
  registered_with: "#9a44d4",
};

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ── Force layout (compact Fruchterman–Reingold-ish) ───────────────────────────

function layout(nodes: KnowledgeNode[], edges: KnowledgeEdge[], degree: Map<string, number>) {
  const N = nodes.length;
  const idx = new Map<string, number>();
  nodes.forEach((n, i) => idx.set(n.id, i));

  // deterministic pseudo-random initial ring (no Math.random for stable layout)
  const pos: P[] = nodes.map((n, i) => {
    const a = (i / Math.max(N, 1)) * Math.PI * 2;
    const r = 200 + ((i * 53) % 160);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0 };
  });

  const links: [number, number][] = [];
  for (const e of edges) {
    const a = idx.get(e.from_node_id);
    const b = idx.get(e.to_node_id);
    if (a != null && b != null) links.push([a, b]);
  }

  const K_REP = 1400;
  const K_SPRING = 0.02;
  const REST = 90;
  const K_GRAV = 0.012;
  const ITER = 240;

  for (let it = 0; it < ITER; it++) {
    const cool = 1 - it / ITER;
    for (let i = 0; i < N; i++) {
      const p = pos[i]!;
      p.vx = 0;
      p.vy = 0;
    }
    // repulsion
    for (let i = 0; i < N; i++) {
      const pi = pos[i]!;
      for (let j = i + 1; j < N; j++) {
        const pj = pos[j]!;
        let dx = pi.x - pj.x;
        let dy = pi.y - pj.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = (i - j) * 0.1 + 0.1;
          dy = 0.1;
          d2 = dx * dx + dy * dy;
        }
        const f = K_REP / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        pi.vx += fx;
        pi.vy += fy;
        pj.vx -= fx;
        pj.vy -= fy;
      }
    }
    // springs
    for (const [a, b] of links) {
      const pa = pos[a]!;
      const pb = pos[b]!;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - REST) * K_SPRING;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      pa.vx += fx;
      pa.vy += fy;
      pb.vx -= fx;
      pb.vy -= fy;
    }
    // gravity to center (stronger for low-degree nodes so hubs spread out)
    for (let i = 0; i < N; i++) {
      const p = pos[i]!;
      const g = K_GRAV / Math.max(1, (degree.get(nodes[i]!.id) ?? 1) * 0.5);
      p.vx -= p.x * g;
      p.vy -= p.y * g;
    }
    // integrate (clamped)
    const max = 18 * cool + 2;
    for (let i = 0; i < N; i++) {
      const p = pos[i]!;
      p.x += Math.max(-max, Math.min(max, p.vx * cool));
      p.y += Math.max(-max, Math.min(max, p.vy * cool));
    }
  }
  return { pos, idx };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ConstellationGraph({
  nodes,
  edges,
  height = 560,
}: {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
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

  const { pos, idx } = useMemo(() => layout(nodes, edges, degree), [nodes, edges, degree]);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fit the initial view to the layout bounds.
  useEffect(() => {
    if (!nodes.length) return;
    const xs = pos.map((p) => p.x);
    const ys = pos.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = wrapRef.current?.clientWidth ?? 900;
    const pad = 80;
    const k = Math.min((w - pad) / (maxX - minX || 1), (height - pad) / (maxY - minY || 1), 1.4);
    setView({ x: w / 2 - ((minX + maxX) / 2) * k, y: height / 2 - ((minY + maxY) / 2) * k, k });
  }, [pos, nodes.length, height]);

  // neighbours of hovered node (for highlight)
  const neighbours = useMemo(() => {
    if (!hover) return null;
    const s = new Set<string>([hover]);
    for (const e of edges) {
      if (e.from_node_id === hover) s.add(e.to_node_id);
      if (e.to_node_id === hover) s.add(e.from_node_id);
    }
    return s;
  }, [hover, edges]);

  function radius(n: KnowledgeNode): number {
    const deg = degree.get(n.id) ?? 0;
    if (n.entity_type === "plugin") return 13 + Math.min(deg, 40) * 0.2;
    if (n.entity_type === "project") return 7 + Math.min(deg, 20) * 0.45;
    if (n.entity_type === "mcp_server") return 7;
    return 4;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    const mx = e.clientX - (rect?.left ?? 0);
    const my = e.clientY - (rect?.top ?? 0);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => {
      const k = Math.max(0.2, Math.min(4, v.k * factor));
      return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
    });
  }
  function onDown(e: React.MouseEvent) {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  }
  function onMove(e: React.MouseEvent) {
    if (!drag.current) return;
    setView((v) => ({ ...v, x: drag.current!.vx + (e.clientX - drag.current!.x), y: drag.current!.vy + (e.clientY - drag.current!.y) }));
  }
  function onUp() {
    drag.current = null;
  }

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-xl border border-hairline bg-surface-1 select-none"
      style={{ height }}
      onWheel={onWheel}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      {/* starfield backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "30px 30px",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" style={{ cursor: drag.current ? "grabbing" : "grab" }}>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* edges */}
          {edges.map((e) => {
            const a = idx.get(e.from_node_id);
            const b = idx.get(e.to_node_id);
            if (a == null || b == null) return null;
            const pa = pos[a]!;
            const pb = pos[b]!;
            const active = !neighbours || (neighbours.has(e.from_node_id) && neighbours.has(e.to_node_id));
            return (
              <line
                key={e.id}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={REL_COLOR[e.relationship] ?? "#33455a"}
                strokeWidth={active ? 1 : 0.5}
                strokeOpacity={neighbours ? (active ? 0.55 : 0.05) : 0.18}
              />
            );
          })}
          {/* nodes */}
          {nodes.map((n) => {
            const i = idx.get(n.id)!;
            const p = pos[i]!;
            const c = nodeColor(n);
            const r = radius(n);
            const dim = neighbours ? !neighbours.has(n.id) : false;
            const isHub = n.entity_type === "plugin" || n.entity_type === "project";
            return (
              <g
                key={n.id}
                transform={`translate(${p.x} ${p.y})`}
                opacity={dim ? 0.22 : 1}
                style={{ cursor: "pointer" }}
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

      {/* legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-hairline bg-surface-2/80 px-3 py-2 text-[10px] backdrop-blur-sm">
        {[
          ["Plugin", "#4dc8c8"],
          ["Project", "#e0b050"],
          ["Agent", "#8aa0b4"],
          ["MCP", "#9a44d4"],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1 text-ink-tertiary">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <div className="absolute right-3 top-3 rounded-md border border-hairline bg-surface-2/80 px-2.5 py-1 font-mono text-[10px] text-ink-ghost backdrop-blur-sm">
        scroll = zoom · drag = pan · hover = focus
      </div>
    </div>
  );
}
