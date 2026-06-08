"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgentStore } from "@/lib/store/agentStore";
import type { WSEvent } from "@indra/types";

type WSStatus = "connecting" | "connected" | "disconnected" | "error";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8333";
const BACKOFF_STEPS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useWebSocket() {
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleEvent = useCallback((event: WSEvent) => {
    const updateAgent = useAgentStore.getState().updateAgent;

    switch (event.event_type) {
      case "agent.status_changed": {
        const d = event.data as { agent_id?: string; session_id?: string; new_status?: string; status?: string };
        const targetId = d.agent_id ?? d.session_id;
        const newStatus = d.new_status ?? d.status;
        if (targetId && newStatus) {
          updateAgent(targetId, { status: newStatus as never });
        }
        break;
      }
      case "session.created":
      case "session.ended":
      case "trace.completed":
      case "mcp_server.status_changed":
      case "alert.created":
        // Handled via TanStack Query refetch on 5s interval.
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const token = typeof window !== "undefined" ? localStorage.getItem("indra_token") : null;
    const ws = new WebSocket(
      `${WS_URL}/ws/connect${token ? `?token=${encodeURIComponent(token)}` : ""}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      retryRef.current = 0;

      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 25_000);
    };

    ws.onmessage = (msg) => {
      if (msg.data === "pong") return;
      try {
        const event = JSON.parse(msg.data) as WSEvent;
        handleEvent(event);
      } catch {
        // malformed message — ignore
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      const delay = BACKOFF_STEPS[Math.min(retryRef.current, BACKOFF_STEPS.length - 1)] ?? 30000;
      retryRef.current++;
      setTimeout(connect, delay);
    };

    ws.onerror = () => setStatus("error");
  }, [handleEvent]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [connect]);

  return { status, isConnected: status === "connected" };
}
