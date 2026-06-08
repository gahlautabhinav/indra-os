"use client";

import { Database, CheckCircle2 } from "lucide-react";
import { useFoundations } from "@/lib/api/hooks";
import { DevaPageHeader, StatTile, ADITYA } from "@/components/common/DevaScaffold";

export default function DhataPage() {
  const { data, isLoading } = useFoundations();
  const entities = data?.entities ?? [];
  const maxRows = Math.max(1, ...entities.map((e) => e.rows));

  return (
    <div className="space-y-6 p-6">
      <DevaPageHeader
        accent={ADITYA}
        deva="Dhātā"
        role="Foundations"
        title="The Establisher"
        sanskrit="धाता"
        description="the structural ground of the system — persisted entities, schema, and infrastructure."
      />

      <div className="flex flex-wrap gap-3">
        <StatTile accent={ADITYA} label="Total Rows" value={(data?.total_rows ?? 0).toLocaleString()} />
        <StatTile accent="#9a44d4" label="Devas" value={data?.devas ?? 33} />
        <StatTile accent="#4dc8c8" label="Domains" value={data?.domains ?? 5} />
        <StatTile accent="#2ab870" label="Schema" value={data?.schema_version ?? "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-hairline bg-surface-1 p-4">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-ghost">Persisted entities</p>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-ink-ghost">Surveying foundations…</div>
          ) : (
            <ul className="space-y-2.5">
              {entities.map((e) => (
                <li key={e.entity} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 font-mono text-[12px] text-ink-tertiary">{e.entity}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full" style={{ width: `${(e.rows / maxRows) * 100}%`, background: ADITYA }} />
                  </div>
                  <span className="w-14 text-right font-mono tabular-nums text-[12px] text-ink-secondary">{e.rows}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-hairline bg-surface-1 p-4">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-ghost">Infrastructure</p>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-ink-tertiary" />
              <span className="text-sm text-ink-secondary">Database</span>
              <span className="ml-auto flex items-center gap-1 text-[12px]" style={{ color: data?.infrastructure.database === "ok" ? "#2ab870" : "#e04040" }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> {data?.infrastructure.database ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-secondary">Migration head</span>
              <span className="ml-auto font-mono text-[12px] text-ink-tertiary">{data?.schema_version ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
