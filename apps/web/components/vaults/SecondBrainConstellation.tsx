"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { VaultProject, VaultSummary } from "@indra/types";

const ADITYA = "#3a80d4";
const VAULT_COLOR = "#6db86d";
const CORE_A = "#5aa0ff";
const CORE_B = "#9a6bff";

interface Placed {
  project: VaultProject;
  x: number;
  y: number;
  depth: number; // 0..1 — used for size/opacity fake-3D
  r: number;
  vaults: { v: VaultSummary; x: number; y: number; r: number }[];
}

/**
 * The hero of the Second Brain — an auto-rotating orbital constellation of every
 * project, its Obsidian vault(s), and its live agent sessions, all in one view.
 * Pure SVG + requestAnimationFrame (no 3D deps); pauses on hover and respects
 * prefers-reduced-motion.
 */
export function SecondBrainConstellation({
  projects,
  onOpenVault,
  height = 460,
}: {
  projects: VaultProject[];
  onOpenVault: (v: VaultSummary) => void;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(960);
  const rot = useRef(0);
  const orbit = useRef(0);
  const pulse = useRef(0);
  const hoverRef = useRef<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [, frame] = useReducer((x: number) => x + 1, 0);

  // measure width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // static star field (one-time)
  const stars = useMemo(
    () =>
      Array.from({ length: 110 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.3 + 0.2,
        o: Math.random() * 0.45 + 0.08,
      })),
    []
  );

  const model = useMemo(
    () =>
      projects.map((p, i) => ({
        p,
        a0: (i / Math.max(projects.length, 1)) * Math.PI * 2,
        dir: i % 2 === 0 ? 1 : -1,
      })),
    [projects]
  );

  // animation loop
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(t - last, 50) / 1000;
      last = t;
      if (!reduce && hoverRef.current == null) rot.current += dt * 0.07;
      orbit.current += dt * 0.3;
      pulse.current += dt;
      frame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cx = w / 2;
  const cy = height / 2;
  const ringR = Math.min(w, height * 1.7) * 0.33;
  const squash = 0.6; // vertical squash → elliptical orbital plane

  const placed: Placed[] = model.map((m) => {
    const ang = m.a0 + rot.current;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const x = cx + cos * ringR;
    const y = cy + sin * ringR * squash;
    const depth = (sin + 1) / 2; // 0 (back) .. 1 (front)
    const r = 7 + Math.min(m.p.session_count, 30) * 0.35 + depth * 4;
    const vCount = m.p.vaults.length;
    const vaultOrbit = r + 16 + Math.min(vCount, 4) * 5;
    const vaults = m.p.vaults.map((v, j) => {
      const va = (j / Math.max(vCount, 1)) * Math.PI * 2 + orbit.current * m.dir;
      const vr = 3.5 + Math.min(v.note_count, 800) / 180 + depth * 2;
      return {
        v,
        x: x + Math.cos(va) * vaultOrbit,
        y: y + Math.sin(va) * vaultOrbit * 0.75,
        r: vr,
      };
    });
    return { project: m.p, x, y, depth, r, vaults };
  });

  // painter's algorithm — draw back (low depth) first
  const ordered = [...placed].sort((a, b) => a.depth - b.depth);

  const setHov = (id: string | null) => {
    hoverRef.current = id;
    setHover(id);
  };

  const hovered = hover ? placed.find((p) => p.project.project_root === hover) : null;
  const pr = 1 + Math.sin(pulse.current * 2.2) * 0.5; // pulse factor 0.5..1.5

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl border border-hairline"
      style={{
        height,
        background:
          "radial-gradient(ellipse at 50% 42%, #0e1726 0%, #0a0f18 55%, #07090d 100%)",
      }}
    >
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="sb-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dCEBFF" stopOpacity="1" />
            <stop offset="35%" stopColor={CORE_A} stopOpacity="0.95" />
            <stop offset="100%" stopColor={CORE_B} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sb-proj" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bcd8ff" stopOpacity="1" />
            <stop offset="55%" stopColor={ADITYA} stopOpacity="0.95" />
            <stop offset="100%" stopColor={ADITYA} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sb-vault" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#cdeccd" stopOpacity="1" />
            <stop offset="55%" stopColor={VAULT_COLOR} stopOpacity="0.95" />
            <stop offset="100%" stopColor={VAULT_COLOR} stopOpacity="0" />
          </radialGradient>
          <filter id="sb-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* star field */}
        {stars.map((s, i) => (
          <circle key={i} cx={s.x * w} cy={s.y * height} r={s.r} fill="#aab8ff" opacity={s.o} />
        ))}

        {/* orbital plane ring */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={ringR}
          ry={ringR * squash}
          fill="none"
          stroke="#2a3a52"
          strokeWidth={1}
          strokeDasharray="2 7"
          opacity={0.5}
        />

        {/* core glow halo */}
        <circle cx={cx} cy={cy} r={46 + pr * 6} fill="url(#sb-core)" opacity={0.5} />

        {/* connectors center → project (behind nodes) */}
        {ordered.map((p) => {
          const active = !hover || hover === p.project.project_root;
          return (
            <line
              key={`l-${p.project.project_root}`}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={ADITYA}
              strokeWidth={active ? 1 : 0.5}
              strokeOpacity={active ? 0.18 + p.depth * 0.14 : 0.05}
            />
          );
        })}

        {/* nodes, depth-ordered */}
        {ordered.map((p) => {
          const id = p.project.project_root;
          const dim = hover ? hover !== id : false;
          const op = dim ? 0.22 : 0.55 + p.depth * 0.45;
          return (
            <g key={id} opacity={op}>
              {/* vault orbit links */}
              {p.vaults.map((vd, j) => (
                <line
                  key={`vl-${id}-${j}`}
                  x1={p.x}
                  y1={p.y}
                  x2={vd.x}
                  y2={vd.y}
                  stroke={VAULT_COLOR}
                  strokeWidth={0.8}
                  strokeOpacity={0.3}
                />
              ))}
              {/* active-session pulse ring */}
              {p.project.active_count > 0 && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r + 4 + pr * 3}
                  fill="none"
                  stroke="#2ab870"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
              )}
              {/* project node */}
              <circle cx={p.x} cy={p.y} r={p.r * 2.1} fill="url(#sb-proj)" opacity={0.4} />
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="url(#sb-proj)"
                stroke="#0b1018"
                strokeWidth={1}
                filter="url(#sb-glow)"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHov(id)}
                onMouseLeave={() => setHov(null)}
                onClick={() => p.project.vaults[0] && onOpenVault(p.project.vaults[0])}
              />
              {/* vault orbs */}
              {p.vaults.map((vd, j) => (
                <g key={`v-${id}-${j}`}>
                  <circle cx={vd.x} cy={vd.y} r={vd.r * 2} fill="url(#sb-vault)" opacity={0.4} />
                  <circle
                    cx={vd.x}
                    cy={vd.y}
                    r={vd.r}
                    fill="url(#sb-vault)"
                    stroke="#0b1018"
                    strokeWidth={0.8}
                    filter="url(#sb-glow)"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHov(id)}
                    onMouseLeave={() => setHov(null)}
                    onClick={() => onOpenVault(vd.v)}
                  />
                </g>
              ))}
              {/* project label */}
              <text
                x={p.x}
                y={p.y - p.r - 7}
                textAnchor="middle"
                fontSize={hover === id ? 12 : 10}
                fill={hover === id ? "#e8eef4" : "#8aa0b4"}
                style={{ pointerEvents: "none", fontWeight: hover === id ? 600 : 400 }}
              >
                {p.project.leaf.length > 22 ? p.project.leaf.slice(0, 22) + "…" : p.project.leaf}
              </text>
            </g>
          );
        })}

        {/* core node */}
        <circle cx={cx} cy={cy} r={11 + pr} fill="url(#sb-core)" filter="url(#sb-glow)" />
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fontSize={11}
          fill="#a8b8c8"
          style={{ pointerEvents: "none" }}
          className="font-mono"
        >
          स्मृति · Second Brain
        </text>
      </svg>

      {/* hover tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute rounded-md border border-hairline bg-surface-2/90 px-3 py-2 text-[11px] backdrop-blur-sm"
          style={{
            left: Math.min(Math.max(hovered.x + 14, 8), w - 190),
            top: Math.min(Math.max(hovered.y - 10, 8), height - 70),
          }}
        >
          <p className="font-semibold text-ink-primary">{hovered.project.leaf}</p>
          <p className="mt-0.5 text-ink-tertiary">
            {hovered.project.session_count} sessions
            {hovered.project.active_count > 0 && (
              <span className="text-emerald-400"> · {hovered.project.active_count} active</span>
            )}
          </p>
          <p className="text-ink-tertiary">
            {hovered.project.vaults.length} vault
            {hovered.project.vaults.length === 1 ? "" : "s"}
            {hovered.project.vaults[0]?.graph &&
              ` · ${hovered.project.vaults.reduce((s, v) => s + (v.graph?.node_count ?? 0), 0)} nodes`}
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[10px] text-ink-ghost">
        click an orb to open · hover to pause
      </div>
    </div>
  );
}
