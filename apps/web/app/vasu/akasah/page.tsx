"use client";

import { Infinity } from "lucide-react";

const ACCENT = "#d4843a";

export default function AkasahPage() {
  return (
    <div className="p-6">
      <p className="label-caps mb-1" style={{ color: ACCENT }}>Ākāśaḥ · Context</p>
      <h1 className="font-bold tracking-tight text-ink-primary mb-2" style={{ fontSize: "28px", letterSpacing: "-0.8px" }}>
        Context Manager
      </h1>
      <p className="text-sm text-ink-tertiary mb-8">Context window management and prompt assembly</p>

      <div
        className="rounded-[12px] border border-hairline border-dashed flex flex-col items-center justify-center py-20 gap-4"
        style={{ borderTop: `2px solid ${ACCENT}` }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: `${ACCENT}14` }}
        >
          <Infinity className="w-7 h-7" style={{ color: ACCENT, opacity: 0.6 }} />
        </div>
        <div className="text-center">
          <p className="label-caps text-ink-ghost mb-1">Planned — Phase 8</p>
          <p className="text-sm text-ink-tertiary max-w-sm">
            Ākāśaḥ will manage context windows, token budgeting, and dynamic prompt assembly across agents.
          </p>
        </div>
      </div>
    </div>
  );
}
