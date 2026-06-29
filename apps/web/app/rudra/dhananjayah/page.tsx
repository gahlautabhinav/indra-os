"use client";

import { useState } from "react";
import { RefreshCw, Cpu } from "lucide-react";
import { useProcesses } from "@/lib/api/hooks";
import { ProcessTable } from "@/components/processes/ProcessTable";
import { indraApi } from "@/lib/api/client";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const RUDRA = "#c44450";

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

  const processes = data?.processes ?? [];
  const top = processes[0];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={RUDRA}
        deva="Dhananjayah"
        role="Processes"
        title="Long-Running Processes"
        sanskrit="धनञ्जयः"
        description="watches over spawned agent processes and system resource usage."
        actions={
          <>
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-ink-secondary">
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
              className="flex items-center gap-1.5 rounded border border-hairline px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:bg-surface-2"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </>
        }
      />

      {/* stats strip */}
      <div className="flex flex-wrap gap-3">
        <StatTile accent={RUDRA} label="Processes" value={data?.total ?? 0} />
        {top && (
          <StatTile
            accent={RUDRA}
            label="Top Memory"
            value={`${top.memory_mb.toFixed(1)} MB`}
            sub={top.name}
          />
        )}
      </div>

      {/* table */}
      <div
        className="overflow-hidden rounded-xl border border-hairline bg-surface-1"
        style={{ borderTop: `2px solid ${RUDRA}` }}
      >
        {isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={8} />
          </div>
        ) : processes.length === 0 ? (
          <EmptyState
            icon={Cpu}
            accent={RUDRA}
            title="No relevant processes"
            body={
              showAll
                ? "No processes are running right now."
                : "Only agent-linked processes are shown. Enable “Show all processes” to see every system process."
            }
          />
        ) : (
          <ProcessTable processes={processes} onTerminate={handleTerminate} />
        )}
      </div>
    </div>
  );
}
