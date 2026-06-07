"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const WS_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    .replace(/^http/, "ws") + "/ws/connect";

export function useIndraWS() {
  const qc = useQueryClient();
  const ws = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      try {
        const socket = new WebSocket(WS_URL);
        ws.current = socket;

        socket.onopen = () => {
          pingRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send("ping");
            }
          }, 20_000);
        };

        socket.onmessage = (evt) => {
          if (evt.data === "pong") return;
          try {
            const event = JSON.parse(evt.data as string) as {
              event_type: string;
              domain: string;
              data: Record<string, unknown>;
            };
            invalidateForEvent(qc, event.event_type);
          } catch {
            // ignore parse errors
          }
        };

        socket.onclose = () => {
          if (pingRef.current) clearInterval(pingRef.current);
          // reconnect after 3s
          reconnectTimer = setTimeout(connect, 3_000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5_000);
      }
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingRef.current) clearInterval(pingRef.current);
      ws.current?.close();
    };
  }, [qc]);
}

function invalidateForEvent(
  qc: ReturnType<typeof useQueryClient>,
  eventType: string
) {
  switch (eventType) {
    case "agent.status_changed":
      void qc.invalidateQueries({ queryKey: ["agents"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      break;
    case "task.created":
    case "task.status_changed":
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      break;
    case "session.created":
    case "session.ended":
      void qc.invalidateQueries({ queryKey: ["sessions"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      break;
    case "trace.completed":
      void qc.invalidateQueries({ queryKey: ["traces"] });
      break;
    default:
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }
}
