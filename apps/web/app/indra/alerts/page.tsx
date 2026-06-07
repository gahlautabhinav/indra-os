"use client";

import { Bell, CheckCheck, Trash2, AlertTriangle, Info, Zap } from "lucide-react";
import {
  useNotifications,
  useNotificationStats,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/lib/api/hooks";
import type { Notification } from "@indra/types";
import { useState } from "react";

const INDRA = "#4dc8c8";

const LEVEL_DEFAULT = { color: "#3a80d4", Icon: Info, label: "Info" };
const LEVEL_CONFIG: Record<string, { color: string; Icon: React.ElementType; label: string }> = {
  info: LEVEL_DEFAULT,
  warning: { color: "#e0a030", Icon: AlertTriangle, label: "Warning" },
  critical: { color: "#c44450", Icon: Zap, label: "Critical" },
};

function NotifCard({ notif }: { notif: Notification }) {
  const markRead = useMarkNotificationRead();
  const del = useDeleteNotification();
  const cfg = LEVEL_CONFIG[notif.severity ?? "info"] ?? LEVEL_DEFAULT;
  const { Icon } = cfg;

  return (
    <div
      className="bg-surface-1 border rounded-lg p-4 flex items-start gap-3 transition-all"
      style={{
        borderColor: notif.is_read ? "var(--hairline)" : `${cfg.color}44`,
        opacity: notif.is_read ? 0.7 : 1,
      }}
    >
      <Icon size={15} style={{ color: cfg.color }} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ background: `${cfg.color}22`, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {notif.source_type && (
            <span className="text-xs text-ink-ghost font-mono">{notif.source_type}</span>
          )}
          {!notif.is_read && (
            <span className="w-1.5 h-1.5 rounded-full ml-auto shrink-0" style={{ background: cfg.color }} />
          )}
        </div>
        <p className="font-semibold text-ink-primary text-sm">{notif.title}</p>
        {notif.message && <p className="text-xs text-ink-ghost">{notif.message}</p>}
        <p className="text-xs text-ink-ghost font-mono">
          {new Date(notif.created_at).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!notif.is_read && (
          <button
            className="p-1.5 rounded hover:bg-surface-2 transition-colors"
            title="Mark read"
            onClick={() => markRead.mutate(notif.id)}
          >
            <CheckCheck size={13} style={{ color: INDRA }} />
          </button>
        )}
        <button
          className="p-1.5 rounded hover:bg-surface-2 transition-colors text-ink-ghost hover:text-red-400"
          onClick={() => del.mutate(notif.id)}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data: notifs, isLoading } = useNotifications({ limit: 100, unread_only: unreadOnly });
  const { data: stats } = useNotificationStats();
  const markAll = useMarkAllNotificationsRead();

  const list = notifs?.notifications ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps mb-1" style={{ color: INDRA }}>
            INDRA · Alert Center
          </p>
          <h1
            className="font-bold tracking-tight text-ink-primary"
            style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
          >
            Alerts
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded border border-hairline hover:bg-surface-2 transition-colors"
            style={unreadOnly ? { borderColor: INDRA, color: INDRA } : {}}
            onClick={() => setUnreadOnly((v) => !v)}
          >
            {unreadOnly ? "Unread only" : "All alerts"}
          </button>
          {(stats?.unread ?? 0) > 0 && (
            <button
              className="text-xs px-3 py-1.5 rounded border border-hairline hover:bg-surface-2 transition-colors"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck size={12} className="inline mr-1" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Unread", value: stats.unread, color: stats.unread > 0 ? "#c44450" : "#637585" },
            { label: "Total", value: stats.total, color: "#637585" },
            { label: "Read", value: stats.total - stats.unread, color: "#2ab870" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-1 border border-hairline rounded-lg p-4 text-center">
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="label-caps text-ink-ghost mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alert list */}
      {isLoading ? (
        <div className="p-8 text-center text-ink-ghost label-caps">Loading…</div>
      ) : list.length === 0 ? (
        <div className="p-12 text-center text-ink-ghost">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p className="label-caps">No alerts</p>
          <p className="text-xs mt-1">Agent events and system warnings will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <NotifCard key={n.id} notif={n} />
          ))}
        </div>
      )}
    </div>
  );
}
