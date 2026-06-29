"use client";

import type { CSSProperties } from "react";

/** Shimmer block. Uses the `.skeleton` utility (globals.css) — sweep + reduced-motion safe. */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton rounded-md ${className}`} style={style} />;
}

/** Stack of list/table-row placeholders. */
export function SkeletonRows({ rows = 6, height = 44, className = "" }: { rows?: number; height?: number; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton rounded-md" style={{ height }} />
      ))}
    </div>
  );
}

/** Row of KPI-tile placeholders. */
export function SkeletonTiles({ count = 4, className = "grid grid-cols-2 gap-4 lg:grid-cols-4" }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton rounded-lg" style={{ height: 104 }} />
      ))}
    </div>
  );
}

/** Grid of card placeholders. */
export function SkeletonCards({ count = 6, height = 150, className = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" }: { count?: number; height?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton rounded-lg" style={{ height }} />
      ))}
    </div>
  );
}
