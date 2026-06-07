"use client";

import { useMemo } from "react";
import type { Span, Trace } from "@indra/types";
import { TraceSpanRow } from "./TraceSpanRow";

interface TraceWithSpans extends Trace {
  spans: Span[];
}

interface VivartaTraceProps {
  trace: TraceWithSpans;
  compact?: boolean;
}

interface SpanNode extends Span {
  depth: number;
  children: SpanNode[];
}

// Build tree, then flatten in DFS order (depth-first so children appear under parent)
function buildSpanTree(spans: Span[]): SpanNode[] {
  const byId = new Map<string, SpanNode>();
  for (const s of spans) {
    byId.set(s.span_id, { ...s, depth: 0, children: [] });
  }

  const roots: SpanNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_span_id && byId.has(node.parent_span_id)) {
      byId.get(node.parent_span_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Assign depths via DFS
  function assignDepth(node: SpanNode, depth: number) {
    node.depth = depth;
    for (const child of node.children) assignDepth(child, depth + 1);
  }
  for (const root of roots) assignDepth(root, 0);

  // Flatten DFS order
  const flat: SpanNode[] = [];
  function flatten(node: SpanNode) {
    flat.push(node);
    // Sort children by started_at for deterministic order
    const sorted = [...node.children].sort((a, b) =>
      (a.started_at ?? "").localeCompare(b.started_at ?? "")
    );
    for (const child of sorted) flatten(child);
  }
  const sortedRoots = [...roots].sort((a, b) =>
    (a.started_at ?? "").localeCompare(b.started_at ?? "")
  );
  for (const root of sortedRoots) flatten(root);

  return flat;
}

function computeTimeline(spans: Span[]): { minMs: number; maxMs: number; totalMs: number } {
  let minMs = Infinity;
  let maxMs = -Infinity;

  for (const s of spans) {
    if (s.started_at) {
      const t = new Date(s.started_at).getTime();
      if (t < minMs) minMs = t;
      const end = s.duration_ms != null ? t + s.duration_ms : t;
      if (end > maxMs) maxMs = end;
    }
  }

  if (!isFinite(minMs)) {
    minMs = 0;
    maxMs = Math.max(...spans.map((s) => s.duration_ms ?? 0), 100);
  }

  return { minMs, maxMs, totalMs: Math.max(maxMs - minMs, 1) };
}

function formatMs(ms: number): string {
  if (ms === 0) return "0ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Ruler tick marks — 5 equal segments
function TimelineRuler({ totalMs }: { totalMs: number }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="relative h-6 border-b border-hairline mb-0.5">
      {ticks.map((pct) => (
        <div
          key={pct}
          className="absolute top-0 bottom-0 flex flex-col justify-end pb-1"
          style={{ left: `${pct * 100}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-px h-2 bg-hairline-bright mx-auto mb-0.5" />
          <span className="font-mono text-ink-ghost" style={{ fontSize: "9px" }}>
            {formatMs(Math.round(totalMs * pct))}
          </span>
        </div>
      ))}

      {/* Threshold bands — P50 dashed, P99 dashed degraded */}
      <div
        className="absolute top-0 bottom-0 w-px"
        style={{
          left: "50%",
          borderLeft: "1px dashed #334455",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

// Compact single-line trace summary (for dashboard strip)
function TraceStripRow({ trace }: { trace: TraceWithSpans }) {
  const statusColor =
    trace.status === "ok"
      ? "#2ab870"
      : trace.status === "error"
      ? "#e04040"
      : trace.status === "running"
      ? "#4dc8c8"
      : "#637585";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-hairline last:border-0 hover:bg-surface-3/40 transition-colors">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: statusColor }}
      />
      <span className="font-mono text-ink-tertiary shrink-0" style={{ fontSize: "10px" }}>
        {trace.trace_id.slice(0, 8)}
      </span>
      <span className="text-xs text-ink-secondary truncate flex-1">
        {trace.name ?? "—"}
      </span>
      <span className="font-mono text-ink-tertiary shrink-0" style={{ fontSize: "11px" }}>
        {trace.spans.length} spans
      </span>
      <span className="font-mono text-ink-tertiary shrink-0" style={{ fontSize: "11px" }}>
        {trace.duration_ms != null ? formatMs(trace.duration_ms) : "—"}
      </span>
    </div>
  );
}

export function VivartaTrace({ trace, compact = false }: VivartaTraceProps) {
  const flatSpans = useMemo(() => buildSpanTree(trace.spans), [trace.spans]);
  const { minMs, totalMs } = useMemo(() => computeTimeline(trace.spans), [trace.spans]);

  if (compact) {
    return <TraceStripRow trace={trace} />;
  }

  return (
    <div
      className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden"
      style={{ borderTop: "2px solid #d4843a" }}
    >
      {/* Panel header — always visible */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-surface-2">
        <div className="flex items-center gap-3">
          <span className="label-caps text-ink-tertiary" style={{ color: "#d4843a" }}>
            Vivarta
          </span>
          <span className="font-mono text-ink-tertiary" style={{ fontSize: "11px" }}>
            {trace.trace_id}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Status */}
          <span
            className="label-caps px-2 py-0.5 rounded-full"
            style={{
              color:
                trace.status === "ok"
                  ? "#2ab870"
                  : trace.status === "error"
                  ? "#e04040"
                  : "#4dc8c8",
              backgroundColor:
                trace.status === "ok"
                  ? "rgba(42,184,112,0.12)"
                  : trace.status === "error"
                  ? "rgba(224,64,64,0.12)"
                  : "rgba(77,200,200,0.12)",
            }}
          >
            {(trace.status ?? "running").toUpperCase()}
          </span>

          {/* Duration */}
          <span className="font-mono text-ink-secondary" style={{ fontSize: "12px" }}>
            {trace.duration_ms != null ? formatMs(trace.duration_ms) : "—"}
          </span>

          {/* Span count */}
          <span className="font-mono text-ink-tertiary" style={{ fontSize: "11px" }}>
            {trace.spans.length} spans
          </span>
        </div>
      </div>

      {/* Body: empty state or span waterfall */}
      {!trace.spans.length ? (
        <div className="p-8 text-center">
          <p className="label-caps text-ink-ghost mb-1">No Spans</p>
          <p className="text-xs text-ink-tertiary">
            This trace has no recorded spans yet.
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-0 px-4 py-1.5 border-b border-hairline">
            <div className="shrink-0" style={{ width: "220px" }}>
              <span className="label-caps text-ink-ghost">Span</span>
            </div>
            <div className="flex-1 px-3">
              <TimelineRuler totalMs={totalMs} />
            </div>
            <div className="shrink-0 text-right" style={{ width: "56px" }}>
              <span className="label-caps text-ink-ghost">Duration</span>
            </div>
          </div>

          {/* Span rows */}
          <div className="relative divide-y divide-hairline/40">
            {flatSpans.map((span) => (
              <TraceSpanRow
                key={span.span_id}
                span={span}
                depth={span.depth}
                totalMs={totalMs}
                minStartMs={minMs}
              />
            ))}
          </div>
        </>
      )}

      {/* Footer: started_at timestamp */}
      {trace.started_at && (
        <div className="px-4 py-2 border-t border-hairline bg-surface-2 flex items-center justify-between">
          <span className="font-mono text-ink-ghost" style={{ fontSize: "10px" }}>
            Started {new Date(trace.started_at).toLocaleString()}
          </span>
          {trace.finished_at && (
            <span className="font-mono text-ink-ghost" style={{ fontSize: "10px" }}>
              Finished {new Date(trace.finished_at).toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
