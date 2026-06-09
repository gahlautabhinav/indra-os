"use client";

import { Compass, Plug, Server, Bot, Sparkles, Webhook, Package } from "lucide-react";
import { useDiscoveryRegistry, useClaudeEnv } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, ADITYA } from "@/components/common/DevaScaffold";

const STATUS_COLOR: Record<string, string> = {
  healthy: "#2ab870",
  degraded: "#e0a030",
  unreachable: "#e04040",
  unknown: "#637585",
};

function SectionCard({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-ghost">
        {icon} {title} <span className="ml-auto font-mono text-ink-tertiary">{count}</span>
      </p>
      <div className="max-h-64 overflow-y-auto">{children}</div>
    </div>
  );
}

export default function PusaPage() {
  const { data, isLoading } = useDiscoveryRegistry();
  const { data: env } = useClaudeEnv();
  const plugins = data?.plugins ?? [];
  const mcp = data?.mcp_servers ?? [];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={ADITYA}
        deva="Pūṣā"
        role="Discovery"
        title="The Pathfinder"
        sanskrit="पूषा"
        description="the guide who knows all paths — every reachable plugin, MCP server, and agent."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile accent={ADITYA} label="Reachable" value={data?.counts.reachable_total ?? 0} />
        <StatTile accent="#d4843a" label="Plugins" value={data?.counts.plugins ?? 0} />
        <StatTile accent="#7c6af7" label="MCP Servers" value={data?.counts.mcp_servers ?? 0} />
        <StatTile accent="#2ab870" label="Active Agents" value={data?.counts.active_agents ?? 0} />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-ink-ghost">Discovering services…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-hairline bg-surface-1 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-ghost">
              <Plug className="h-3 w-3" /> CLI Plugins
            </p>
            <ul className="space-y-2">
              {plugins.map((p) => {
                const color = STATUS_COLOR[p.status] ?? "#637585";
                return (
                  <li key={p.type} className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-ink-tertiary" />
                    <span className="text-sm text-ink-secondary">{p.type}</span>
                    <span className="ml-auto rounded px-2 py-0.5 text-[10px] font-mono uppercase" style={{ background: `${color}22`, color }}>
                      {p.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-lg border border-hairline bg-surface-1 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-ghost">
              <Server className="h-3 w-3" /> MCP Servers
            </p>
            {mcp.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink-ghost">No MCP servers registered.</p>
            ) : (
              <ul className="space-y-2">
                {mcp.map((m) => {
                  const color = STATUS_COLOR[m.status] ?? "#637585";
                  return (
                    <li key={m.name} className="flex items-center gap-2">
                      <Server className="h-3.5 w-3.5 text-ink-tertiary" />
                      <span className="text-sm text-ink-secondary">{m.name}</span>
                      <span className="font-mono text-[10px] text-ink-ghost">{m.transport}</span>
                      <span className="ml-auto rounded px-2 py-0.5 text-[10px] font-mono uppercase" style={{ background: `${color}22`, color }}>
                        {m.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {!isLoading && plugins.length === 0 && mcp.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Compass className="h-6 w-6" style={{ color: ADITYA, opacity: 0.5 }} />
          <p className="text-xs text-ink-ghost">Nothing discoverable right now.</p>
        </div>
      )}

      {/* ── Claude Code environment (skills, subagents, MCP, plugins, hooks) ── */}
      {env && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" style={{ color: "#d4843a" }} />
            <h2 className="text-sm font-semibold text-ink-secondary">Claude Code Environment</h2>
            <span className="font-mono text-[10px] text-ink-ghost">— everything you&apos;ve wired in</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatTile accent="#d4843a" label="Skills" value={env.counts.skills} />
            <StatTile accent="#3a80d4" label="Subagents" value={env.counts.subagents} />
            <StatTile accent="#7c6af7" label="MCP Servers" value={env.counts.mcp_servers} />
            <StatTile accent="#2ab870" label="Plugins" value={env.counts.plugins} />
            <StatTile accent="#9a44d4" label="Hooks" value={env.counts.hooks} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Skills */}
            <SectionCard icon={<Sparkles className="h-3 w-3" />} title="Skills" count={env.skills.length}>
              <div className="flex flex-wrap gap-1.5">
                {env.skills.map((s) => (
                  <span
                    key={s.name}
                    title={s.description}
                    className="rounded border border-hairline bg-surface-2 px-2 py-1 text-[11px] text-ink-secondary"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </SectionCard>

            {/* Subagents */}
            <SectionCard icon={<Bot className="h-3 w-3" />} title="Subagents" count={env.subagents.length}>
              <ul className="space-y-2">
                {env.subagents.map((a) => (
                  <li key={a.name} className="rounded border border-hairline bg-surface-2 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-ink-secondary">{a.name}</span>
                      {a.model && <span className="font-mono text-[9px] text-ink-ghost">{a.model}</span>}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-ink-ghost">{a.description}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* MCP servers */}
            <SectionCard icon={<Server className="h-3 w-3" />} title="MCP Servers" count={env.mcp_servers.length}>
              <ul className="space-y-1.5">
                {env.mcp_servers.map((m) => (
                  <li key={m.name} className="flex items-center gap-2 text-[12px]">
                    <Server className="h-3 w-3 text-ink-tertiary" />
                    <span className="text-ink-secondary">{m.name}</span>
                    <span className="font-mono text-[9px] text-ink-ghost">{m.transport}</span>
                    <span
                      className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-mono uppercase"
                      style={{ background: m.scope === "global" ? "#7c6af722" : "#63758522", color: m.scope === "global" ? "#7c6af7" : "#637585" }}
                    >
                      {m.scope}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* Plugins + Hooks */}
            <SectionCard icon={<Package className="h-3 w-3" />} title="Plugins & Hooks" count={env.plugins.length + env.hooks.length}>
              <ul className="space-y-1.5">
                {env.plugins.map((p) => (
                  <li key={p.name} className="flex items-center gap-2 text-[12px]">
                    <Plug className="h-3 w-3 text-ink-tertiary" />
                    <span className="text-ink-secondary">{p.name}</span>
                    {p.version && <span className="font-mono text-[9px] text-ink-ghost">v{p.version.slice(0, 12)}</span>}
                  </li>
                ))}
                {env.hooks.map((h) => (
                  <li key={h.name} className="flex items-center gap-2 text-[11px] text-ink-tertiary">
                    <Webhook className="h-3 w-3 text-ink-ghost" />
                    <span className="font-mono">{h.name}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
