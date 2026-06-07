"use client";

import { Sparkline } from "./Sparkline";

type DomainId = "indra" | "vasu" | "rudra" | "aditya" | "prajapati";
type TrendDirection = "up" | "down" | "flat";

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;        // e.g. +12 or -5
  deltaLabel?: string;   // e.g. "vs last hour"
  sparkline?: number[];
  domain?: DomainId;
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
  const color =
    dir === "up" ? "text-healthy" : dir === "down" ? "text-critical" : "text-ink-tertiary";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const sign = delta > 0 ? "+" : "";

  return (
    <span className={`text-xs font-mono ${color}`}>
      {arrow} {sign}{delta}
      {deltaLabel && (
        <span className="ml-1 text-ink-tertiary">{deltaLabel}</span>
      )}
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
  loading = false,
  className = "",
}: MetricTileProps) {
  const color = DOMAIN_COLORS[domain];

  return (
    <div
      className={`domain-panel p-4 flex flex-col gap-2 ${className}`}
      data-domain={domain}
    >
      <div className="flex items-start justify-between">
        <p className="label-caps">{label}</p>
        {sparkline && (
          <Sparkline data={sparkline} color={color} width={64} height={20} />
        )}
      </div>

      <div className="flex items-end gap-2">
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-surface-3" />
        ) : (
          <p
            className="metric-value font-mono leading-none"
            style={{ color }}
          >
            {value}
            {unit && (
              <span className="ml-1 text-base text-ink-secondary">{unit}</span>
            )}
          </p>
        )}
      </div>

      {delta !== undefined && (
        <DeltaIndicator delta={delta} deltaLabel={deltaLabel} />
      )}
    </div>
  );
}
