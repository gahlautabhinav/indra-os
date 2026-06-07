"use client";

import { MemoryBrowser } from "@/components/memory/MemoryBrowser";

const ADITYA = "#3a80d4";

export default function SmritiPage() {
  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div>
        <p className="label-caps mb-1" style={{ color: ADITYA }}>
          Smriti · Memory + RAG
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Knowledge Store
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          स्मृति — that which is remembered. Semantic search via pgvector.
        </p>
      </div>

      <MemoryBrowser />
    </div>
  );
}
