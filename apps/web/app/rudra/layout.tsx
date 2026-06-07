import type { ReactNode } from "react";

export default function RudraLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* RUDRA domain strip — 2px crimson sovereignty mark per INDRA_DESIGN.md §4 */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6 h-9 border-b border-hairline bg-surface-1"
        style={{ borderTop: "2px solid #c44450" }}
      >
        <span className="label-caps" style={{ color: "#c44450" }}>
          RUDRA — Runtime
        </span>
        <span className="text-hairline-bright">·</span>
        <span className="label-caps text-ink-ghost">11 Devas</span>
      </div>

      {children}
    </div>
  );
}
