"use client";

import { useState } from "react";
import { Radio, RefreshCw, Send, X } from "lucide-react";
import type { StreamInfo } from "@indra/types";
import { useStreams, useStreamEvents, usePublishToStream } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const ACCENT = "#d4843a";

function PublishModal({
  stream,
  onClose,
}: {
  stream: string;
  onClose: () => void;
}) {
  const [key, setKey] = useState("event");
  const [value, setValue] = useState("");
  const publish = usePublishToStream();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    publish.mutate(
      { stream, data: { [key.trim()]: value.trim() } },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative rounded-xl border border-hairline bg-surface-1 w-full max-w-md p-6"
        style={{ borderTop: `2px solid ${ACCENT}`, boxShadow: "var(--shadow-floating)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="label-caps" style={{ color: ACCENT }}>Publish Event</span>
            <p className="text-[11px] font-mono text-ink-ghost mt-0.5 truncate max-w-[280px]">{stream}</p>
          </div>
          <button type="button" onClick={onClose} className="text-ink-ghost hover:text-ink-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-caps text-ink-ghost block mb-1">Key</label>
            <input
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-hairline-bright"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="event"
              required
            />
          </div>
          <div>
            <label className="label-caps text-ink-ghost block mb-1">Value</label>
            <input
              className="w-full bg-surface-2 border border-hairline rounded px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-hairline-bright"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="agent.spawned"
              required
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="label-caps text-ink-ghost hover:text-ink-secondary px-3 py-1.5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={publish.isPending}
            className="label-caps px-4 py-1.5 rounded text-white flex items-center gap-1.5"
            style={{ backgroundColor: ACCENT, opacity: publish.isPending ? 0.6 : 1 }}
          >
            <Send className="w-3 h-3" />
            {publish.isPending ? "Sending…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}

function timeFromMs(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

export default function ApahPage() {
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);

  const { data: streamsData, isLoading: streamsLoading, refetch } = useStreams();
  const { data: eventsData, isLoading: eventsLoading } = useStreamEvents(selectedStream, 50);

  const streams = streamsData?.streams ?? [];
  const events = eventsData?.events ?? [];

  return (
    <div className="p-6 space-y-5">
      {showPublish && selectedStream && (
        <PublishModal stream={selectedStream} onClose={() => setShowPublish(false)} />
      )}

      {/* Header */}
      <DevaPageHeader
        accent={ACCENT}
        deva="Āpaḥ"
        role="Event Streams"
        title="Data Flow"
        sanskrit="आपः"
        description="live XREVRANGE view of every INDRA Redis event stream."
        actions={
          <>
            <button
              onClick={() => void refetch()}
              className="flex items-center gap-1.5 label-caps px-3 py-2 rounded border border-hairline hover:border-hairline-bright transition-colors text-ink-ghost hover:text-ink-secondary"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
            {selectedStream && (
              <button
                onClick={() => setShowPublish(true)}
                className="flex items-center gap-1.5 label-caps px-3 py-2 rounded border border-hairline hover:border-hairline-bright transition-colors"
                style={{ color: ACCENT }}
              >
                <Send className="w-3 h-3" />
                Publish
              </button>
            )}
          </>
        }
      />

      {/* Stats */}
      <div className="flex items-start gap-3 flex-wrap">
        <StatTile accent={ACCENT} label="Streams" value={streams.length} />
        <StatTile accent={ACCENT} label="Selected Events" value={eventsData?.total ?? "—"} />
      </div>

      {/* Split: stream list + event viewer */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "280px 1fr" }}>
        {/* Stream list */}
        <div
          className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden"
          style={{ borderTop: `2px solid ${ACCENT}` }}
        >
          <div className="px-4 py-2.5 border-b border-hairline bg-surface-2">
            <span className="label-caps text-ink-tertiary">Streams</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)" }}>
            {streamsLoading ? (
              <SkeletonRows rows={5} height={40} className="p-3" />
            ) : !streams.length ? (
              <EmptyState
                icon={Radio}
                accent={ACCENT}
                title="No streams yet"
                body="Event streams appear here once agents and plugins publish to the INDRA Redis bus."
              />
            ) : (
              streams.map((s: StreamInfo) => (
                <button
                  key={s.name}
                  onClick={() => setSelectedStream(selectedStream === s.name ? null : s.name)}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left border-b border-hairline last:border-0 transition-colors ${
                    selectedStream === s.name ? "bg-surface-3" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="text-[11px] font-mono text-ink-secondary truncate">{s.name}</span>
                  <span
                    className="text-[10px] font-mono tabular-nums shrink-0 px-1.5 py-0.5 rounded"
                    style={{ color: ACCENT, backgroundColor: `${ACCENT}18` }}
                  >
                    {s.length}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Event viewer */}
        <div
          className="rounded-[12px] border border-hairline bg-surface-1 overflow-hidden"
          style={{ borderTop: `2px solid ${ACCENT}` }}
        >
          <div className="px-4 py-2.5 border-b border-hairline bg-surface-2 flex items-center gap-2">
            <span className="label-caps text-ink-tertiary flex-1">
              {selectedStream ? "Events" : "Select a stream"}
            </span>
            {selectedStream && (
              <span className="text-[11px] font-mono text-ink-ghost truncate max-w-xs">{selectedStream}</span>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)", minHeight: "300px" }}>
            {!selectedStream ? (
              <EmptyState
                icon={Radio}
                accent={ACCENT}
                title="Select a stream"
                body="Pick a stream on the left to tail its most recent events live."
              />
            ) : eventsLoading ? (
              <SkeletonRows rows={6} height={64} className="p-4" />
            ) : !events.length ? (
              <EmptyState
                icon={Radio}
                accent={ACCENT}
                title="No events in this stream"
                body="Publish an event or wait for agents to emit one — new entries surface at the top."
              />
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="px-4 py-3 border-b border-hairline last:border-0 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono tabular-nums text-ink-ghost">{timeFromMs(ev.timestamp_ms)}</span>
                    <span className="text-[10px] font-mono tabular-nums text-ink-ghost opacity-50">{ev.id}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ev.data).map(([k, v]) => (
                      <span key={k} className="text-[11px] font-mono">
                        <span className="text-ink-ghost">{k}:</span>{" "}
                        <span className="text-ink-secondary">{String(v).slice(0, 80)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
