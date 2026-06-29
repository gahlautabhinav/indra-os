"use client";

import { TaskBoard } from "@/components/tasks/TaskBoard";
import { DevaPageHeader } from "@/components/common/DevaScaffold";

const RUDRA = "#c44450";

export default function PranahPage() {
  return (
    <div className="space-y-5 p-6">
      <DevaPageHeader
        accent={RUDRA}
        deva="Pranah"
        role="Tasks"
        title="Task Orchestration"
        sanskrit="प्राणः"
        description="the breath of execution. Create tasks, spawn agents, watch them run live."
      />
      <TaskBoard />
    </div>
  );
}
