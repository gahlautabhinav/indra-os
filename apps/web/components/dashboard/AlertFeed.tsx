"use client";

import { AlertOctagon, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import type { Alert } from "@indra/types";

const SEVERITY: Record<Alert["severity"], { color: string; label: string; Icon: typeof Info }> = {
  critical: { color: "#e04040", label: "Critical", Icon: AlertOctagon },
  warning: { color: "#e0a030", label: "Warning", Icon: AlertTriangle },
  info: { color: "#4dc8c8", label: "Info", Icon: Info },
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function AlertRow({ alert }: { alert: Alert }) {
  const sev = SEVERITY[alert.severity] ?? SEVERITY.info;
  return (
    <div className="flex gap-2.5 border-b border-hairline px-4 py-3 last:border-0 hover:bg-surface-2">
      <sev.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: sev.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink-primary">{alert.title}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-ghost">
            {relativeTime(alert.created_at)}
          </span>
        </div>
        {alert.message && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-tertiary">{alert.message}</p>
        )}
      </div>
    </div>
  );
}

export function AlertFeed({ alerts, loading }: { alerts: Alert[]; loading?: boolean }) {
  const unresolved = alerts.length;
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-hairline bg-surface-1">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <span className="label-caps text-ink-tertiary">Alert Feed</span>
        {!loading && unresolved > 0 && (
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[10px]"
            style={{ background: "var(--state-critical-dim)", color: "var(--state-critical)" }}
          >
            {unresolved} active
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-px p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded" />
          ))}
        </div>
      ) : unresolved === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface-2">
            <ShieldCheck className="h-5 w-5" style={{ color: "var(--state-healthy)" }} />
          </div>
          <p className="text-sm text-ink-secondary">All clear</p>
          <p className="max-w-[230px] text-xs text-ink-ghost">
            Failed tasks, errored agents, and policy breaches surface here the moment they happen.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      )}
    </section>
  );
}
