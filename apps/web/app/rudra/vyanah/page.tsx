"use client";

import { useState } from "react";
import { Send, MessagesSquare, Bot } from "lucide-react";
import type { Agent, AgentMessage } from "@indra/types";
import { useAgents, useAgentMessages, usePublishMessage } from "@/lib/api/hooks";
import { DevaHeader, DevaEmptyState, RUDRA } from "@/components/rudra/DevaHeader";

const ROLE_COLOR: Record<string, string> = {
  human: "#4dc8c8",
  agent: "#c44450",
  system: "#637585",
};

export default function VyanahPage() {
  const { data: agentsData } = useAgents({ limit: 100 });
  const agents = (agentsData?.agents ?? []) as Agent[];

  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? agents[0]?.id ?? null;

  const { data: msgData, isLoading } = useAgentMessages(activeId);
  const publish = usePublishMessage();
  const [draft, setDraft] = useState("");

  const messages = (msgData?.messages ?? []) as AgentMessage[];

  function send() {
    if (!draft.trim() || !activeId) return;
    publish.mutate(
      { agentId: activeId, role: "human", content: draft.trim() },
      { onSuccess: () => setDraft("") }
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      <DevaHeader
        deva="Vyanah"
        role="Inter-Agent Messaging"
        title="The Pervading Breath"
        sanskrit="व्यानः"
        description="the all-pervading current that carries messages between agents and operators."
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Agent picker */}
        <div className="flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border border-hairline bg-surface-1">
          <div className="border-b border-hairline px-3 py-2 text-[10px] uppercase tracking-wider text-ink-ghost">
            Agents · {agents.length}
          </div>
          <div className="flex-1 overflow-y-auto">
            {agents.length === 0 ? (
              <div className="p-4 text-xs text-ink-ghost">No agents yet.</div>
            ) : (
              agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className={`flex w-full items-center gap-2 border-b border-hairline px-3 py-2.5 text-left transition-colors last:border-0 ${
                    activeId === a.id ? "bg-surface-3" : "hover:bg-surface-2/60"
                  }`}
                  style={activeId === a.id ? { borderLeft: `2px solid ${RUDRA}` } : {}}
                >
                  <Bot className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-ink-secondary">{a.name}</span>
                    <span className="block font-mono text-[10px] text-ink-ghost">{a.status}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-hairline bg-surface-1">
          <div className="flex-1 overflow-y-auto p-4">
            {!activeId ? (
              <DevaEmptyState
                icon={<MessagesSquare className="h-5 w-5" />}
                title="Select an agent"
                hint="Vyanah carries the message stream for each agent. Pick one to read and reply."
              />
            ) : isLoading ? (
              <div className="py-12 text-center text-sm text-ink-ghost">Loading messages…</div>
            ) : messages.length === 0 ? (
              <DevaEmptyState
                icon={<MessagesSquare className="h-5 w-5" />}
                title="No messages yet"
                hint="Send the first message below — it will be published to this agent's channel."
              />
            ) : (
              <ul className="space-y-3">
                {messages.map((m) => {
                  const color = ROLE_COLOR[m.role] ?? "#637585";
                  return (
                    <li key={m.id} className="flex gap-3">
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
                            {m.role}
                          </span>
                          <span className="font-mono text-[10px] text-ink-ghost">
                            {new Date(m.timestamp_ms).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink-secondary">
                          {m.content}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Composer */}
          {activeId && (
            <div className="flex items-center gap-2 border-t border-hairline p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Message this agent…"
                className="input-field flex-1"
              />
              <button
                onClick={send}
                disabled={!draft.trim() || publish.isPending}
                className="flex items-center gap-1.5 rounded px-3 py-2 text-sm text-white transition-colors disabled:opacity-40"
                style={{ background: RUDRA }}
              >
                <Send className="h-3.5 w-3.5" /> Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
