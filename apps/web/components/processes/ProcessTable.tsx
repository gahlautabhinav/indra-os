"use client";

import { Cpu, MemoryStick, RefreshCw, AlertTriangle } from "lucide-react";
import type { ProcessInfo } from "@indra/types";

interface ProcessTableProps {
  processes: ProcessInfo[];
  onTerminate?: (pid: number) => void;
}

const STATUS_COLOR: Record<string, string> = {
  running: "#2ab870",
  sleeping: "#4080a0",
  zombie: "#c44450",
  stopped: "#e0a030",
};

function CpuBar({ value }: { value: number }) {
  const pct = Math.min(value, 100);
  const color = pct > 80 ? "#c44450" : pct > 50 ? "#e0a030" : "#2ab870";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-ink-secondary w-8 text-right">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

export function ProcessTable({ processes, onTerminate }: ProcessTableProps) {
  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-ink-ghost gap-2">
        <Cpu className="w-8 h-8 opacity-30" />
        <p className="text-sm">No relevant processes found</p>
        <p className="text-xs text-ink-ghost">Enable "Show all" to see all system processes</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-hairline">
            <th className="label-caps text-left px-4 py-2 text-ink-ghost">PID</th>
            <th className="label-caps text-left px-4 py-2 text-ink-ghost">Name</th>
            <th className="label-caps text-left px-4 py-2 text-ink-ghost">Status</th>
            <th className="label-caps text-left px-4 py-2 text-ink-ghost">CPU</th>
            <th className="label-caps text-left px-4 py-2 text-ink-ghost">Memory</th>
            <th className="label-caps text-left px-4 py-2 text-ink-ghost">Agent</th>
            {onTerminate && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {processes.map((p) => (
            <tr
              key={p.pid}
              className="border-b border-hairline hover:bg-surface-2 transition-colors"
            >
              <td className="px-4 py-2.5 font-mono text-ink-ghost">{p.pid}</td>
              <td className="px-4 py-2.5 font-medium text-ink">{p.name}</td>
              <td className="px-4 py-2.5">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-mono rounded px-1.5 py-0.5"
                  style={{
                    color: STATUS_COLOR[p.status] ?? "#637585",
                    backgroundColor: `${STATUS_COLOR[p.status] ?? "#637585"}18`,
                  }}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <CpuBar value={p.cpu_percent} />
              </td>
              <td className="px-4 py-2.5 font-mono text-ink-secondary">
                {p.memory_mb.toFixed(1)} MB
              </td>
              <td className="px-4 py-2.5">
                {p.agent_name ? (
                  <span className="text-accent text-xs">{p.agent_name}</span>
                ) : (
                  <span className="text-ink-ghost">—</span>
                )}
              </td>
              {onTerminate && (
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => onTerminate(p.pid)}
                    className="p-1 rounded text-ink-ghost hover:text-state-critical hover:bg-surface-3 transition-colors"
                    title={`Terminate PID ${p.pid}`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
