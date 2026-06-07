"use client";

import { useState } from "react";
import { useCivilizationStore } from "@/lib/store/civilizationStore";
import { usePluginHealth } from "@/lib/api/hooks";
import { DevaStatusMatrix } from "./DevaStatusMatrix";

export function CivilizationPulse() {
  const [matrixOpen, setMatrixOpen] = useState(false);
  const health = useCivilizationStore((s) => s.overallHealth);
  const { data: pluginHealth } = usePluginHealth();

  const statusColor =
    health >= 90
      ? "var(--state-healthy)"
      : health >= 60
      ? "var(--state-degraded)"
      : "var(--state-critical)";

  return (
    <>
      <button
        onClick={() => setMatrixOpen(true)}
        className="relative flex h-7 w-7 items-center justify-center rounded hover:bg-surface-3 transition-colors"
        title={`Civilization Pulse — ${health}% health — click for Deva Status Matrix`}
        aria-label="Open Deva Status Matrix"
      >
        {/* Outer pulse ring */}
        <span
          className="absolute inset-0 rounded-full animate-pulse-ring opacity-20"
          style={{ background: statusColor }}
        />
        {/* Inner dot */}
        <span
          className="relative h-3 w-3 rounded-full"
          style={{ background: statusColor }}
        />
      </button>

      {matrixOpen && (
        <DevaStatusMatrix
          onClose={() => setMatrixOpen(false)}
          pluginStatuses={pluginHealth?.statuses}
        />
      )}
    </>
  );
}
