"use client";

import { useState } from "react";
import { RefreshCw, Cpu } from "lucide-react";
import { useProcesses } from "@/lib/api/hooks";
import { ProcessTable } from "@/components/processes/ProcessTable";
import { indraApi } from "@/lib/api/client";

export default function DhananjayahPage() {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, refetch } = useProcesses({ all_processes: showAll });

  async function handleTerminate(pid: number) {
    if (!confirm(`Terminate PID ${pid}? This cannot be undone.`)) return;
    try {
      await indraApi.terminateProcess(pid);
      void refetch();
    } catch {
      alert("Failed to terminate process — check permissions.");
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Process Manager</h1>
          <p className="text-sm text-ink-muted mt-1">
            Dhananjayah — watches over spawned agent processes and system resource usage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded border-hairline"
            />
            Show all processes
          </label>
          <button
            onClick={() => void refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-ink-secondary border border-hairline hover:bg-surface-2 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* stats strip */}
      <div className="flex items-center gap-4 text-xs text-ink-ghost">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {data?.total ?? 0} processes
        </span>
        {data && data.processes.length > 0 && (
          <span>
            Top mem: {data.processes[0]?.memory_mb.toFixed(1)} MB ({data.processes[0]?.name})
          </span>
        )}
      </div>

      {/* table */}
      <div className="rounded-lg border border-hairline bg-surface-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-ink-ghost text-sm">
            Loading processes…
          </div>
        ) : (
          <ProcessTable
            processes={data?.processes ?? []}
            onTerminate={handleTerminate}
          />
        )}
      </div>
    </div>
  );
}
