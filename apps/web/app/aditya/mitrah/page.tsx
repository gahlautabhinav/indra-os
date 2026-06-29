"use client";

import { Handshake, ArrowRight } from "lucide-react";
import { useAlliances } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, ADITYA } from "@/components/common/DevaScaffold";
import { SkeletonRows } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";

export default function MitrahPage() {
  const { data, isLoading } = useAlliances({ limit: 200 });
  const alliances = data?.alliances ?? [];

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={ADITYA}
        deva="Mitraḥ"
        role="Alliances"
        title="The Binding Friend"
        sanskrit="मित्रः"
        description="the cooperation between agents — spawn lineage and shared-session bonds."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile accent={ADITYA} label="Alliances" value={data?.total ?? 0} />
        <StatTile accent="#4dc8c8" label="Linked Agents" value={data?.linked_agents ?? 0} />
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1" style={{ borderTop: `2px solid ${ADITYA}` }}>
        {isLoading ? (
          <SkeletonRows rows={6} className="p-3" />
        ) : alliances.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="No alliances yet"
            body="When agents spawn sub-agents, the lineage bonds appear here as alliances."
            accent={ADITYA}
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {alliances.map((a, i) => (
              <li key={`${a.source_id}-${a.target_id}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <span className="rounded px-2 py-0.5 text-[10px] font-mono uppercase" style={{ background: `${ADITYA}22`, color: ADITYA }}>
                  {a.type}
                </span>
                <span className="text-sm text-ink-secondary">{a.source_name}</span>
                <ArrowRight className="h-3.5 w-3.5 text-ink-ghost" />
                <span className="text-sm text-ink-secondary">{a.target_name}</span>
                <span className="ml-auto font-mono text-[10px] text-ink-ghost">{a.domain}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
