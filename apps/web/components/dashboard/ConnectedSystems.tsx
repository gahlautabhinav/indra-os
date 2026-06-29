"use client";

import { Plug, Terminal } from "lucide-react";

const PLUGIN_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  gemini_cli: "Gemini CLI",
  codex_cli: "Codex CLI",
  opencode: "OpenCode",
  kiro_cli: "Kiro",
  antigravity: "Antigravity",
  custom: "Custom",
};

const STATUS_COLOR: Record<string, string> = {
  healthy: "var(--state-healthy)",
  degraded: "var(--state-degraded)",
  unreachable: "var(--state-critical)",
  unknown: "var(--indra-ink-ghost)",
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function ConnectedSystems({
  pluginTypes,
  statuses,
  costToday,
  tokenBurn,
  loading,
}: {
  pluginTypes: string[];
  statuses: Record<string, string>;
  costToday: number;
  tokenBurn: number;
  loading?: boolean;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-hairline bg-surface-1">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <span className="label-caps text-ink-tertiary">Connected Systems</span>
        {!loading && (
          <span className="font-mono text-[10px] text-ink-ghost">
            {pluginTypes.length} {pluginTypes.length === 1 ? "adapter" : "adapters"}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-9 rounded" />
            ))}
          </div>
        ) : pluginTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface-2">
              <Plug className="h-4 w-4 text-ink-tertiary" />
            </div>
            <p className="text-xs text-ink-ghost">
              No CLIs connected. Run a Claude Code or OpenCode session to wire one in.
            </p>
          </div>
        ) : (
          pluginTypes.map((pt) => {
            const status = statuses[pt] ?? "unknown";
            const color = STATUS_COLOR[status] ?? STATUS_COLOR.unknown;
            return (
              <div
                key={pt}
                className="flex items-center gap-2.5 border-b border-hairline px-4 py-2.5 last:border-0"
              >
                <Terminal className="h-3.5 w-3.5 text-ink-tertiary" />
                <span className="text-[13px] text-ink-secondary">{PLUGIN_LABELS[pt] ?? pt}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color }}>
                    {status}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between border-t border-hairline bg-surface-2/40 px-4 py-2.5">
        <span className="flex flex-col">
          <span className="label-caps text-ink-ghost">Cost today</span>
          <span className="font-mono text-[13px] tabular-nums text-ink-primary">
            ${loading ? "—" : costToday.toFixed(4)}
          </span>
        </span>
        <span className="flex flex-col items-end">
          <span className="label-caps text-ink-ghost">Token burn</span>
          <span className="font-mono text-[13px] tabular-nums text-ink-primary">
            {loading ? "—" : fmtTokens(tokenBurn)}
          </span>
        </span>
      </div>
    </section>
  );
}
