"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { useTraceStats, useTraces, useTrace } from "@/lib/api/hooks";
import { VivartaTrace } from "@/components/traces/VivartaTrace";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { Trace } from "@indra/types";

const ACCENT = "#d4843a";

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

// ── Status dot (live pulse on running) ─────────────────────────────────────

function StatusDot({ status }: { status: string | null | undefined }) {
  const color =
    status === "ok"      ? "#2ab870" :
    status === "error"   ? "#e04040" :
    status === "running" ? "#4dc8c8" :
    "#637585";
  if (status === "running") {
    return (
      <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
        <span className="live-ring absolute inset-0 rounded-full" style={{ background: `${color}99` }} />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      </span>
    );
  }
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
    >
      <StatusDot status={trace.status} />

      {/* Trace ID */}
      <span className="font-mono tabular-nums text-ink-ghost shrink-0" style={{ fontSize: "10px", width: "72px" }}>
        {trace.trace_id.slice(0, 8)}…
      </span>

      {/* Name */}
      <span className="text-sm text-ink-secondary truncate flex-1">
        {trace.name ?? "Unnamed trace"}
      </span>

      {/* Span count */}
      <span className="font-mono tabular-nums text-ink-ghost shrink-0" style={{ fontSize: "11px" }}>
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
      <span className="font-mono tabular-nums text-ink-ghost shrink-0" style={{ fontSize: "10px" }}>
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
    ...(statusFilter !== undefined ? { status: statusFilter } : {}),
  });
  const { data: selectedTrace, isLoading: traceLoading } = useTrace(selectedTraceId);

  const traces = tracesData?.traces ?? [];

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <DevaPageHeader
        accent={ACCENT}
        deva="Sūryaḥ"
        role="Observability"
        title="Traces"
        sanskrit="सूर्यः"
        description="Vivarta — the unfolding of every agent execution as spans."
      />

      {/* Stats strip */}
      <div className="flex items-start gap-3 flex-wrap">
        <StatTile accent={ACCENT} label="Total Traces" value={statsLoading ? "—" : (stats?.total_traces ?? 0)} />
        <StatTile accent={ACCENT} label="Active" value={statsLoading ? "—" : (stats?.active_traces ?? 0)} />
        <StatTile accent={ACCENT} label="Errors" value={statsLoading ? "—" : (stats?.error_traces ?? 0)} />
        <StatTile
          accent={ACCENT}
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
        <StatTile
          accent={ACCENT}
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
        <span className="font-mono tabular-nums text-ink-ghost ml-auto" style={{ fontSize: "11px" }}>
          {tracesData?.total ?? 0} traces
        </span>
      </div>

      {/* Split: list (left) + waterfall detail (right) */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "340px 1fr" }}>
        {/* Trace list */}
        <div className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden" style={{ borderTop: `2px solid ${ACCENT}` }}>
          {/* List header */}
          <div className="flex items-center px-4 py-2.5 border-b border-hairline bg-surface-2 gap-2">
            <span className="label-caps text-ink-tertiary flex-1">Trace</span>
            <span className="label-caps text-ink-tertiary">Spans</span>
            <span className="label-caps text-ink-tertiary w-14 text-right">Duration</span>
          </div>

          {/* List body */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)", minHeight: "300px" }}>
            {tracesLoading ? (
              <SkeletonRows rows={8} height={44} className="p-2" />
            ) : traces.length === 0 ? (
              <EmptyState
                icon={Activity}
                accent={ACCENT}
                title="No traces yet"
                body="Traces appear when agents run. POST spans to /api/v1/traces/ingest to populate the waterfall."
              />
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
            <div className="h-full rounded-[12px] border border-dashed border-hairline bg-surface-1 min-h-[300px]">
              <EmptyState
                icon={Activity}
                accent={ACCENT}
                title="Select a trace"
                body="Click any trace to unfold its Vivarta waterfall — every span, timing and status."
              />
            </div>
          ) : traceLoading ? (
            <div className="rounded-[12px] border border-hairline bg-surface-1 p-6" style={{ borderTop: `2px solid ${ACCENT}` }}>
              <SkeletonRows rows={6} height={32} />
            </div>
          ) : selectedTrace ? (
            <VivartaTrace trace={selectedTrace} />
          ) : (
            <div className="rounded-[12px] border border-hairline bg-surface-1 p-6 text-center" style={{ borderTop: `2px solid ${ACCENT}` }}>
              <p className="text-sm text-ink-tertiary">Trace not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
