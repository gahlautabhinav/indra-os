"use client";

import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Notification } from "@indra/types";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
  useNotifications,
  useNotificationStats,
} from "@/lib/api/hooks";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#c44450",
  warning: "#e0a030",
  info: "#3a80d4",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationItem({ n }: { n: Notification }) {
  const markRead = useMarkNotificationRead();
  const del = useDeleteNotification();
  const color = SEVERITY_COLOR[n.severity] ?? SEVERITY_COLOR.info;

  return (
    <div
      className={`flex gap-3 px-4 py-3 border-b border-hairline group hover:bg-surface-2 transition-colors ${n.is_read ? "opacity-60" : ""}`}
    >
      {/* severity dot */}
      <div className="mt-1 flex-shrink-0">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color, opacity: n.is_read ? 0.4 : 1 }}
        />
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink leading-snug">{n.title}</p>
        <p className="text-xs text-ink-muted mt-0.5 leading-snug line-clamp-2">{n.message}</p>
        <span className="text-[10px] font-mono text-ink-ghost mt-1 block">
          {timeAgo(n.created_at)}
        </span>
      </div>

      {/* actions */}
      <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!n.is_read && (
          <button
            onClick={() => markRead.mutate(n.id)}
            className="p-1 rounded text-ink-ghost hover:text-ink-secondary hover:bg-surface-3 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => del.mutate(n.id)}
          className="p-1 rounded text-ink-ghost hover:text-state-critical hover:bg-surface-3 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const stats = useNotificationStats();
  const notifications = useNotifications({ limit: 20 });
  const markAll = useMarkAllNotificationsRead();

  const unread = stats.data?.unread ?? 0;

  return (
    <div className="relative">
      {/* Bell trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded p-1.5 text-ink-tertiary transition-colors hover:bg-surface-2 hover:text-ink-secondary"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: "#c44450" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div
            className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-hairline bg-surface-1 shadow-xl overflow-hidden"
            style={{ borderTop: "2px solid #c44450" }}
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
              <span className="label-caps" style={{ color: "#c44450" }}>
                Devadattah — Notifications
              </span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => markAll.mutate()}
                    className="p-1 rounded text-ink-ghost hover:text-ink-secondary hover:bg-surface-2 transition-colors"
                    title="Mark all read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded text-ink-ghost hover:text-ink-secondary hover:bg-surface-2 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.data?.notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-ink-ghost">No notifications</p>
                </div>
              ) : (
                notifications.data?.notifications.map((n) => (
                  <NotificationItem key={n.id} n={n} />
                ))
              )}
            </div>

            {/* footer */}
            {(stats.data?.total ?? 0) > 0 && (
              <div className="px-4 py-2 border-t border-hairline">
                <span className="text-[10px] font-mono text-ink-ghost">
                  {stats.data?.total ?? 0} total · {unread} unread
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
