"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils/cn";
import {
  CommandIcon,
  LayersIcon,
  ZapIcon,
  ShieldIcon,
  BrainIcon,
  ChevronRightIcon,
} from "lucide-react";

const DOMAINS = [
  {
    id: "indra",
    label: "INDRA",
    subLabel: "इन्द्रः",
    icon: CommandIcon,
    href: "/indra",
    color: "var(--domain-indra)",
  },
  {
    id: "vasu",
    label: "VASU",
    subLabel: "वसु",
    icon: LayersIcon,
    href: "/vasu/prthivi",
    color: "var(--domain-vasu)",
  },
  {
    id: "rudra",
    label: "RUDRA",
    subLabel: "रुद्र",
    icon: ZapIcon,
    href: "/rudra/pranah",
    color: "var(--domain-rudra)",
  },
  {
    id: "aditya",
    label: "ADITYA",
    subLabel: "आदित्य",
    icon: ShieldIcon,
    href: "/aditya/dhata",
    color: "var(--domain-aditya)",
  },
  {
    id: "prajapati",
    label: "PRAJAPATI",
    subLabel: "प्रजापति",
    icon: BrainIcon,
    href: "/prajapati/goals",
    color: "var(--domain-prajapati)",
  },
] as const;

export function SigilBar() {
  const pathname = usePathname();
  const { sigilBarExpanded, toggleSigilBar } = useUIStore();

  const activeDomain = DOMAINS.find((d) => pathname.startsWith(`/${d.id}`))?.id ?? "indra";

  return (
    <nav
      className="relative flex shrink-0 flex-col border-r border-hairline bg-surface-1 transition-all duration-base"
      style={{
        width: sigilBarExpanded
          ? "var(--sigil-bar-width-expanded)"
          : "var(--sigil-bar-width-collapsed)",
      }}
    >
      {/* Domain links */}
      <div className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
        {DOMAINS.map((domain) => {
          const Icon = domain.icon;
          const isActive = activeDomain === domain.id;

          return (
            <Link
              key={domain.id}
              href={domain.href}
              className={cn(
                "group relative flex items-center gap-3 rounded px-2 py-2 transition-colors",
                isActive
                  ? "bg-surface-2 text-ink-primary"
                  : "text-ink-tertiary hover:bg-surface-2 hover:text-ink-secondary"
              )}
            >
              {/* Active domain left stripe */}
              {isActive && (
                <span
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                  style={{ background: domain.color }}
                />
              )}

              {/* Sigil icon */}
              <span
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded"
                style={{ color: isActive ? domain.color : undefined }}
              >
                <Icon className="h-4 w-4" />
              </span>

              {/* Labels — only visible when expanded */}
              {sigilBarExpanded && (
                <span className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold tracking-wider">
                    {domain.label}
                  </span>
                  <span className="text-[10px] text-ink-ghost font-mono">
                    {domain.subLabel}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Expand / collapse toggle */}
      <button
        onClick={toggleSigilBar}
        className="flex items-center justify-center border-t border-hairline p-3 text-ink-ghost transition-colors hover:text-ink-secondary"
      >
        <ChevronRightIcon
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-base",
            sigilBarExpanded && "rotate-180"
          )}
        />
      </button>
    </nav>
  );
}
