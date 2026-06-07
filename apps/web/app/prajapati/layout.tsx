import type { ReactNode } from "react";

export default function PrajapatiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* PRAJAPATI domain strip — 2px violet sovereignty mark per INDRA_DESIGN.md §4 */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6 h-9 border-b border-hairline bg-surface-1"
        style={{ borderTop: "2px solid #9a44d4" }}
      >
        <span className="label-caps" style={{ color: "#9a44d4" }}>
          PRAJAPATI — Strategy
        </span>
        <span className="text-hairline-bright">·</span>
        <span className="label-caps text-ink-ghost">The 33rd Deva</span>
      </div>

      {children}
    </div>
  );
}
