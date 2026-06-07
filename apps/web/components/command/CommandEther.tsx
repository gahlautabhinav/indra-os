"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { Search, CommandIcon } from "lucide-react";

const QUICK_LINKS = [
  { label: "Workforce Dashboard", href: "/indra", domain: "indra", hint: "⌘ 1" },
  { label: "Agent Observatory", href: "/indra/pulse", domain: "indra", hint: "" },
  { label: "Session Center", href: "/vasu/apah", domain: "vasu", hint: "" },
  { label: "Trace Center", href: "/vasu/suryah", domain: "vasu", hint: "" },
  { label: "MCP Servers", href: "/vasu/vayuh", domain: "vasu", hint: "" },
  { label: "Agent Spawner", href: "/rudra/pranah", domain: "rudra", hint: "" },
  { label: "Workflow Builder", href: "/aditya/tvasta", domain: "aditya", hint: "" },
  { label: "Skill Registry", href: "/aditya/pusa", domain: "aditya", hint: "" },
  { label: "Hook Manager", href: "/aditya/dhata", domain: "aditya", hint: "" },
  { label: "Memory Explorer", href: "/vasu/somah", domain: "vasu", hint: "" },
  { label: "Strategic Intelligence", href: "/prajapati/intelligence", domain: "prajapati", hint: "" },
];

const DOMAIN_COLORS: Record<string, string> = {
  indra: "var(--domain-indra)",
  vasu: "var(--domain-vasu)",
  rudra: "var(--domain-rudra)",
  aditya: "var(--domain-aditya)",
  prajapati: "var(--domain-prajapati)",
};

export function CommandEther() {
  const { commandEtherOpen, closeCommandEther } = useUIStore();
  const router = useRouter();

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

  if (!commandEtherOpen) return null;

  return (
    <div
      className="command-ether-overlay fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={closeCommandEther}
    >
      <div
        className="w-full max-w-xl rounded-lg bg-surface-2 shadow-command-ether animate-command-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-tertiary" />
          <input
            autoFocus
            placeholder="Search agents, traces, sessions, modules…"
            className="flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-ghost outline-none"
          />
          <kbd className="shrink-0 rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-ink-ghost">
            ESC
          </kbd>
        </div>

        {/* Quick links */}
        <div className="py-2">
          <p className="label-caps px-4 pb-1 pt-1">Navigation</p>
          {QUICK_LINKS.map((item) => (
            <button
              key={item.href}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink-primary"
              onClick={() => {
                router.push(item.href);
                closeCommandEther();
              }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: DOMAIN_COLORS[item.domain] }}
              />
              <span className="flex-1">{item.label}</span>
              {item.hint && (
                <kbd className="font-mono text-[10px] text-ink-ghost">{item.hint}</kbd>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-hairline px-4 py-2">
          <div className="flex items-center gap-2 text-[10px] text-ink-ghost">
            <CommandIcon className="h-3 w-3" />
            <span className="font-mono">Command Ether</span>
          </div>
          <span className="text-[10px] text-ink-ghost">↑↓ navigate · ↵ select · ESC close</span>
        </div>
      </div>
    </div>
  );
}
