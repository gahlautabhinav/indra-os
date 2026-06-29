"use client";

import { useState } from "react";
import { Users, ChevronDown } from "lucide-react";
import { useRbacUsers, useRbacStats, useUpdateUserRole } from "@/lib/api/hooks";
import type { UserRole, UserRoleRead } from "@indra/types";
import { DevaPageHeader, StatTile } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

const ADITYA = "#3a80d4";

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "#c44450",
  user: "#3a80d4",
  viewer: "#637585",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: `${ROLE_COLORS[role]}22`, color: ROLE_COLORS[role] }}
    >
      {role}
    </span>
  );
}

function RoleSelector({ user }: { user: UserRoleRead }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateUserRole();

  const roles: UserRole[] = ["viewer", "user", "admin"];

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 px-2 py-1 rounded border border-hairline hover:bg-surface-2 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <RoleBadge role={user.role} />
        <ChevronDown size={12} className="text-ink-ghost" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-hairline rounded shadow-lg z-10 min-w-28">
          {roles.map((r) => (
            <button
              key={r}
              className="w-full text-left px-3 py-1.5 hover:bg-surface-3 flex items-center gap-2"
              onClick={() => {
                update.mutate({ userId: user.id, role: r });
                setOpen(false);
              }}
            >
              <RoleBadge role={r} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AryamaPage() {
  const { data: users, isLoading } = useRbacUsers();
  const { data: stats } = useRbacStats();

  return (
    <div className="p-6 space-y-5">
      <DevaPageHeader
        accent={ADITYA}
        deva="Aryama"
        role="Access Control"
        title="RBAC"
        sanskrit="अर्यमा"
        description="role-based access — who can see and do what across INDRA."
      />

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {(["admin", "user", "viewer", "total"] as const).map((key) => (
            <StatTile key={key} label={key} value={stats[key]} accent={ADITYA} />
          ))}
        </div>
      )}

      {/* Users table */}
      <div
        className="bg-surface-1 border border-hairline rounded-lg overflow-hidden"
        style={{ borderTop: "2px solid #3a80d4" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline">
          <Users size={15} className="text-ink-ghost" />
          <span className="label-caps text-ink-secondary">Users</span>
        </div>
        {isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={5} height={40} />
          </div>
        ) : (users ?? []).length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            body="People who sign in to INDRA appear here. Assign each a role — viewer, user, or admin — to control what they can see and do."
            accent={ADITYA}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-4 py-2 label-caps text-ink-ghost">Email</th>
                <th className="text-left px-4 py-2 label-caps text-ink-ghost">Name</th>
                <th className="text-left px-4 py-2 label-caps text-ink-ghost">Role</th>
                <th className="text-left px-4 py-2 label-caps text-ink-ghost">Joined</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-hairline last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-primary">{u.email}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">{u.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-ink-ghost text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <RoleSelector user={u} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
