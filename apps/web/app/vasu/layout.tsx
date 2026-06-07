import type { ReactNode } from "react";

export default function VasuLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* VASU domain strip — 2px amber sovereignty mark per INDRA_DESIGN.md §4 */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6 h-9 border-b border-hairline bg-surface-1"
        style={{ borderTop: "2px solid #d4843a" }}
      >
        <span className="label-caps" style={{ color: "#d4843a" }}>
          VASU — Infrastructure
        </span>
        <span className="text-hairline-bright">·</span>
        <span className="label-caps text-ink-ghost">8 Devas</span>
      </div>

      {children}
    </div>
  );
}
