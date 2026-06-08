"use client";

import { Compass, Plug, Server, Bot } from "lucide-react";
import { useDiscoveryRegistry } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, ADITYA } from "@/components/common/DevaScaffold";

const STATUS_COLOR: Record<string, string> = {
  healthy: "#2ab870",
  degraded: "#e0a030",
  unreachable: "#e04040",
  unknown: "#637585",
};

export default function PusaPage() {
  const { data, isLoading } = useDiscoveryRegistry();
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
    </div>
  );
}
