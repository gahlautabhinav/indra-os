"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Teaching empty state — sigil + what-it-is + how-to-fill, optional action. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  accent = "var(--indra-ink-tertiary)",
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  accent?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-surface-2">
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <p className="text-sm text-ink-secondary">{title}</p>
      {body && <p className="max-w-sm text-xs leading-relaxed text-ink-ghost">{body}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
