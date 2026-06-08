"use client";

import type { ReactNode } from "react";

export const RUDRA = "#c44450";

export function DevaHeader({
  deva,
  role,
  title,
  sanskrit,
  description,
  actions,
}: {
  /** Romanized deva name, e.g. "Vyanah" */
  deva: string;
  /** Functional role, e.g. "Inter-Agent Messaging" */
  role: string;
  /** Page title */
  title: string;
  /** Devanagari name */
  sanskrit: string;
  /** One-line poetic + functional description */
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="label-caps mb-1" style={{ color: RUDRA }}>
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

export function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      className="flex min-w-[110px] flex-col gap-0.5 rounded-[6px] border border-hairline bg-surface-2 px-4 py-2.5"
      style={{ borderTop: `2px solid ${accent ?? RUDRA}` }}
    >
      <span className="label-caps text-ink-ghost">{label}</span>
      <span
        className="font-mono font-bold tabular-nums text-ink-primary"
        style={{ fontSize: "22px", lineHeight: 1 }}
      >
        {value}
      </span>
    </div>
  );
}

/** Honest empty state for Phase-2 backend scaffolds — shows the deva is wired
 *  to its live endpoint but has no data yet, plus what unlocks it. */
export function DevaEmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-hairline bg-surface-1 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-surface-2" style={{ color: RUDRA }}>
        {icon}
      </div>
      <p className="text-sm font-medium text-ink-secondary">{title}</p>
      <p className="max-w-sm text-xs text-ink-ghost">{hint}</p>
    </div>
  );
}
