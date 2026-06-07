"use client";

import { useState } from "react";
import { PlusIcon, XIcon, ZapIcon, CheckIcon, AlertTriangleIcon } from "lucide-react";
import {
  useTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useCancelTask,
  useSpawnAgent,
} from "@/lib/api/hooks";
import { useIndraWS } from "@/lib/websocket/useIndraWS";
import type { Task } from "@indra/types";

const RUDRA = "#c44450";

const STATUS_FALLBACK = { label: "Unknown", color: "#637585", bg: "rgba(99,117,133,0.12)" };

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending",   color: "#637585", bg: "rgba(99,117,133,0.12)" },
  running:   { label: "Running",   color: "#4dc8c8", bg: "rgba(77,200,200,0.12)" },
  completed: { label: "Completed", color: "#2ab870", bg: "rgba(42,184,112,0.12)" },
  failed:    { label: "Failed",    color: "#e04040", bg: "rgba(224,64,64,0.12)"  },
  cancelled: { label: "Cancelled", color: "#637585", bg: "rgba(99,117,133,0.08)" },
};

const PRIORITY_LABEL: Record<number, string> = {
  0: "Normal",
  1: "High",
  2: "Critical",
};

const PRIORITY_COLOR: Record<number, string> = {
  0: "#637585",
  1: "#e0a030",
  2: "#c44450",
};

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div
      className="flex flex-col gap-0.5 px-4 py-2.5 rounded-[6px] border border-hairline bg-surface-2 min-w-[100px]"
      style={{ borderTop: `2px solid ${RUDRA}` }}
    >
      <span className="label-caps text-ink-ghost">{label}</span>
      <span
        className="font-mono font-bold tabular-nums"
        style={{ fontSize: "22px", lineHeight: 1, color: color ?? "#e8eef4" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: cancelTask } = useCancelTask();
  const [busy, setBusy] = useState(false);

  const meta = STATUS_META[task.status] ?? STATUS_FALLBACK;
  const isTerminal = ["completed", "failed", "cancelled"].includes(task.status);

  const advance = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = task.status === "pending" ? "running" : "completed";
      await updateTask({ id: task.id, status: next });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await cancelTask(task.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-[8px] border border-hairline bg-surface-1 p-3 space-y-2"
      style={{ borderLeft: `2px solid ${meta.color}` }}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-primary truncate">{task.name}</p>
          {task.description && (
            <p className="text-xs text-ink-tertiary mt-0.5 line-clamp-2">{task.description}</p>
          )}
        </div>
        {/* Priority badge */}
        <span
          className="label-caps px-1.5 py-0.5 rounded-[3px] shrink-0"
          style={{ background: `${PRIORITY_COLOR[task.priority] ?? "#637585"}22`, color: PRIORITY_COLOR[task.priority] ?? "#637585" }}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>

      {/* Status + agent */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="label-caps px-1.5 py-0.5 rounded-[3px]"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
        {task.agent_id && (
          <span className="font-mono text-ink-ghost" style={{ fontSize: "10px" }}>
            {task.agent_id.slice(0, 8)}…
          </span>
        )}
        {task.error && (
          <span className="font-mono text-[10px] text-critical truncate max-w-[160px]" style={{ color: "#e04040" }}>
            {task.error}
          </span>
        )}
        <span className="font-mono text-ink-ghost ml-auto" style={{ fontSize: "10px" }}>
          {new Date(task.created_at).toLocaleTimeString()}
        </span>
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => void advance()}
            disabled={busy}
            className="flex items-center gap-1 label-caps px-2 py-1 rounded-[4px] transition-colors disabled:opacity-40"
            style={{ background: RUDRA, color: "#fff" }}
          >
            {task.status === "pending" ? (
              <><ZapIcon className="h-3 w-3" /> Run</>
            ) : (
              <><CheckIcon className="h-3 w-3" /> Complete</>
            )}
          </button>
          <button
            onClick={() => void cancel()}
            disabled={busy}
            className="flex items-center gap-1 label-caps px-2 py-1 rounded-[4px] border border-hairline hover:bg-surface-3 transition-colors text-ink-ghost disabled:opacity-40"
          >
            <XIcon className="h-3 w-3" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Create task form ──────────────────────────────────────────────────────────

function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState(0);
  const { mutateAsync: createTask, isPending } = useCreateTask();

  const submit = async () => {
    if (!name.trim()) return;
    await createTask({
      name: name.trim(),
      ...(desc.trim() ? { description: desc.trim() } : {}),
      priority,
    });
    onClose();
  };

  return (
    <div
      className="rounded-[12px] border border-hairline bg-surface-1 p-4 space-y-3"
      style={{ borderTop: `2px solid ${RUDRA}` }}
    >
      <p className="label-caps text-ink-secondary">New Task</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Task name…"
        className="w-full rounded-[6px] border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-ghost focus:outline-none focus:ring-1 focus:ring-[#c44450]/50"
        autoFocus
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-[6px] border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-ghost resize-none focus:outline-none focus:ring-1 focus:ring-[#c44450]/50"
      />
      {/* Priority */}
      <div className="flex items-center gap-2">
        <span className="label-caps text-ink-ghost">Priority:</span>
        {[0, 1, 2].map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className="label-caps px-2 py-1 rounded-[4px] transition-colors"
            style={{
              background: priority === p ? `${PRIORITY_COLOR[p]}22` : "transparent",
              color: priority === p ? PRIORITY_COLOR[p] : "#637585",
              border: `1px solid ${priority === p ? PRIORITY_COLOR[p] : "transparent"}`,
            }}
          >
            {PRIORITY_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="label-caps px-3 py-1.5 rounded-[6px] border border-hairline hover:bg-surface-3 transition-colors text-ink-ghost">
          Cancel
        </button>
        <button
          onClick={() => void submit()}
          disabled={!name.trim() || isPending}
          className="label-caps px-4 py-1.5 rounded-[6px] transition-colors disabled:opacity-40"
          style={{ background: RUDRA, color: "#fff" }}
        >
          {isPending ? "Creating…" : "Create Task"}
        </button>
      </div>
    </div>
  );
}

// ── Spawn agent form ──────────────────────────────────────────────────────────

function SpawnAgentForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [agentType, setAgentType] = useState("claude_code");
  const { mutateAsync: spawnAgent, isPending } = useSpawnAgent();

  const submit = async () => {
    if (!name.trim()) return;
    await spawnAgent({ name: name.trim(), type: agentType, domain: "rudra" });
    onClose();
  };

  return (
    <div
      className="rounded-[12px] border border-hairline bg-surface-1 p-4 space-y-3"
      style={{ borderTop: `2px solid ${RUDRA}` }}
    >
      <p className="label-caps text-ink-secondary">Spawn Agent</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Agent name…"
        className="w-full rounded-[6px] border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-ghost focus:outline-none focus:ring-1 focus:ring-[#c44450]/50"
        autoFocus
      />
      <select
        value={agentType}
        onChange={(e) => setAgentType(e.target.value)}
        className="w-full rounded-[6px] border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-[#c44450]/50"
      >
        <option value="claude_code">claude_code</option>
        <option value="gemini_cli">gemini_cli</option>
        <option value="codex_cli">codex_cli</option>
        <option value="opencode">opencode</option>
        <option value="custom">custom</option>
      </select>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="label-caps px-3 py-1.5 rounded-[6px] border border-hairline hover:bg-surface-3 transition-colors text-ink-ghost">
          Cancel
        </button>
        <button
          onClick={() => void submit()}
          disabled={!name.trim() || isPending}
          className="label-caps px-4 py-1.5 rounded-[6px] transition-colors disabled:opacity-40"
          style={{ background: RUDRA, color: "#fff" }}
        >
          {isPending ? "Spawning…" : "Spawn"}
        </button>
      </div>
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  statusKey,
  tasks,
}: {
  statusKey: string;
  tasks: Task[];
}) {
  const meta = STATUS_META[statusKey] ?? STATUS_FALLBACK;
  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-[8px] border border-hairline border-b-0"
        style={{ background: meta.bg }}
      >
        <span className="label-caps font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span
          className="font-mono ml-auto"
          style={{ fontSize: "11px", color: meta.color, opacity: 0.8 }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div
        className="flex flex-col gap-2 p-2 rounded-b-[8px] border border-hairline border-t-0 bg-surface-1 flex-1"
        style={{ minHeight: "200px" }}
      >
        {tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="label-caps text-ink-ghost" style={{ fontSize: "10px" }}>
              empty
            </span>
          </div>
        ) : (
          tasks.map((t) => <TaskCard key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TaskBoard() {
  useIndraWS();

  const [showCreate, setShowCreate] = useState(false);
  const [showSpawn, setShowSpawn] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data: stats } = useTaskStats();
  const { data: tasksData, isLoading } = useTasks(
    statusFilter ? { status: statusFilter } : undefined
  );

  const tasks = tasksData?.tasks ?? [];

  const tasksByStatus: Record<string, Task[]> = {
    pending:   [],
    running:   [],
    completed: [],
    failed:    [],
    cancelled: [],
  };
  for (const t of tasks) {
    if (t.status in tasksByStatus) (tasksByStatus[t.status] ?? []).push(t);
  }

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="flex items-start gap-3 flex-wrap">
        <StatChip label="Pending"   value={stats?.pending   ?? 0} color="#637585" />
        <StatChip label="Running"   value={stats?.running   ?? 0} color="#4dc8c8" />
        <StatChip label="Completed" value={stats?.completed ?? 0} color="#2ab870" />
        <StatChip label="Failed"    value={stats?.failed    ?? 0} color="#e04040" />
        <StatChip label="Total"     value={stats?.total     ?? 0} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { setShowCreate(true); setShowSpawn(false); }}
          className="flex items-center gap-1.5 label-caps px-3 py-1.5 rounded-[6px] transition-colors"
          style={{ background: RUDRA, color: "#fff" }}
        >
          <PlusIcon className="h-3.5 w-3.5" /> New Task
        </button>
        <button
          onClick={() => { setShowSpawn(true); setShowCreate(false); }}
          className="flex items-center gap-1.5 label-caps px-3 py-1.5 rounded-[6px] border border-hairline hover:bg-surface-3 transition-colors text-ink-secondary"
        >
          <ZapIcon className="h-3.5 w-3.5" style={{ color: RUDRA }} /> Spawn Agent
        </button>

        {/* Status filter */}
        <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-[6px] border border-hairline ml-auto">
          {[undefined, "pending", "running", "completed", "failed"].map((s) => (
            <button
              key={s ?? "all"}
              onClick={() => setStatusFilter(s)}
              className={`label-caps px-2 py-1 rounded-[4px] transition-colors ${
                statusFilter === s
                  ? "bg-surface-4 text-ink-primary"
                  : "text-ink-ghost hover:text-ink-tertiary"
              }`}
            >
              {s ?? "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Inline forms */}
      {showCreate && <CreateTaskForm onClose={() => setShowCreate(false)} />}
      {showSpawn  && <SpawnAgentForm onClose={() => setShowSpawn(false)} />}

      {/* Kanban board — hide cancelled column when filter is active */}
      {isLoading ? (
        <div className="flex gap-3">
          {["pending", "running", "completed"].map((s) => (
            <div key={s} className="h-48 flex-1 rounded-[8px] bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : statusFilter ? (
        /* Filtered: flat list */
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-[12px] border border-hairline border-dashed">
              <AlertTriangleIcon className="h-8 w-8 mb-2 text-ink-ghost opacity-30" />
              <p className="label-caps text-ink-ghost">No {statusFilter} tasks</p>
            </div>
          ) : (
            tasks.map((t) => <TaskCard key={t.id} task={t} />)
          )}
        </div>
      ) : (
        /* Kanban columns */
        <div className="flex gap-3 overflow-x-auto pb-2">
          {["pending", "running", "completed", "failed", "cancelled"].map((s) => (
            <KanbanColumn key={s} statusKey={s} tasks={tasksByStatus[s] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
