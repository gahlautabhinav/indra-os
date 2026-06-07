"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[INDRA] Uncaught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
      <div
        className="max-w-md w-full rounded-lg border border-hairline bg-surface-1 p-8"
        style={{ borderTop: "2px solid #c44450" }}
      >
        <div className="mb-6">
          <span className="label-caps" style={{ color: "#c44450" }}>
            RUDRA — System Fault
          </span>
        </div>
        <h1 className="text-xl font-semibold text-ink mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          {error.message || "An unexpected error occurred in the INDRA runtime."}
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-ink-ghost mb-6">
            Fault ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 rounded text-sm font-medium bg-surface-2 hover:bg-surface-3 text-ink border border-hairline transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
