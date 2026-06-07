"use client";

import { AlertTriangle, XCircle, Info, TrendingDown } from "lucide-react";
import { useOptimizationRecommendations } from "@/lib/api/hooks";
import type { Recommendation } from "@indra/types";

const PRAJAPATI = "#9a44d4";

const SEVERITY_CONFIG = {
  critical: { color: "#c44450", Icon: XCircle, label: "Critical" },
  warning: { color: "#e0a030", Icon: AlertTriangle, label: "Warning" },
  info: { color: "#3a80d4", Icon: Info, label: "Info" },
};

const CATEGORY_COLORS: Record<string, string> = {
  cost: "#2ab870",
  performance: "#3a80d4",
  reliability: "#e0a030",
  governance: "#9a44d4",
};

const DOMAIN_COLORS: Record<string, string> = {
  indra: "#9a44d4",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const sev = SEVERITY_CONFIG[rec.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info;
  const { Icon } = sev;

  return (
    <div
      className="bg-surface-1 border rounded-lg p-4 space-y-3"
      style={{ borderColor: `${sev.color}44`, borderLeftWidth: "3px", borderLeftColor: sev.color }}
    >
      <div className="flex items-start gap-3">
        <Icon size={15} style={{ color: sev.color }} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ background: `${sev.color}22`, color: sev.color }}
            >
              {sev.label}
            </span>
            <span
              className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ background: `${CATEGORY_COLORS[rec.category] ?? "#637585"}22`, color: CATEGORY_COLORS[rec.category] ?? "#637585" }}
            >
              {rec.category}
            </span>
            {rec.affected_domain && (
              <span
                className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ background: `${DOMAIN_COLORS[rec.affected_domain] ?? "#637585"}22`, color: DOMAIN_COLORS[rec.affected_domain] ?? "#637585" }}
              >
                {rec.affected_domain.toUpperCase()}
              </span>
            )}
          </div>
          <p className="font-semibold text-ink-primary">{rec.title}</p>
          <p className="text-xs text-ink-ghost mt-0.5">{rec.description}</p>
        </div>
      </div>

      {rec.action && (
        <div className="flex items-start gap-2 bg-surface-2 rounded p-2.5">
          <span className="label-caps text-ink-ghost shrink-0">Action</span>
          <p className="text-xs text-ink-secondary">{rec.action}</p>
        </div>
      )}

      {rec.estimated_savings && (
        <div className="flex items-center gap-1.5">
          <TrendingDown size={12} className="text-green-400" />
          <span className="text-xs text-green-400 font-medium">{rec.estimated_savings}</span>
        </div>
      )}
    </div>
  );
}

export default function OptimizationPage() {
  const { data: report, isLoading, refetch } = useOptimizationRecommendations();

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps mb-1" style={{ color: PRAJAPATI }}>
            Optimization · System Intelligence
          </p>
          <h1
            className="font-bold tracking-tight text-ink-primary"
            style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
          >
            Recommendations
          </h1>
        </div>
        <button className="btn-ghost text-xs" onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-ink-ghost label-caps">Analyzing…</div>
      ) : report ? (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: report.total_recommendations, color: "#637585" },
              { label: "Critical", value: report.critical, color: SEVERITY_CONFIG.critical.color },
              { label: "Warnings", value: report.warnings, color: SEVERITY_CONFIG.warning.color },
              { label: "Info", value: report.info, color: SEVERITY_CONFIG.info.color },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-surface-1 border border-hairline rounded-lg p-4 text-center"
              >
                <p
                  className="text-3xl font-bold"
                  style={{ color: value > 0 ? color : "#637585" }}
                >
                  {value}
                </p>
                <p className="label-caps text-ink-ghost mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Recommendations list — criticals first */}
          <div className="space-y-3">
            {[...report.recommendations]
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 };
                return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3);
              })
              .map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            {report.recommendations.length === 0 && (
              <div className="p-12 text-center text-ink-ghost">
                <p className="label-caps">System healthy — no recommendations</p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
