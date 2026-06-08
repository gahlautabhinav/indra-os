"use client";

import type { ReactNode } from "react";

export const VASU = "#d4843a";
export const ADITYA = "#3a80d4";

export function DevaPageHeader({
  accent,
  deva,
  role,
  title,
  sanskrit,
  description,
  actions,
}: {
  accent: string;
  deva: string;
  role: string;
  title: string;
  sanskrit: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="label-caps mb-1" style={{ color: accent }}>
          {deva} · {role}
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          {title}
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          <span className="font-mono text-ink-secondary">{sanskrit}</span> — {description}
        </p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      className="flex min-w-[130px] flex-col gap-0.5 rounded-[6px] border border-hairline bg-surface-2 px-4 py-2.5"
      style={{ borderTop: `2px solid ${accent}` }}
    >
      <span className="label-caps text-ink-ghost">{label}</span>
      <span
        className="font-mono font-bold tabular-nums text-ink-primary"
        style={{ fontSize: "22px", lineHeight: 1.1 }}
      >
        {value}
      </span>
      {sub && <span className="text-[10px] text-ink-ghost">{sub}</span>}
    </div>
  );
}

/** Horizontal share/usage bar. */
export function MeterBar({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: accent }}
      />
    </div>
  );
}
