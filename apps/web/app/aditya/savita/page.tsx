"use client";

import { useState } from "react";
import { Clock, Play, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useSchedules, useCreateSchedule, useDeleteSchedule, useToggleSchedule, useTriggerSchedule } from "@/lib/api/hooks";
import type { Schedule, TriggerType, ActionType } from "@indra/types";

const ADITYA = "#3a80d4";

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
      style={
        enabled
          ? { background: "#2ab87022", color: "#2ab870" }
          : { background: "#63758522", color: "#637585" }
      }
    >
      {enabled ? "active" : "paused"}
    </span>
  );
}

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const del = useDeleteSchedule();
  const toggle = useToggleSchedule();
  const trigger = useTriggerSchedule();

  return (
    <div className="bg-surface-1 border border-hairline rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <StatusBadge enabled={schedule.enabled} />
            <span className="text-xs text-ink-ghost">{schedule.trigger_type}</span>
            <span className="text-xs text-ink-ghost">→</span>
            <span className="text-xs text-ink-ghost">{schedule.action_type}</span>
          </div>
          <p className="font-medium text-ink-primary">{schedule.name}</p>
          {schedule.description && (
            <p className="text-xs text-ink-ghost">{schedule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => trigger.mutate(schedule.id)}
            className="p-1 rounded hover:bg-surface-2 transition-colors"
            title="Run now"
          >
            <Play size={12} style={{ color: ADITYA }} />
          </button>
          <button
            onClick={() => toggle.mutate({ scheduleId: schedule.id, enabled: !schedule.enabled })}
            className="text-ink-ghost hover:text-ink-primary transition-colors"
          >
            {schedule.enabled ? <ToggleRight size={18} style={{ color: ADITYA }} /> : <ToggleLeft size={18} />}
          </button>
          <button
            onClick={() => del.mutate(schedule.id)}
            className="text-ink-ghost hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="font-mono text-xs text-ink-ghost bg-surface-2 rounded p-2 space-y-1">
        <div>trigger: {JSON.stringify(schedule.trigger_config)}</div>
        <div>action: {JSON.stringify(schedule.action_config)}</div>
      </div>

      {schedule.last_run_at && (
        <p className="text-xs text-ink-ghost">
          Last run: {new Date(schedule.last_run_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

const TRIGGER_EXAMPLES: Record<TriggerType, string> = {
  interval: '{"seconds": 3600}',
  cron: '{"cron_expr": "0 9 * * *"}',
  once: '{"run_at": "2026-06-08T10:00:00Z"}',
};

function AddScheduleModal({ onClose }: { onClose: () => void }) {
  const create = useCreateSchedule();
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger_type: "interval" as TriggerType,
    trigger_config: '{"seconds": 3600}',
    action_type: "notify" as ActionType,
    action_config: '{"title": "Scheduled Run", "message": ""}',
    enabled: true,
  });

  function handleSubmit() {
    try {
      const trigger_config = JSON.parse(form.trigger_config);
      const action_config = JSON.parse(form.action_config);
      create.mutate(
        {
          name: form.name,
          description: form.description || null,
          trigger_type: form.trigger_type,
          trigger_config,
          action_type: form.action_type,
          action_config,
          enabled: form.enabled,
        },
        { onSuccess: onClose }
      );
    } catch {
      alert("Config fields must be valid JSON");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface-1 border border-hairline rounded-xl p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-ink-primary text-lg">New Schedule</h2>

        <div className="space-y-3">
          <input
            className="input-field w-full"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-caps text-ink-ghost mb-1 block">Trigger</label>
              <select
                className="input-field w-full"
                value={form.trigger_type}
                onChange={(e) => {
                  const t = e.target.value as TriggerType;
                  setForm((f) => ({ ...f, trigger_type: t, trigger_config: TRIGGER_EXAMPLES[t] }));
                }}
              >
                {(["interval", "cron", "once"] as TriggerType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-caps text-ink-ghost mb-1 block">Action</label>
              <select
                className="input-field w-full"
                value={form.action_type}
                onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value as ActionType }))}
              >
                {(["notify", "spawn_agent"] as ActionType[]).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-caps text-ink-ghost mb-1 block">Trigger config (JSON)</label>
            <textarea
              className="input-field w-full font-mono text-xs h-16"
              value={form.trigger_config}
              onChange={(e) => setForm((f) => ({ ...f, trigger_config: e.target.value }))}
            />
          </div>
          <div>
            <label className="label-caps text-ink-ghost mb-1 block">Action config (JSON)</label>
            <textarea
              className="input-field w-full font-mono text-xs h-16"
              value={form.action_config}
              onChange={(e) => setForm((f) => ({ ...f, action_config: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!form.name || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SavitaPage() {
  const { data: schedules, isLoading } = useSchedules();
  const [adding, setAdding] = useState(false);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps mb-1" style={{ color: ADITYA }}>
            Savita · Scheduler
          </p>
          <h1
            className="font-bold tracking-tight text-ink-primary"
            style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
          >
            Task Schedules
          </h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setAdding(true)}>
          <Plus size={15} />
          New Schedule
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-ink-ghost label-caps">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(schedules ?? []).map((s) => (
            <ScheduleCard key={s.id} schedule={s} />
          ))}
          {(schedules ?? []).length === 0 && (
            <div className="col-span-3 p-12 text-center text-ink-ghost">
              <Clock size={32} className="mx-auto mb-3 opacity-30" />
              <p className="label-caps">No schedules configured</p>
            </div>
          )}
        </div>
      )}

      {adding && <AddScheduleModal onClose={() => setAdding(false)} />}
    </div>
  );
}
