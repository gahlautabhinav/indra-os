"use client";

import { useState } from "react";
import { Brain, BookOpen, FolderGit2 } from "lucide-react";
import { MemoryBrowser } from "@/components/memory/MemoryBrowser";
import { ProjectHub } from "@/components/vaults/ProjectHub";
import { VaultCatalog } from "@/components/vaults/VaultCatalog";

const ADITYA = "#3a80d4";

type Tab = "projects" | "vaults" | "memory";

const TABS: { id: Tab; label: string; icon: typeof Brain }[] = [
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "vaults", label: "Vaults", icon: BookOpen },
  { id: "memory", label: "Memory · RAG", icon: Brain },
];

export default function SmritiPage() {
  const [tab, setTab] = useState<Tab>("projects");

  return (
    <div className="space-y-5 p-6">
      {/* Page header */}
      <div>
        <p className="label-caps mb-1" style={{ color: ADITYA }}>
          Smriti · Second Brain
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Knowledge Store
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          स्मृति — that which is remembered. Your Obsidian vaults, tied to the projects and
          agent sessions that produced them.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-hairline">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors"
            style={
              tab === id
                ? { borderColor: ADITYA, color: "var(--indra-ink-primary)" }
                : { borderColor: "transparent", color: "var(--indra-ink-ghost)" }
            }
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "projects" && <ProjectHub />}
      {tab === "vaults" && <VaultCatalog />}
      {tab === "memory" && <MemoryBrowser />}
    </div>
  );
}
