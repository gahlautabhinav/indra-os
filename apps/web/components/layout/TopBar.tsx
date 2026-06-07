"use client";

import { Bell, Search } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { CivilizationPulse } from "@/components/civilization/CivilizationPulse";

export function TopBar() {
  const openCommandEther = useUIStore((s) => s.openCommandEther);

  return (
    <header
      className="flex h-topbar shrink-0 items-center justify-between border-b border-hairline bg-surface-1 px-4"
      style={{ height: "var(--topbar-height)" }}
    >
      {/* Wordmark */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-[0.15em] text-accent uppercase">
          INDRA
        </span>
        <span className="text-xs text-ink-ghost font-mono">इन्द्रः</span>
      </div>

      {/* Search pill → triggers Command Ether */}
      <button
        onClick={openCommandEther}
        className="flex items-center gap-2 rounded border border-hairline bg-surface-2 px-3 py-1.5 text-xs text-ink-tertiary transition-colors hover:border-hairline-bright hover:text-ink-secondary"
      >
        <Search className="h-3 w-3" />
        <span>Search agents, traces, sessions…</span>
        <kbd className="ml-2 rounded border border-hairline px-1 font-mono text-[10px] text-ink-ghost">
          ⌘K
        </kbd>
      </button>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <CivilizationPulse />
        <button className="relative rounded p-1.5 text-ink-tertiary transition-colors hover:bg-surface-2 hover:text-ink-secondary">
          <Bell className="h-4 w-4" />
        </button>
        <div className="h-7 w-7 rounded-full bg-surface-3 border border-hairline flex items-center justify-center">
          <span className="text-xs font-mono text-ink-secondary">A</span>
        </div>
      </div>
    </header>
  );
}
