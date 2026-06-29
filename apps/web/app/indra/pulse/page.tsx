"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "@/lib/ws/useWebSocket";
import { useDashboard, useNotificationStats, useProcesses } from "@/lib/api/hooks";
import type { WSEvent } from "@indra/types";
import { DevaPageHeader } from "@/components/common/DevaScaffold";
import { MetricTile } from "@/components/metrics/MetricTile";
import { EmptyState } from "@/components/common/EmptyState";

const INDRA = "#4dc8c8";
const MAX_EVENTS = 60;

function EventRow({ event, idx }: { event: WSEvent & { _ts: number }; idx: number }) {
  const fresh = Date.now() - event._ts < 3000;

  return (
    <div
      className="flex items-start gap-3 border-b border-hairline px-4 py-2 transition-all last:border-0"
      style={fresh ? { background: `color-mix(in oklab, ${INDRA} 6%, transparent)` } : {}}
    >
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: INDRA }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-ink-secondary" style={{ fontSize: "10px" }}>
            {event.event_type}
          </span>
          <span className="font-mono tabular-nums text-ink-ghost" style={{ fontSize: "9px" }}>
            {new Date(event._ts).toLocaleTimeString()}
          </span>
        </div>
        <p className="truncate text-xs text-ink-secondary">
          {typeof event.data === "object" && event.data
            ? JSON.stringify(event.data).slice(0, 120)
            : String(event.data ?? "—")}
        </p>
      </div>
      <span className="mt-0.5 shrink-0 font-mono tabular-nums text-ink-ghost" style={{ fontSize: "9px" }}>
        #{idx}
      </span>
    </div>
  );
}

export default function PulsePage() {
  const { status, isConnected } = useWebSocket();
  const { data: dashboard } = useDashboard();
  const { data: notifStats } = useNotificationStats();
  const { data: processes } = useProcesses({ all_processes: false, limit: 20 });
  const [events, setEvents] = useState<Array<WSEvent & { _ts: number }>>([]);
  const counterRef = useRef(0);

  // Intercept WebSocket messages for the live feed
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("indra_token") : null;
    const wsUrl =
      (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8333") +
      "/ws/connect" +
      (token ? `?token=${encodeURIComponent(token)}` : "");
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (msg) => {
      if (msg.data === "pong") return;
      try {
        const event = JSON.parse(msg.data) as WSEvent;
        counterRef.current++;
        setEvents((prev) => [{ ...event, _ts: Date.now() }, ...prev].slice(0, MAX_EVENTS));
      } catch {
        // ignore
      }
    };

    return () => ws.close();
  }, []);

  const healthPct = dashboard?.system_health ?? 0;
  const healthColor =
    healthPct >= 90
      ? "var(--state-healthy)"
      : healthPct >= 60
        ? "var(--state-degraded)"
        : "var(--state-critical)";
  const unread = notifStats?.unread ?? 0;

  return (
    <div className="space-y-5 p-6">
      <DevaPageHeader
        accent={INDRA}
        deva="Indra"
        role="Livewatch"
        title="Civilization Pulse"
        sanskrit="इन्द्रः"
        description="the real-time stream of every signal across the civilization."
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-1 p-3 text-xs">
        {isConnected ? (
          <Wifi size={14} className="text-healthy" />
        ) : (
          <WifiOff size={14} className="text-critical" />
        )}
        <span className={isConnected ? "text-healthy" : "text-critical"}>
          WebSocket: {status.toUpperCase()}
        </span>
        <span className="text-hairline-bright">·</span>
        <span className="font-mono tabular-nums text-ink-ghost">{counterRef.current} events received</span>
        <span className="ml-auto font-mono tabular-nums text-ink-ghost">
          {new Date().toLocaleTimeString()} local
        </span>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricTile label="System Health" value={healthPct} unit="%" domain="indra" valueColor={healthColor} live />
        <MetricTile label="Active Agents" value={dashboard?.active_agents ?? 0} domain="rudra" />
        <MetricTile label="Active Processes" value={processes?.processes?.length ?? 0} domain="vasu" />
        <MetricTile
          label="Unread Alerts"
          value={unread}
          domain="indra"
          valueColor={unread > 0 ? "var(--state-critical)" : "var(--indra-ink-primary)"}
        />
      </div>

      {/* Live event feed */}
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1" style={{ borderTop: `2px solid ${INDRA}` }}>
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <Activity size={14} style={{ color: INDRA }} />
          <span className="label-caps text-ink-secondary">Live Event Stream</span>
          {isConnected && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="live-ring absolute inset-0 rounded-full bg-accent" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="label-caps text-accent">Live</span>
            </span>
          )}
        </div>
        {events.length === 0 ? (
          <EmptyState
            icon={Activity}
            accent={INDRA}
            title="Waiting for events"
            body={
              isConnected
                ? "Connected. Start a Claude Code session to see activity stream in live."
                : "WebSocket disconnected — events will appear here once the connection is restored."
            }
          />
        ) : (
          <div className="max-h-[480px] overflow-y-auto font-mono">
            {events.map((ev, i) => (
              <EventRow key={`${ev._ts}-${i}`} event={ev} idx={counterRef.current - i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
