"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils/cn";
import { DOMAINS, activeDomainFor, type Domain } from "@/lib/devata";
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react";

export function SigilBar() {
  const pathname = usePathname();
  const { sigilBarExpanded, toggleSigilBar } = useUIStore();

  const activeDomain = activeDomainFor(pathname);
  const [openDomain, setOpenDomain] = useState<string>(activeDomain.id);

  // Keep the open accordion section in sync with navigation.
  useEffect(() => {
    setOpenDomain(activeDomain.id);
  }, [activeDomain.id]);

  return (
    <nav
      className="relative flex shrink-0 flex-col border-r border-hairline bg-surface-1 transition-all duration-base"
      style={{
        width: sigilBarExpanded
          ? "var(--sigil-bar-width-expanded)"
          : "var(--sigil-bar-width-collapsed)",
      }}
    >
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2 pt-3">
        {DOMAINS.map((domain) =>
          sigilBarExpanded ? (
            <DomainSection
              key={domain.id}
              domain={domain}
              pathname={pathname}
              isOpen={openDomain === domain.id}
              isActive={activeDomain.id === domain.id}
              onToggle={() =>
                setOpenDomain((cur) => (cur === domain.id ? "" : domain.id))
              }
            />
          ) : (
            <CollapsedSigil
              key={domain.id}
              domain={domain}
              isActive={activeDomain.id === domain.id}
            />
          )
        )}
      </div>

      {/* Expand / collapse toggle */}
      <button
        onClick={toggleSigilBar}
        className="flex items-center justify-center border-t border-hairline p-3 text-ink-ghost transition-colors hover:text-ink-secondary"
        title={sigilBarExpanded ? "Collapse" : "Expand"}
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

// ── Collapsed: icon-only sigil rail ───────────────────────────────────────────
function CollapsedSigil({ domain, isActive }: { domain: Domain; isActive: boolean }) {
  const Icon = domain.icon;
  return (
    <Link
      href={domain.href}
      title={`${domain.label} — ${domain.tagline}`}
      className={cn(
        "group relative flex items-center justify-center rounded px-2 py-2 transition-colors",
        isActive
          ? "bg-surface-2 text-ink-primary"
          : "text-ink-tertiary hover:bg-surface-2 hover:text-ink-secondary"
      )}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
          style={{ background: domain.color }}
        />
      )}
      <span
        className="flex h-8 w-8 items-center justify-center rounded"
        style={{ color: isActive ? domain.color : undefined }}
      >
        <Icon className="h-4 w-4" />
      </span>
    </Link>
  );
}

// ── Expanded: domain header + deva accordion ──────────────────────────────────
function DomainSection({
  domain,
  pathname,
  isOpen,
  isActive,
  onToggle,
}: {
  domain: Domain;
  pathname: string;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
}) {
  const Icon = domain.icon;

  return (
    <div className="mb-0.5">
      {/* Domain header — toggles the accordion */}
      <button
        onClick={onToggle}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-colors",
          isActive ? "text-ink-primary" : "text-ink-tertiary hover:text-ink-secondary",
          "hover:bg-surface-2"
        )}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
          style={{ color: isActive ? domain.color : undefined }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold tracking-wider">{domain.label}</span>
            <span className="font-mono text-[10px] text-ink-ghost">{domain.sanskrit}</span>
          </span>
          <span className="truncate text-[10px] text-ink-ghost">{domain.tagline}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "h-3 w-3 shrink-0 text-ink-ghost transition-transform duration-base",
            !isOpen && "-rotate-90"
          )}
        />
      </button>

      {/* Deva list */}
      {isOpen && (
        <div className="ml-3.5 mt-0.5 flex flex-col gap-px border-l border-hairline pl-2">
          {domain.devas.map((deva) => {
            const devaActive =
              pathname === deva.href || pathname.startsWith(`${deva.href}/`);
            return (
              <Link
                key={deva.slug}
                href={deva.href}
                className={cn(
                  "group relative flex items-center gap-2 rounded px-2 py-1.5 transition-colors",
                  devaActive
                    ? "bg-surface-2 text-ink-primary"
                    : "text-ink-tertiary hover:bg-surface-2/60 hover:text-ink-secondary"
                )}
              >
                {devaActive && (
                  <span
                    className="absolute -left-2 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ background: domain.color }}
                  />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className="text-[11px] font-medium"
                      style={devaActive ? { color: domain.color } : undefined}
                    >
                      {deva.name}
                    </span>
                    <span className="font-mono text-[9px] text-ink-ghost">{deva.sanskrit}</span>
                  </span>
                  <span className="truncate text-[9px] text-ink-ghost">{deva.role}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
