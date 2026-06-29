"use client";

import { AlertTriangle, RefreshCw, ShieldCheck, TrendingDown, XCircle, Info } from "lucide-react";
import { useOptimizationRecommendations } from "@/lib/api/hooks";
import type { Recommendation } from "@indra/types";
import { DevaPageHeader } from "@/components/common/DevaScaffold";
import { MetricTile } from "@/components/metrics/MetricTile";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCards } from "@/components/common/Skeleton";

const PRAJAPATI = "#9a44d4";

const SEVERITY = {
  critical: { color: "var(--state-critical)", Icon: XCircle, label: "Critical" },
  warning: { color: "var(--state-degraded)", Icon: AlertTriangle, label: "Warning" },
  info: { color: "var(--indra-accent)", Icon: Info, label: "Info" },
} as const;

const DOMAIN_COLORS: Record<string, string> = {
  indra: "#4dc8c8",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const sev = SEVERITY[rec.severity as keyof typeof SEVERITY] ?? SEVERITY.info;
  const { Icon } = sev;

  return (
    <div className="space-y-3 rounded-lg border border-hairline bg-surface-1 p-4 transition-colors hover:bg-surface-2">
      <div className="flex items-start gap-3">
        <Icon size={15} style={{ color: sev.color }} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: `color-mix(in oklab, ${sev.color} 16%, transparent)`, color: sev.color }}
            >
              {sev.label}
            </span>
            <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-ink-tertiary">
              {rec.category}
            </span>
            {rec.affected_domain && (
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase"
                style={{
                  background: `color-mix(in oklab, ${DOMAIN_COLORS[rec.affected_domain] ?? "#637585"} 16%, transparent)`,
                  color: DOMAIN_COLORS[rec.affected_domain] ?? "#637585",
                }}
              >
                {rec.affected_domain}
              </span>
            )}
          </div>
          <p className="font-semibold text-ink-primary">{rec.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-tertiary">{rec.description}</p>
        </div>
      </div>

      {rec.action && (
        <div className="flex items-start gap-2 rounded-md bg-surface-2 p-2.5">
          <span className="label-caps shrink-0 text-ink-ghost">Action</span>
          <p className="text-xs text-ink-secondary">{rec.action}</p>
        </div>
      )}

      {rec.estimated_savings && (
        <div className="flex items-center gap-1.5">
          <TrendingDown size={12} style={{ color: "var(--state-healthy)" }} />
          <span className="font-mono text-xs font-medium" style={{ color: "var(--state-healthy)" }}>
            {rec.estimated_savings}
          </span>
        </div>
      )}
    </div>
  );
}

export default function OptimizationPage() {
  const { data: report, isLoading, refetch, isFetching } = useOptimizationRecommendations();

  return (
    <div className="space-y-5 p-6">
      <DevaPageHeader
        accent={PRAJAPATI}
        deva="Optimization"
        role="Tuning"
        title="Recommendations"
        sanskrit="अनुकूलन"
        description="system intelligence — what to fix next, ranked by impact."
        actions={
          <button className="btn-ghost text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      {isLoading ? (
        <SkeletonCards count={4} height={120} />
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricTile label="Total" value={report.total_recommendations} domain="prajapati" />
            <MetricTile
              label="Critical"
              value={report.critical}
              domain="prajapati"
              valueColor={report.critical > 0 ? "var(--state-critical)" : undefined}
            />
            <MetricTile
              label="Warnings"
              value={report.warnings}
              domain="prajapati"
              valueColor={report.warnings > 0 ? "var(--state-degraded)" : undefined}
            />
            <MetricTile
              label="Info"
              value={report.info}
              domain="prajapati"
              valueColor={report.info > 0 ? "var(--indra-accent)" : undefined}
            />
          </div>

          {report.recommendations.length === 0 ? (
            <div className="rounded-xl border border-hairline bg-surface-1">
              <EmptyState
                icon={ShieldCheck}
                title="System healthy"
                body="No optimization recommendations right now. New signals from cost, errors, and policy gaps appear here as they arise."
                accent="var(--state-healthy)"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {[...report.recommendations]
                .sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2 } as const;
                  return (
                    (order[a.severity as keyof typeof order] ?? 3) -
                    (order[b.severity as keyof typeof order] ?? 3)
                  );
                })
                .map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
