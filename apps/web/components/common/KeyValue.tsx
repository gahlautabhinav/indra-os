"use client";

import { Fragment } from "react";

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Render a config/metadata object as labelled field rows — never a raw JSON dump. */
export function KeyValueGrid({
  data,
  className = "",
}: {
  data: Record<string, unknown> | null | undefined;
  className?: string;
}) {
  const entries = Object.entries(data ?? {});
  if (entries.length === 0) return null;
  return (
    <dl className={`grid grid-cols-[minmax(56px,auto)_1fr] gap-x-3 gap-y-1 ${className}`}>
      {entries.map(([k, v]) => (
        <Fragment key={k}>
          <dt className="label-caps text-ink-ghost">{k.replace(/_/g, " ")}</dt>
          <dd className="truncate font-mono text-[11px] tabular-nums text-ink-secondary" title={fmtVal(v)}>
            {fmtVal(v)}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}
