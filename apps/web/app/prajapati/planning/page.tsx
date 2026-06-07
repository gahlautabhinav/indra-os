"use client";

import { useState } from "react";
import { Map, ArrowRight, CheckCircle } from "lucide-react";
import { usePlanTemplates, useGeneratePlan, useCreateGoal } from "@/lib/api/hooks";
import type { GeneratePlanResponse, PlanTemplate } from "@indra/types";

const PRAJAPATI = "#9a44d4";

const CATEGORY_COLORS: Record<string, string> = {
  research: "#3a80d4",
  build: "#2ab870",
  ops: "#e0a030",
  monitor: "#9a44d4",
};

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: PlanTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className="text-left w-full bg-surface-1 border rounded-lg p-4 space-y-2 transition-all"
      style={selected ? { borderColor: PRAJAPATI, background: `${PRAJAPATI}11` } : { borderColor: "var(--hairline)" }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium mb-1"
            style={{
              background: `${CATEGORY_COLORS[template.category] ?? "#637585"}22`,
              color: CATEGORY_COLORS[template.category] ?? "#637585",
            }}
          >
            {template.category}
          </span>
          <p className="font-semibold text-ink-primary">{template.name}</p>
          <p className="text-xs text-ink-ghost mt-0.5">{template.description}</p>
        </div>
        {selected && <CheckCircle size={16} style={{ color: PRAJAPATI }} className="shrink-0 mt-0.5" />}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {template.steps.slice(0, 4).map((s, i) => (
          <div key={s.id ?? i} className="flex items-center gap-1">
            {i > 0 && <ArrowRight size={8} className="text-ink-ghost" />}
            <span className="text-xs text-ink-ghost">{s.type}</span>
          </div>
        ))}
        {template.steps.length > 4 && (
          <span className="text-xs text-ink-ghost">+{template.steps.length - 4}</span>
        )}
      </div>
    </button>
  );
}

function ResultPanel({ result }: { result: GeneratePlanResponse }) {
  const createGoal = useCreateGoal();
  const [saved, setSaved] = useState(false);

  function saveAsGoal() {
    createGoal.mutate(
      {
        title: result.goal_title,
        target_outcome: `Generated from template: ${result.template_id}`,
        priority: 1,
      },
      {
        onSuccess: () => setSaved(true),
      }
    );
  }

  return (
    <div className="bg-surface-1 border border-hairline rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-ink-primary">{result.goal_title}</p>
          <p className="text-xs text-ink-ghost">{result.estimated_tasks} tasks · {result.recommended_agents} agent steps</p>
        </div>
        <button
          className="btn-primary text-xs"
          onClick={saveAsGoal}
          disabled={saved || createGoal.isPending}
        >
          {saved ? "Saved ✓" : "Save as Goal"}
        </button>
      </div>

      <div className="space-y-2">
        {(result.definition.steps ?? []).map((s, i) => (
          <div key={s.id ?? i} className="flex items-start gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono shrink-0 mt-0.5"
              style={{ background: `${PRAJAPATI}22`, color: PRAJAPATI }}
            >
              {i + 1}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-ghost">{s.type}</span>
                <span className="text-sm text-ink-primary">{s.title}</span>
              </div>
              {(s.config as { description?: string }).description && (
                <p className="text-xs text-ink-ghost mt-0.5">
                  {(s.config as { description: string }).description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlanningPage() {
  const { data: templates, isLoading } = usePlanTemplates();
  const generatePlan = useGeneratePlan();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [variables, setVariables] = useState("");
  const [result, setResult] = useState<GeneratePlanResponse | null>(null);

  function handleGenerate() {
    if (!selectedId || !goalTitle) return;
    let vars: Record<string, string> = {};
    try {
      if (variables.trim()) vars = JSON.parse(variables);
    } catch {
      // ignore
    }
    generatePlan.mutate(
      { template_id: selectedId, goal_title: goalTitle, variables: vars },
      { onSuccess: (data) => setResult(data) }
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="label-caps mb-1" style={{ color: PRAJAPATI }}>
          Planning · Strategy Templates
        </p>
        <h1
          className="font-bold tracking-tight text-ink-primary"
          style={{ fontSize: "28px", letterSpacing: "-0.8px" }}
        >
          Plan Generator
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template picker */}
        <div className="space-y-3">
          <p className="label-caps text-ink-secondary">Select Template</p>
          {isLoading ? (
            <div className="text-ink-ghost label-caps">Loading…</div>
          ) : (
            <div className="space-y-2">
              {(templates ?? []).map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedId === t.id}
                  onSelect={() => {
                    setSelectedId(t.id);
                    setResult(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Config + result */}
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="label-caps text-ink-secondary">Configure</p>
            <input
              className="input-field w-full"
              placeholder="Goal title"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
            />
            <div>
              <label className="label-caps text-ink-ghost mb-1 block">Variables (JSON, optional)</label>
              <textarea
                className="input-field w-full font-mono text-xs h-16"
                placeholder='{"topic": "AI agents", "deadline": "Q3"}'
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
              />
            </div>
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleGenerate}
              disabled={!selectedId || !goalTitle || generatePlan.isPending}
            >
              <Map size={14} />
              {generatePlan.isPending ? "Generating…" : "Generate Plan"}
            </button>
          </div>

          {result && <ResultPanel result={result} />}
        </div>
      </div>
    </div>
  );
}
