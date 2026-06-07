"use client";

import { useState } from "react";
import type { Span } from "@indra/types";

interface TraceSpanRowProps {
  span: Span;
  depth: number;
  totalMs: number;
  minStartMs: number;
}

// Visual encoding per INDRA_DESIGN.md §7.8 — Vivarta Trace Anatomy
type SpanKind = "root" | "agent" | "tool" | "llm" | "unknown";

function resolveKind(span: Span, isRoot: boolean): SpanKind {
  if (isRoot) return "root";
  if (span.kind === "client") return "tool";
  if (span.kind === "server") return "llm";
  if (span.kind === "internal") return "agent";
  return "unknown";
}

const KIND_CONFIG: Record<SpanKind, { color: string; height: number; label: string }> = {
  root:    { color: "#c44450", height: 24, label: "AGENT" },   // rudra-primary
  agent:   { color: "#d4843a", height: 20, label: "SPAN" },    // vasu-primary
  tool:    { color: "#7a4a1a", height: 12, label: "TOOL" },    // vasu-muted
  llm:     { color: "#3a80d4", height: 20, label: "LLM" },     // aditya-primary
  unknown: { color: "#637585", height: 16, label: "SPAN" },    // ink-tertiary
};

const STATUS_DOT: Record<string, string> = {
  ok:      "#2ab870",  // state-healthy
  error:   "#e04040",  // state-critical
  running: "#4dc8c8",  // accent
  unset:   "#637585",  // ink-tertiary
};

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// 45° error stripe pattern per INDRA_DESIGN.md §10.2
const ERROR_STRIPE =
  "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(224,64,64,0.4) 3px, rgba(224,64,64,0.4) 6px)";

export function TraceSpanRow({ span, depth, totalMs, minStartMs }: TraceSpanRowProps) {
  const [expanded, setExpanded] = useState(false);

  const isRoot = depth === 0 && !span.parent_span_id;
  const kind = resolveKind(span, isRoot);
  const cfg = KIND_CONFIG[kind];
  const hasError = span.status === "error";
  const hasDetail =
    Object.keys(span.attributes).length > 0 ||
    (span.events as unknown[]).length > 0;

  // Timeline positioning
  const spanStartMs = span.started_at
    ? new Date(span.started_at).getTime() - minStartMs
    : 0;
  const spanWidthMs = span.duration_ms ?? 2;
  const leftPct  = totalMs > 0 ? Math.max(0, (spanStartMs / totalMs) * 100) : 0;
  const widthPct = totalMs > 0 ? Math.max((spanWidthMs  / totalMs) * 100, 0.2) : 0.5;

  const statusColor = STATUS_DOT[span.status ?? "unset"] ?? "#637585";

  return (
    <>
      {/* Span row */}
      <div
        className="group flex items-center gap-0 min-h-[32px] transition-colors hover:bg-surface-3/50"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {/* Indent guide lines */}
        {depth > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 border-l border-hairline"
            style={{ left: `${depth * 16 - 8}px` }}
          />
        )}

        {/* Name column — fixed 220px */}
        <div className="flex items-center gap-2 shrink-0 pr-3" style={{ width: "220px" }}>
          {/* Expand toggle */}
          <button
            onClick={() => hasDetail && setExpanded((e) => !e)}
            className={`w-3.5 h-3.5 flex items-center justify-center shrink-0 transition-transform text-ink-ghost text-[8px] ${
              expanded ? "rotate-90" : ""
            } ${hasDetail ? "cursor-pointer hover:text-ink-tertiary" : "opacity-0 pointer-events-none"}`}
            aria-label="Toggle span detail"
          >
            ▶
          </button>

          {/* Status dot */}
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: statusColor }}
          />

          {/* Kind badge */}
          <span
            className="label-caps shrink-0 opacity-70"
            style={{ color: cfg.color, fontSize: "9px", letterSpacing: "0.8px" }}
          >
            {cfg.label}
          </span>

          {/* Span name */}
          <span
            className="text-xs font-mono text-ink-secondary truncate"
            title={span.name}
          >
            {span.name}
          </span>
        </div>

        {/* Timeline bar — fills remaining space */}
        <div className="flex-1 flex items-center gap-3 py-1.5">
          <div className="flex-1 relative" style={{ height: `${cfg.height}px` }}>
            {/* Track */}
            <div className="absolute inset-0 bg-surface-2 rounded-[2px]" />

            {/* Duration bar */}
            <div
              className="absolute top-0 h-full rounded-[2px] transition-all"
              style={{
                left:   `${leftPct}%`,
                width:  `${widthPct}%`,
                minWidth: "2px",
                backgroundColor: cfg.color,
                opacity: span.status === "ok" || !span.status ? 0.75 : 0.9,
                background: hasError
                  ? ERROR_STRIPE
                  : `${cfg.color}bf`, // 75% opacity hex
              }}
            />
          </div>

          {/* Duration text */}
          <span
            className="shrink-0 font-mono text-ink-tertiary tabular-nums"
            style={{ fontSize: "11px", width: "56px", textAlign: "right" }}
          >
            {formatDuration(span.duration_ms)}
          </span>
        </div>
      </div>

      {/* Expanded detail — span attributes + events */}
      {expanded && hasDetail && (
        <div
          className="mb-1 rounded-[6px] border border-hairline bg-surface-2 overflow-auto"
          style={{
            marginLeft:  `${depth * 16 + 24}px`,
            marginRight: "12px",
            maxHeight:   "180px",
          }}
        >
          {Object.keys(span.attributes).length > 0 && (
            <div className="p-2 border-b border-hairline">
              <p className="label-caps text-ink-ghost mb-1.5">Attributes</p>
              <div className="space-y-0.5">
                {Object.entries(span.attributes).map(([k, v]) => (
                  <div key={k} className="flex gap-2 font-mono" style={{ fontSize: "11px" }}>
                    <span className="text-ink-tertiary shrink-0">{k}</span>
                    <span className="text-ink-secondary truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(span.events as unknown[]).length > 0 && (
            <div className="p-2">
              <p className="label-caps text-ink-ghost mb-1.5">Events</p>
              <div className="space-y-0.5 font-mono" style={{ fontSize: "11px" }}>
                {(span.events as Array<{ name?: string; timestamp?: string }>).map((ev, i) => (
                  <div key={i} className="text-ink-secondary">
                    {ev.timestamp && (
                      <span className="text-ink-tertiary mr-2">{ev.timestamp}</span>
                    )}
                    {ev.name ?? JSON.stringify(ev)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
