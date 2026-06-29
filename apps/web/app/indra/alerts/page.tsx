"use client";

import { CheckCheck, Trash2, AlertTriangle, Info, Zap, ShieldCheck } from "lucide-react";
import {
  useNotifications,
  useNotificationStats,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/lib/api/hooks";
import type { Notification } from "@indra/types";
import { useState } from "react";
import { DevaPageHeader } from "@/components/common/DevaScaffold";
import { MetricTile } from "@/components/metrics/MetricTile";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const INDRA = "#4dc8c8";

const LEVEL_DEFAULT = { color: "#3a80d4", Icon: Info, label: "Info" };
const LEVEL_CONFIG: Record<string, { color: string; Icon: React.ElementType; label: string }> = {
  info: LEVEL_DEFAULT,
  warning: { color: "var(--state-degraded)", Icon: AlertTriangle, label: "Warning" },
  critical: { color: "var(--state-critical)", Icon: Zap, label: "Critical" },
};

function NotifCard({ notif }: { notif: Notification }) {
  const markRead = useMarkNotificationRead();
  const del = useDeleteNotification();
  const cfg = LEVEL_CONFIG[notif.severity ?? "info"] ?? LEVEL_DEFAULT;
  const { Icon } = cfg;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border bg-surface-1 p-4 transition-all"
      style={{
        borderColor: notif.is_read
          ? "var(--hairline)"
          : `color-mix(in oklab, ${cfg.color} 30%, transparent)`,
        opacity: notif.is_read ? 0.7 : 1,
      }}
    >
      <Icon size={15} style={{ color: cfg.color }} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex rounded px-1.5 py-0.5 text-xs font-medium"
            style={{ background: `color-mix(in oklab, ${cfg.color} 14%, transparent)`, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {notif.source_type && (
            <span className="font-mono text-xs text-ink-ghost">{notif.source_type}</span>
          )}
          {!notif.is_read && (
            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cfg.color }} />
          )}
        </div>
        <p className="text-sm font-semibold text-ink-primary">{notif.title}</p>
        {notif.message && <p className="text-xs text-ink-ghost">{notif.message}</p>}
        <p className="font-mono text-xs tabular-nums text-ink-ghost">
          {new Date(notif.created_at).toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!notif.is_read && (
          <button
            className="rounded p-1.5 transition-colors hover:bg-surface-2"
            title="Mark read"
            onClick={() => markRead.mutate(notif.id)}
          >
            <CheckCheck size={13} style={{ color: INDRA }} />
          </button>
        )}
        <button
          className="rounded p-1.5 text-ink-ghost transition-colors hover:bg-surface-2 hover:text-critical"
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
    <div className="space-y-5 p-6">
      <DevaPageHeader
        accent={INDRA}
        deva="Indra"
        role="Notifications"
        title="System Alerts"
        sanskrit="इन्द्रः"
        description="agent events and system warnings, ranked by severity."
        actions={
          <>
            <button
              className="rounded border border-hairline px-3 py-1.5 text-xs transition-colors hover:bg-surface-2"
              style={unreadOnly ? { borderColor: INDRA, color: INDRA } : {}}
              onClick={() => setUnreadOnly((v) => !v)}
            >
              {unreadOnly ? "Unread only" : "All alerts"}
            </button>
            {(stats?.unread ?? 0) > 0 && (
              <button
                className="rounded border border-hairline px-3 py-1.5 text-xs transition-colors hover:bg-surface-2"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck size={12} className="mr-1 inline" />
                Mark all read
              </button>
            )}
          </>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <MetricTile
            label="Unread"
            value={stats.unread}
            domain="indra"
            valueColor={stats.unread > 0 ? "var(--state-critical)" : "var(--indra-ink-primary)"}
          />
          <MetricTile label="Total" value={stats.total} domain="indra" />
          <MetricTile
            label="Read"
            value={stats.total - stats.unread}
            domain="indra"
            valueColor="var(--state-healthy)"
          />
        </div>
      )}

      {/* Alert list */}
      {isLoading ? (
        <SkeletonRows rows={5} height={84} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          accent={INDRA}
          title="All clear"
          body="No alerts right now. Agent events and system warnings will appear here as they fire."
        />
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
