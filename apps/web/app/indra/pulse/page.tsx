"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "@/lib/ws/useWebSocket";
import { useDashboard, useNotificationStats, useProcesses } from "@/lib/api/hooks";
import type { WSEvent } from "@indra/types";

const INDRA = "#4dc8c8";
const MAX_EVENTS = 60;

const EVENT_COLORS: Record<string, string> = {
  "agent.status_changed": "#4dc8c8",
  "session.created": "#2ab870",
  "session.ended": "#637585",
  "trace.completed": "#3a80d4",
  "mcp_server.status_changed": "#d4843a",
  "alert.created": "#c44450",
};

function EventRow({ event, idx }: { event: WSEvent & { _ts: number }; idx: number }) {
  const color = EVENT_COLORS[event.event_type] ?? "#637585";
  const age = Date.now() - event._ts;
  const fresh = age < 3000;

  return (
    <div
      className="flex items-start gap-3 px-4 py-2 border-b border-hairline last:border-0 transition-all"
      style={fresh ? { background: `${color}0a` } : {}}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
        style={{ background: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color, fontSize: "10px" }}>
            {event.event_type}
          </span>
          <span className="text-ink-ghost font-mono" style={{ fontSize: "9px" }}>
            {new Date(event._ts).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-xs text-ink-secondary truncate">
          {typeof event.data === "object" && event.data
            ? JSON.stringify(event.data).slice(0, 120)
            : String(event.data ?? "—")}
        </p>
      </div>
      <span
        className="text-xs font-mono shrink-0 mt-0.5"
        style={{ color: "#637585", fontSize: "9px" }}
      >
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
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000") + "/ws/connect";
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
  const healthColor = healthPct >= 90 ? "#2ab870" : healthPct >= 60 ? "#e0a030" : "#c44450";

  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="label-caps mb-1" style={{ color: INDRA }}>
          INDRA · Real-Time Pulse
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          System Pulse
        </h1>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-hairline bg-surface-1 text-xs">
        {isConnected ? (
          <Wifi size={14} className="text-healthy" />
        ) : (
          <WifiOff size={14} className="text-critical" />
        )}
        <span className={isConnected ? "text-healthy" : "text-critical"}>
          WebSocket: {status.toUpperCase()}
        </span>
        <span className="text-hairline-bright">·</span>
        <span className="text-ink-ghost font-mono">{counterRef.current} events received</span>
        <span className="ml-auto text-ink-ghost font-mono">
          {new Date().toLocaleTimeString()} local
        </span>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-1 border border-hairline rounded-lg p-4">
          <p className="label-caps text-ink-ghost mb-1">System Health</p>
          <p className="text-2xl font-bold" style={{ color: healthColor }}>{healthPct}%</p>
        </div>
        <div className="bg-surface-1 border border-hairline rounded-lg p-4">
          <p className="label-caps text-ink-ghost mb-1">Active Agents</p>
          <p className="text-2xl font-bold text-ink-primary">{dashboard?.active_agents ?? 0}</p>
        </div>
        <div className="bg-surface-1 border border-hairline rounded-lg p-4">
          <p className="label-caps text-ink-ghost mb-1">Active Processes</p>
          <p className="text-2xl font-bold text-ink-primary">{processes?.processes?.length ?? 0}</p>
        </div>
        <div className="bg-surface-1 border border-hairline rounded-lg p-4">
          <p className="label-caps text-ink-ghost mb-1">Unread Alerts</p>
          <p className="text-2xl font-bold" style={{ color: (notifStats?.unread ?? 0) > 0 ? "#c44450" : "#2ab870" }}>
            {notifStats?.unread ?? 0}
          </p>
        </div>
      </div>

      {/* Live event feed */}
      <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline">
          <Activity size={14} style={{ color: INDRA }} />
          <span className="label-caps text-ink-secondary">Live Event Stream</span>
          {isConnected && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-healthy">
              <span className="w-1.5 h-1.5 rounded-full bg-healthy animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        {events.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-ink-ghost">
              {isConnected
                ? "Waiting for events… start a Claude Code session to see activity"
                : "WebSocket disconnected — events will appear when connected"}
            </p>
          </div>
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
