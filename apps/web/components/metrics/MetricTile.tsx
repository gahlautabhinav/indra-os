"use client";

import { Sparkline } from "./Sparkline";

type DomainId = "indra" | "vasu" | "rudra" | "aditya" | "prajapati";
type TrendDirection = "up" | "down" | "flat";

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number; // e.g. +12 or -5
  deltaLabel?: string; // e.g. "vs last hour"
  sparkline?: number[];
  domain?: DomainId;
  /** Override the value color (use for health/state metrics). Defaults to ink-primary. */
  valueColor?: string;
  /** Short context line under the value, e.g. "6 running · 2 idle". */
  hint?: string;
  /** Render a live pulse beside the label. */
  live?: boolean;
  loading?: boolean;
  className?: string;
}

const DOMAIN_COLORS: Record<DomainId, string> = {
  indra: "#4dc8c8",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

function trendDirection(delta?: number): TrendDirection {
  if (delta === undefined || delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
}

function DeltaIndicator({ delta, deltaLabel }: { delta: number; deltaLabel?: string }) {
  const dir = trendDirection(delta);
  const color = dir === "up" ? "text-healthy" : dir === "down" ? "text-critical" : "text-ink-tertiary";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const sign = delta > 0 ? "+" : "";

  return (
    <span className={`font-mono text-[11px] tabular-nums ${color}`}>
      {arrow} {sign}
      {delta}
      {deltaLabel && <span className="ml-1 text-ink-ghost">{deltaLabel}</span>}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  sparkline,
  domain = "indra",
  valueColor,
  hint,
  live = false,
  loading = false,
  className = "",
}: MetricTileProps) {
  const color = DOMAIN_COLORS[domain];

  return (
    <div
      className={`domain-panel group flex flex-col gap-2.5 p-4 transition-colors duration-150 hover:bg-surface-2 ${className}`}
      data-domain={domain}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className="label-caps text-ink-tertiary">{label}</span>
          {live && (
            <span className="relative inline-flex h-1.5 w-1.5">
              <span
                className="live-ring absolute inset-0 rounded-full"
                style={{ background: `${color}99` }}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            </span>
          )}
        </span>
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} color={color} width={64} height={20} />
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        {loading ? (
          <div className="skeleton h-9 w-20 rounded" />
        ) : (
          <p
            className="font-mono font-bold tabular-nums leading-none tracking-tight"
            style={{ fontSize: "32px", color: valueColor ?? "var(--indra-ink-primary)" }}
          >
            {value}
          </p>
        )}
        {unit && !loading && <span className="font-mono text-sm text-ink-tertiary">{unit}</span>}
      </div>

      {hint && !loading && <p className="font-mono text-[11px] text-ink-ghost">{hint}</p>}
      {delta !== undefined && !loading && (
        <DeltaIndicator delta={delta} {...(deltaLabel !== undefined ? { deltaLabel } : {})} />
      )}
    </div>
  );
}
