"use client";

import { useState } from "react";
import { Users, ChevronDown } from "lucide-react";
import { useRbacUsers, useRbacStats, useUpdateUserRole } from "@/lib/api/hooks";
import type { UserRole, UserRoleRead } from "@indra/types";

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
      <div>
        <p className="label-caps mb-1" style={{ color: ADITYA }}>
          Aryamah · RBAC
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Role Management
        </h1>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {(["admin", "user", "viewer", "total"] as const).map((key) => (
            <div key={key} className="bg-surface-1 border border-hairline rounded-lg p-4">
              <p className="label-caps text-ink-ghost mb-1">{key}</p>
              <p className="text-2xl font-bold text-ink-primary">{stats[key]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users table */}
      <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline">
          <Users size={15} className="text-ink-ghost" />
          <span className="label-caps text-ink-secondary">Users</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-ink-ghost label-caps">Loading…</div>
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
                  <td className="px-4 py-2.5 text-ink-ghost text-xs">
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
