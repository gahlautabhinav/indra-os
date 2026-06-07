"use client";

import { useCivilizationStore } from "@/lib/store/civilizationStore";
import { cn } from "@/lib/utils/cn";

export function CivilizationPulse() {
  const health = useCivilizationStore((s) => s.overallHealth);

  const statusColor =
    health >= 90
      ? "var(--state-healthy)"
      : health >= 60
      ? "var(--state-degraded)"
      : "var(--state-critical)";

  return (
    <button
      className="relative flex h-7 w-7 items-center justify-center rounded"
      title="Civilization Pulse — click for Deva Status Matrix"
    >
      {/* Outer pulse ring */}
      <span
        className="absolute inset-0 rounded-full animate-pulse-ring opacity-30"
        style={{ background: statusColor }}
      />
      {/* Inner dot */}
      <span
        className="relative h-3 w-3 rounded-full"
        style={{ background: statusColor }}
      />
    </button>
  );
}
