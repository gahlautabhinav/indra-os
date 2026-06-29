"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useSessions, useSessionEvents } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { Session, SessionEventItem } from "@indra/types";

const ACCENT = "#d4843a";

const PLUGIN_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  gemini_cli: "Gemini CLI",
  codex_cli: "Codex CLI",
  kiro_cli: "Kiro",
  opencode: "OpenCode",
  antigravity: "Antigravity",
};

const PLUGIN_COLORS: Record<string, string> = {
  claude_code: "#d4843a",
  gemini_cli: "#4dc8c8",
  codex_cli: "#7c6af7",
  kiro_cli: "#2ab870",
  opencode: "#e04040",
  antigravity: "#a855f7",
};

function PluginBadge({ pluginType }: { pluginType: string }) {
  const label = PLUGIN_LABELS[pluginType] ?? pluginType;
  const color = PLUGIN_COLORS[pluginType] ?? "#637585";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active" ? "#2ab870" :
    status === "error"  ? "#e04040" :
    "#637585";
  return <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

function SessionRow({ session, selected, onClick }: { session: Session; selected: boolean; onClick: () => void }) {
  const meta = session.metadata as Record<string, unknown>;
  const projectName = session.project_path
    ? session.project_path.split(/[\\/]/).pop() ?? session.project_path
    : null;
  const title = (meta?.title as string) || null;
  const tokens = (meta?.token_count as number) ?? 0;
  const cost = (meta?.cost_usd as number) ?? 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-hairline last:border-0 ${
        selected ? "bg-surface-3" : "hover:bg-surface-2/60"
      }`}
    >
      <StatusDot status={session.status} />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm text-ink-secondary">
          {title ?? projectName ?? `${session.plugin_type} session`}
        </span>
        <span className="flex items-center gap-1.5 font-mono tabular-nums text-[10px] text-ink-ghost">
          <span>{session.id.slice(0, 8)}…</span>
          {title && projectName && <span className="truncate">· {projectName}</span>}
        </span>
      </span>

      <PluginBadge pluginType={session.plugin_type} />

      <span className="font-mono text-ink-ghost shrink-0 tabular-nums" style={{ fontSize: "11px", minWidth: "64px", textAlign: "right" }}>
        {tokens > 0 ? `${(tokens / 1000).toFixed(1)}k tok` : "—"}
      </span>

      <span className="font-mono text-ink-ghost shrink-0 tabular-nums" style={{ fontSize: "11px", minWidth: "52px", textAlign: "right" }}>
        {cost > 0 ? `$${cost.toFixed(4)}` : "—"}
      </span>

      <span className="font-mono tabular-nums text-ink-ghost shrink-0" style={{ fontSize: "10px" }}>
        {session.started_at ? new Date(session.started_at).toLocaleString() : "—"}
      </span>
    </button>
  );
}

const EVENT_STYLE: Record<string, { label: string; color: string }> = {
  user_message: { label: "USER", color: "#4dc8c8" },
  assistant_message: { label: "ASSISTANT", color: "#d4843a" },
  tool_call: { label: "TOOL CALL", color: "#7c6af7" },
  tool_result: { label: "TOOL RESULT", color: "#2ab870" },
};

function EventTurn({ event }: { event: SessionEventItem }) {
  const style = EVENT_STYLE[event.event_type] ?? { label: event.event_type.toUpperCase(), color: "#637585" };
  const content = (event.content ?? "").trim();
  if (!content) return null;
  const isTool = event.event_type === "tool_call" || event.event_type === "tool_result";
  return (
    <div className="border-l pl-3" style={{ borderColor: style.color }}>
      <div className="mb-0.5 flex items-center gap-2">
        <span className="text-[10px] font-mono font-semibold tracking-wider" style={{ color: style.color }}>
          {style.label}
        </span>
        {event.output_tokens > 0 && (
          <span className="font-mono tabular-nums text-[9px] text-ink-ghost">{event.output_tokens} tok out</span>
        )}
        <span className="ml-auto font-mono tabular-nums text-[9px] text-ink-ghost">
          {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ""}
        </span>
      </div>
      <div
        className={`whitespace-pre-wrap break-words text-[12px] leading-relaxed ${
          isTool ? "font-mono text-ink-tertiary" : "text-ink-secondary"
        }`}
      >
        {content.length > 1200 ? content.slice(0, 1200) + " …" : content}
      </div>
    </div>
  );
}

function SessionDetail({ session }: { session: Session }) {
  const meta = session.metadata as Record<string, unknown>;
  const { data: convo, isLoading } = useSessionEvents(session.id);
  const events = (convo?.events ?? []).filter((e) => (e.content ?? "").trim());

  return (
    <div className="flex h-full flex-col">
      {/* Header strip */}
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <StatusDot status={session.status} />
        <PluginBadge pluginType={session.plugin_type} />
        <span className="ml-auto truncate font-mono text-[11px] text-ink-ghost">
          {session.project_path?.split(/[\\/]/).pop() ?? session.id.slice(0, 8)}
        </span>
      </div>

      {/* Stat row */}
      <div className="flex flex-wrap gap-3 border-b border-hairline px-4 py-3 font-mono tabular-nums text-[11px] text-ink-ghost">
        <span>{((meta?.token_count as number) ?? 0).toLocaleString()} tok</span>
        <span>${((meta?.cost_usd as number) ?? 0).toFixed(4)}</span>
        <span>{convo?.total ?? ((meta?.event_count as number) ?? 0)} events</span>
        <span>
          {session.started_at ? new Date(session.started_at).toLocaleString() : "—"}
          {session.ended_at ? " → ended" : " · active"}
        </span>
      </div>

      {/* Conversation timeline */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <span className="label-caps text-ink-tertiary">Conversation — prompts, responses & tool calls</span>
        </div>
        {isLoading ? (
          <div className="px-4 py-2">
            <SkeletonRows rows={5} height={48} />
          </div>
        ) : convo && !convo.available ? (
          <div className="px-4 py-8 text-center text-xs text-ink-ghost">
            This adapter ({session.plugin_type}) stores conversations in a binary format INDRA can&apos;t decode yet.
          </div>
        ) : events.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-ghost">No readable turns in this session.</div>
        ) : (
          <div className="flex flex-col gap-3 px-4 pb-6">
            {events.map((e) => (
              <EventTurn key={e.id} event={e} />
            ))}
            {convo?.truncated && (
              <p className="pt-2 text-center font-mono tabular-nums text-[10px] text-ink-ghost">
                Showing first {events.length} turns — session continues.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const PLUGIN_FILTERS = [
  { value: undefined, label: "All" },
  { value: "claude_code", label: "Claude Code" },
  { value: "gemini_cli", label: "Gemini CLI" },
  { value: "codex_cli", label: "Codex CLI" },
  { value: "kiro_cli", label: "Kiro" },
  { value: "opencode", label: "OpenCode" },
  { value: "antigravity", label: "Antigravity" },
] as const;

export default function SomahPage() {
  const [pluginFilter, setPluginFilter] = useState<string | undefined>(undefined);
  const [activeOnly, setActiveOnly] = useState(false);
  const [selected, setSelected] = useState<Session | null>(null);

  const { data, isLoading } = useSessions({
    limit: 100,
    ...(pluginFilter ? { plugin_type: pluginFilter } : {}),
    ...(activeOnly ? { status: "active" } : {}),
  });

  const sessions = data?.items ?? [];
  const total = data?.total ?? 0;
  const active = sessions.filter((s) => s.status === "active").length;
  const plugins = [...new Set(sessions.map((s) => s.plugin_type))].length;

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-hairline px-6 py-4">
        <DevaPageHeader
          accent={ACCENT}
          deva="Somaḥ"
          role="Sessions"
          title="Sessions"
          sanskrit="सोमः"
          description="CLI adapter sessions across every connected tool."
          actions={
            <label className="flex items-center gap-1.5 text-xs text-ink-ghost cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="w-3 h-3 rounded"
              />
              Active only
            </label>
          }
        />
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-6 py-3 border-b border-hairline overflow-x-auto">
        <StatTile accent={ACCENT} label="Total" value={total} />
        <StatTile accent={ACCENT} label="Active" value={active} />
        <StatTile accent={ACCENT} label="Adapters" value={plugins} />
      </div>

      {/* Plugin filter tabs */}
      <div className="flex gap-1 px-6 py-2 border-b border-hairline overflow-x-auto">
        {PLUGIN_FILTERS.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setPluginFilter(f.value)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
              pluginFilter === f.value
                ? "bg-surface-3 text-ink-primary"
                : "text-ink-ghost hover:text-ink-secondary hover:bg-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Session list */}
        <div className="flex flex-col border-r border-hairline overflow-y-auto" style={{ width: "55%" }}>
          {isLoading ? (
            <div className="p-3">
              <SkeletonRows rows={8} height={56} />
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              accent={ACCENT}
              title="No sessions yet"
              body="Sessions appear here when Claude Code, Kiro, Codex, Gemini or OpenCode runs and syncs to INDRA."
            />
          ) : (
            sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                selected={selected?.id === s.id}
                onClick={() => setSelected(s)}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto bg-surface-1">
          {selected ? (
            <SessionDetail session={selected} />
          ) : (
            <EmptyState
              icon={MessageSquare}
              accent={ACCENT}
              title="Select a session"
              body="Pick a session to read its prompts, responses and tool calls turn by turn."
            />
          )}
        </div>
      </div>
    </div>
  );
}
