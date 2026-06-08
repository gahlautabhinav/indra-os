"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { Search, CommandIcon, CornerDownLeft } from "lucide-react";
import { DOMAINS } from "@/lib/devata";

interface CommandItem {
  label: string;
  sanskrit: string;
  role: string;
  domain: string;
  domainId: string;
  href: string;
  color: string;
}

// Every navigable destination = one entry per deva, sourced from the registry
// so routes + names can never drift from the sidebar again.
const ITEMS: CommandItem[] = DOMAINS.flatMap((d) =>
  d.devas.map((dv) => ({
    label: dv.name,
    sanskrit: dv.sanskrit,
    role: dv.role,
    domain: d.label,
    domainId: d.id,
    href: dv.href,
    color: d.color,
  }))
);

export function CommandEther() {
  const { commandEtherOpen, closeCommandEther } = useUIStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Global ⌘K / Esc.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useUIStore.getState().toggleCommandEther();
      }
      if (e.key === "Escape") closeCommandEther();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeCommandEther]);

  // Reset on open.
  useEffect(() => {
    if (commandEtherOpen) {
      setQuery("");
      setActive(0);
    }
  }, [commandEtherOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.role.toLowerCase().includes(q) ||
        it.domain.toLowerCase().includes(q) ||
        it.href.toLowerCase().includes(q) ||
        it.sanskrit.includes(query.trim())
    );
  }, [query]);

  // Keep active index in range + scrolled into view.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!commandEtherOpen) return null;

  function go(item: CommandItem | undefined) {
    if (!item) return;
    router.push(item.href);
    closeCommandEther();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  }

  return (
    <div
      className="command-ether-overlay fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
      onClick={closeCommandEther}
    >
      <div
        className="animate-command-in w-full max-w-xl overflow-hidden rounded-xl bg-surface-2 shadow-command-ether"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-tertiary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search the 33 Devas — sessions, traces, cost, policies…"
            className="flex-1 bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-ghost"
          />
          <kbd className="shrink-0 rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-ink-ghost">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-ghost">
              No deva matches “{query}”.
            </p>
          ) : (
            results.map((item, i) => {
              const isActive = i === active;
              return (
                <button
                  key={item.href}
                  data-idx={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive ? "bg-surface-3" : "hover:bg-surface-3/50"
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                      style={{ background: item.color }}
                    />
                  )}
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="text-sm text-ink-primary">{item.label}</span>
                    <span className="font-mono text-[11px] text-ink-ghost">{item.sanskrit}</span>
                    <span className="truncate text-xs text-ink-tertiary">· {item.role}</span>
                  </span>
                  <span
                    className="shrink-0 font-mono text-[9px] uppercase tracking-wider"
                    style={{ color: item.color }}
                  >
                    {item.domain}
                  </span>
                  {isActive && <CornerDownLeft className="h-3 w-3 shrink-0 text-ink-ghost" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-hairline px-4 py-2">
          <div className="flex items-center gap-2 text-[10px] text-ink-ghost">
            <CommandIcon className="h-3 w-3" />
            <span className="font-mono">Command Ether</span>
          </div>
          <span className="text-[10px] text-ink-ghost">
            {results.length} result{results.length === 1 ? "" : "s"} · ↑↓ navigate · ↵ open · ESC close
          </span>
        </div>
      </div>
    </div>
  );
}
