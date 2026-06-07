"use client";

import { Wind } from "lucide-react";

const ACCENT = "#d4843a";

export default function VayuhPage() {
  return (
    <div className="p-6">
      <p className="label-caps mb-1" style={{ color: ACCENT }}>Vāyuḥ · Communication</p>
      <h1 className="font-bold tracking-tight text-ink-primary mb-2" style={{ fontSize: "28px", letterSpacing: "-0.8px" }}>
        Communication Bus
      </h1>
      <p className="text-sm text-ink-tertiary mb-8">Inter-agent messaging and protocol translation</p>

      <div
        className="rounded-[12px] border border-hairline border-dashed flex flex-col items-center justify-center py-20 gap-4"
        style={{ borderTop: `2px solid ${ACCENT}` }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: `${ACCENT}14` }}
        >
          <Wind className="w-7 h-7" style={{ color: ACCENT, opacity: 0.6 }} />
        </div>
        <div className="text-center">
          <p className="label-caps text-ink-ghost mb-1">Planned — Phase 8</p>
          <p className="text-sm text-ink-tertiary max-w-sm">
            Vāyuḥ will handle cross-agent message routing, protocol bridging, and pub/sub subscriptions.
          </p>
        </div>
      </div>
    </div>
  );
}
