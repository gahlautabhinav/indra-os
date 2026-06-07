import type { ReactNode } from "react";

export default function AdityaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* ADITYA domain strip — 2px blue sovereignty mark per INDRA_DESIGN.md §4 */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6 h-9 border-b border-hairline bg-surface-1"
        style={{ borderTop: "2px solid #3a80d4" }}
      >
        <span className="label-caps" style={{ color: "#3a80d4" }}>
          ADITYA — Governance
        </span>
        <span className="text-hairline-bright">·</span>
        <span className="label-caps text-ink-ghost">12 Devas</span>
      </div>

      {children}
    </div>
  );
}
