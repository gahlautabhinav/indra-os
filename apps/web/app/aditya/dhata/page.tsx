"use client";

const ADITYA = "#3a80d4";

export default function DhataPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="label-caps mb-1" style={{ color: ADITYA }}>
          Dhata · Config Foundation
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Configuration Foundation
        </h1>
      </div>
      <div className="bg-surface-1 border border-hairline rounded-lg p-12 text-center text-ink-ghost">
        <p className="label-caps">Coming in Phase 9</p>
        <p className="text-sm mt-2">Distributed configuration management and feature flags</p>
      </div>
    </div>
  );
}
