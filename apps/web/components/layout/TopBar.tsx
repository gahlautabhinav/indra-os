"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { CivilizationPulse } from "@/components/civilization/CivilizationPulse";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";

function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function logout() {
    localStorage.removeItem("indra_token");
    router.replace("/login");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-surface-3 transition-colors hover:border-hairline-bright"
        title="Account"
      >
        <span className="font-mono text-xs text-ink-secondary">A</span>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-lg border border-hairline bg-surface-2 shadow-[var(--shadow-floating)]">
          <div className="border-b border-hairline px-3 py-2">
            <p className="text-xs font-medium text-ink-secondary">Signed in</p>
            <p className="font-mono text-[10px] text-ink-ghost">admin</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink-secondary transition-colors hover:bg-surface-3 hover:text-critical"
          >
            <LogOut className="h-3.5 w-3.5" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

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
        <NotificationPanel />
        <AccountMenu />
      </div>
    </header>
  );
}
