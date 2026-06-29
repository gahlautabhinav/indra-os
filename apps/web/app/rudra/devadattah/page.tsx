"use client";

import { useState } from "react";
import { Bell, BellOff, CheckCheck, Trash2, Inbox } from "lucide-react";
import type { Notification } from "@indra/types";
import {
  useNotifications,
  useNotificationStats,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/lib/api/hooks";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/Skeleton";

const RUDRA = "#c44450";

const SEV_COLOR: Record<string, string> = {
  critical: "#e04040",
  warning: "#e0a030",
  info: "#4dc8c8",
};

export default function DevadattahPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications({ limit: 100, unread_only: unreadOnly });
  const { data: stats } = useNotificationStats();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const del = useDeleteNotification();

  const notifications = (data?.notifications ?? []) as Notification[];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={RUDRA}
        deva="Devadattah"
        role="Notifications"
        title="Notification Center"
        sanskrit="देवदत्तः"
        description="the conch-breath that announces system events across the 33 Devas."
        actions={
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || (stats?.unread ?? 0) === 0}
            className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:bg-surface-2 disabled:opacity-40"
            style={{ borderColor: `${RUDRA}44` }}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatTile label="Total" value={stats?.total ?? 0} accent={RUDRA} />
        <StatTile label="Unread" value={stats?.unread ?? 0} accent={RUDRA} />
        <label className="ml-auto flex cursor-pointer select-none items-center gap-1.5 text-xs text-ink-ghost">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="h-3 w-3 rounded"
          />
          Unread only
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1" style={{ borderTop: `2px solid ${RUDRA}` }}>
        {isLoading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={unreadOnly ? "No unread notifications" : "Inbox empty"}
            body="Devadattah delivers alerts, status changes, and escalations here as the system runs."
            accent={RUDRA}
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {notifications.map((n) => {
              const color = SEV_COLOR[n.severity] ?? "#637585";
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/40 ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <span
                    className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: n.is_read ? "#3d5060" : color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink-secondary">{n.title}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase"
                        style={{ background: `${color}22`, color }}
                      >
                        {n.severity}
                      </span>
                      <span className="font-mono text-[10px] text-ink-ghost">{n.domain}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-tertiary">{n.message}</p>
                    <p className="mt-1 font-mono text-[10px] text-ink-ghost">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!n.is_read && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        title="Mark read"
                        className="rounded p-1.5 text-ink-ghost transition-colors hover:bg-surface-2 hover:text-ink-secondary"
                      >
                        <BellOff className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => del.mutate(n.id)}
                      title="Delete"
                      className="rounded p-1.5 text-ink-ghost transition-colors hover:bg-surface-2 hover:text-critical"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isLoading && notifications.length === 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-ink-ghost">
          <Bell className="h-3 w-3" /> Live — refreshes every 15s
        </div>
      )}
    </div>
  );
}
