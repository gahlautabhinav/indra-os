"use client";

import { useState } from "react";
import { useTraceStats, useTraces, useTrace } from "@/lib/api/hooks";
import { VivartaTrace } from "@/components/traces/VivartaTrace";
import type { Trace } from "@indra/types";

// ── Time-range filter tabs ────────────────────────────────────────────────

const TIME_RANGES = ["1h", "6h", "24h", "7d", "30d"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

// ── Status filter ─────────────────────────────────────────────────────────

const STATUSES = [
  { value: undefined, label: "All" },
  { value: "running",  label: "Running" },
  { value: "ok",       label: "OK" },
  { value: "error",    label: "Error" },
] as const;

// ── Metric strip ──────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 px-4 py-2.5 rounded-[6px] border border-hairline bg-surface-2 min-w-[120px]"
      style={{ borderTop: "2px solid #d4843a" }}
    >
      <span className="label-caps text-ink-ghost">{label}</span>
      <span
        className="font-mono font-bold tabular-nums"
        style={{ fontSize: "24px", lineHeight: 1, color: color ?? "#e8eef4" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string | null | undefined }) {
  const color =
    status === "ok"      ? "#2ab870" :
    status === "error"   ? "#e04040" :
    status === "running" ? "#4dc8c8" :
    "#637585";
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

// ── Trace list row ────────────────────────────────────────────────────────

function TraceRow({
  trace,
  selected,
  onClick,
}: {
  trace: Trace;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-hairline last:border-0 ${
        selected ? "bg-surface-3" : "hover:bg-surface-2/60"
      }`}
      style={selected ? { borderLeft: "2px solid #d4843a" } : {}}
    >
      <StatusDot status={trace.status} />

      {/* Trace ID */}
      <span className="font-mono text-ink-ghost shrink-0" style={{ fontSize: "10px", width: "72px" }}>
        {trace.trace_id.slice(0, 8)}…
      </span>

      {/* Name */}
      <span className="text-sm text-ink-secondary truncate flex-1">
        {trace.name ?? "Unnamed trace"}
      </span>

      {/* Span count */}
      <span className="font-mono text-ink-ghost shrink-0" style={{ fontSize: "11px" }}>
        {trace.span_count ?? 0} spans
      </span>

      {/* Duration */}
      <span className="font-mono text-ink-tertiary shrink-0 tabular-nums" style={{ fontSize: "11px", width: "52px", textAlign: "right" }}>
        {trace.duration_ms != null
          ? trace.duration_ms < 1000
            ? `${trace.duration_ms}ms`
            : `${(trace.duration_ms / 1000).toFixed(2)}s`
          : "—"}
      </span>

      {/* Timestamp */}
      <span className="font-mono text-ink-ghost shrink-0" style={{ fontSize: "10px" }}>
        {trace.started_at
          ? new Date(trace.started_at).toLocaleTimeString()
          : "—"}
      </span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function SuryahPage() {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [_timeRange, setTimeRange] = useState<TimeRange>("24h");

  const { data: stats, isLoading: statsLoading } = useTraceStats();
  const { data: tracesData, isLoading: tracesLoading } = useTraces({
    limit: 50,
    status: statusFilter,
  });
  const { data: selectedTrace, isLoading: traceLoading } = useTrace(selectedTraceId);

  const traces = tracesData?.traces ?? [];

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div>
        <p className="label-caps mb-1" style={{ color: "#d4843a" }}>
          Sūryaḥ · Observability
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Trace Center
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          Vivarta — the unfolding of every agent execution
        </p>
      </div>

      {/* Stats strip */}
      <div className="flex items-start gap-3 flex-wrap">
        <StatChip
          label="Total Traces"
          value={statsLoading ? "—" : (stats?.total_traces ?? 0)}
        />
        <StatChip
          label="Active"
          value={statsLoading ? "—" : (stats?.active_traces ?? 0)}
          color="#4dc8c8"
        />
        <StatChip
          label="Errors"
          value={statsLoading ? "—" : (stats?.error_traces ?? 0)}
          color={stats?.error_traces ? "#e04040" : "#637585"}
        />
        <StatChip
          label="Avg Duration"
          value={
            statsLoading
              ? "—"
              : stats?.avg_duration_ms != null
              ? stats.avg_duration_ms < 1000
                ? `${Math.round(stats.avg_duration_ms)}ms`
                : `${(stats.avg_duration_ms / 1000).toFixed(2)}s`
              : "—"
          }
        />
        <StatChip
          label="P50"
          value={
            statsLoading
              ? "—"
              : stats?.p50_duration_ms != null
              ? `${stats.p50_duration_ms}ms`
              : "—"
          }
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Time range */}
        <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-[6px] border border-hairline">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`label-caps px-2.5 py-1 rounded-[4px] transition-colors ${
                _timeRange === r
                  ? "bg-surface-4 text-ink-primary"
                  : "text-ink-ghost hover:text-ink-tertiary"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-[6px] border border-hairline">
          {STATUSES.map((s) => (
            <button
              key={s.label}
              onClick={() => setStatusFilter(s.value)}
              className={`label-caps px-2.5 py-1 rounded-[4px] transition-colors ${
                statusFilter === s.value
                  ? "bg-surface-4 text-ink-primary"
                  : "text-ink-ghost hover:text-ink-tertiary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Total count */}
        <span className="font-mono text-ink-ghost ml-auto" style={{ fontSize: "11px" }}>
          {tracesData?.total ?? 0} traces
        </span>
      </div>

      {/* Split: list (left) + waterfall detail (right) */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "340px 1fr" }}>
        {/* Trace list */}
        <div className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden" style={{ borderTop: "2px solid #d4843a" }}>
          {/* List header */}
          <div className="flex items-center px-4 py-2.5 border-b border-hairline bg-surface-2 gap-2">
            <span className="label-caps text-ink-ghost flex-1">Trace</span>
            <span className="label-caps text-ink-ghost">Spans</span>
            <span className="label-caps text-ink-ghost w-14 text-right">Duration</span>
          </div>

          {/* List body */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)", minHeight: "300px" }}>
            {tracesLoading ? (
              <div className="space-y-px p-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-11 rounded bg-surface-2 animate-pulse" />
                ))}
              </div>
            ) : traces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div
                  className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
                  style={{ background: "rgba(212,132,58,0.12)" }}
                >
                  <span style={{ color: "#d4843a", fontSize: "20px" }}>◎</span>
                </div>
                <p className="label-caps text-ink-ghost mb-1">No Traces</p>
                <p className="text-xs text-ink-tertiary">
                  Traces appear when agents run. Use{" "}
                  <code className="font-mono text-[10px] text-ink-secondary">
                    POST /api/v1/traces/ingest
                  </code>{" "}
                  to submit spans.
                </p>
              </div>
            ) : (
              traces.map((t) => (
                <TraceRow
                  key={t.id}
                  trace={t}
                  selected={selectedTraceId === t.trace_id}
                  onClick={() =>
                    setSelectedTraceId(
                      selectedTraceId === t.trace_id ? null : t.trace_id
                    )
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Waterfall detail */}
        <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
          {!selectedTraceId ? (
            <div
              className="h-full rounded-[12px] border border-hairline border-dashed bg-surface-1 flex flex-col items-center justify-center gap-2 min-h-[300px]"
            >
              <span style={{ color: "#d4843a", fontSize: "32px", opacity: 0.3 }}>◎</span>
              <p className="label-caps text-ink-ghost">Select a trace</p>
              <p className="text-xs text-ink-tertiary">
                Click any trace to see the Vivarta waterfall
              </p>
            </div>
          ) : traceLoading ? (
            <div className="rounded-[12px] border border-hairline bg-surface-1 p-6 space-y-2" style={{ borderTop: "2px solid #d4843a" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 rounded bg-surface-2 animate-pulse"
                  style={{ width: `${90 - i * 8}%` }}
                />
              ))}
            </div>
          ) : selectedTrace ? (
            <VivartaTrace trace={selectedTrace} />
          ) : (
            <div className="rounded-[12px] border border-hairline bg-surface-1 p-6 text-center" style={{ borderTop: "2px solid #d4843a" }}>
              <p className="text-sm text-ink-tertiary">Trace not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
