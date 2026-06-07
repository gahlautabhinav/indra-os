"use client";

import { TaskBoard } from "@/components/tasks/TaskBoard";

const RUDRA = "#c44450";

export default function PranahPage() {
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <p className="label-caps mb-1" style={{ color: RUDRA }}>
          Pranah · Task Orchestration
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Runtime Board
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          प्राण — the breath of execution. Create tasks, spawn agents, watch them run live.
        </p>
      </div>

      <TaskBoard />
    </div>
  );
}
