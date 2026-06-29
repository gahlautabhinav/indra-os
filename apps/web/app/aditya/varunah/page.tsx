"use client";

import { useState } from "react";
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { usePolicies, useCreatePolicy, useDeletePolicy, useUpdatePolicy } from "@/lib/api/hooks";
import type { Policy, PolicyType, PolicyTargetType } from "@indra/types";
import { DevaPageHeader } from "@/components/common/DevaScaffold";
import { SkeletonCards } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { KeyValueGrid } from "@/components/common/KeyValue";

const ADITYA = "#3a80d4";

const TYPE_COLORS: Record<PolicyType, string> = {
  cost_limit: "#e0a030",
  token_limit: "#3a80d4",
  tool_block: "#c44450",
  rate_limit: "#2ab870",
};

function PolicyCard({ policy }: { policy: Policy }) {
  const del = useDeletePolicy();
  const update = useUpdatePolicy();

  return (
    <div
      className="bg-surface-1 border border-hairline rounded-lg p-4 space-y-2"
      style={{ borderTop: "2px solid #3a80d4" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ background: `${TYPE_COLORS[policy.policy_type]}22`, color: TYPE_COLORS[policy.policy_type] }}
            >
              {policy.policy_type}
            </span>
            <span className="text-xs text-ink-ghost">{policy.target_type}</span>
          </div>
          <p className="font-medium text-ink-primary">{policy.name}</p>
          {policy.description && (
            <p className="text-xs text-ink-ghost mt-0.5">{policy.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => update.mutate({ policyId: policy.id, body: { enabled: !policy.enabled } })}
            className="text-ink-ghost hover:text-ink-primary transition-colors"
            title={policy.enabled ? "Disable" : "Enable"}
          >
            {policy.enabled ? <ToggleRight size={18} style={{ color: ADITYA }} /> : <ToggleLeft size={18} />}
          </button>
          <button
            onClick={() => del.mutate(policy.id)}
            className="text-ink-ghost hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="rounded-md bg-surface-2 p-2.5">
        <KeyValueGrid data={policy.config as Record<string, unknown>} />
      </div>
    </div>
  );
}

function AddPolicyModal({ onClose }: { onClose: () => void }) {
  const create = useCreatePolicy();
  const [form, setForm] = useState({
    name: "",
    policy_type: "cost_limit" as PolicyType,
    target_type: "global" as PolicyTargetType,
    target_id: "",
    enabled: true,
    config: "{}",
    description: "",
  });

  function handleSubmit() {
    try {
      const parsed = JSON.parse(form.config);
      create.mutate(
        {
          name: form.name,
          policy_type: form.policy_type,
          target_type: form.target_type,
          ...(form.target_id ? { target_id: form.target_id } : { target_id: null }),
          enabled: form.enabled,
          config: parsed,
          ...(form.description ? { description: form.description } : { description: null }),
        },
        { onSuccess: onClose }
      );
    } catch {
      alert("Config must be valid JSON");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface-1 border border-hairline rounded-xl p-6 w-full max-w-md space-y-4"
        style={{ boxShadow: "var(--shadow-floating)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-ink-primary text-lg">Add Policy</h2>

        <div className="space-y-3">
          <input
            className="input-field w-full"
            placeholder="Policy name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <select
            className="input-field w-full"
            value={form.policy_type}
            onChange={(e) => setForm((f) => ({ ...f, policy_type: e.target.value as PolicyType }))}
          >
            {(["cost_limit", "token_limit", "tool_block", "rate_limit"] as PolicyType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className="input-field w-full"
            value={form.target_type}
            onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value as PolicyTargetType }))}
          >
            {(["global", "agent", "session", "domain"] as PolicyTargetType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {form.target_type !== "global" && (
            <input
              className="input-field w-full"
              placeholder="Target ID"
              value={form.target_id}
              onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value }))}
            />
          )}
          <textarea
            className="input-field w-full font-mono text-xs h-24"
            placeholder='Config JSON, e.g. {"max_usd": 10}'
            value={form.config}
            onChange={(e) => setForm((f) => ({ ...f, config: e.target.value }))}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!form.name || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VarunahPage() {
  const { data: policies, isLoading } = usePolicies();
  const [adding, setAdding] = useState(false);

  return (
    <div className="p-6 space-y-5">
      <DevaPageHeader
        accent={ADITYA}
        deva="Varunah"
        role="Policy Engine"
        title="Governance Policies"
        sanskrit="वरुणः"
        description="guardrails — cost, token, tool, and rate limits across the civilization."
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setAdding(true)}>
            <Plus size={15} />
            Add Policy
          </button>
        }
      />

      {isLoading ? (
        <SkeletonCards count={6} height={140} />
      ) : (policies ?? []).length === 0 ? (
        <div
          className="rounded-lg border border-hairline bg-surface-1"
          style={{ borderTop: "2px solid #3a80d4" }}
        >
          <EmptyState
            icon={Shield}
            title="No policies defined"
            body="Policies enforce limits — max cost, token budgets, blocked tools, rate caps — scoped globally or to an agent, session, or domain. Add one to set a guardrail."
            accent={ADITYA}
            action={
              <button className="btn-primary flex items-center gap-2" onClick={() => setAdding(true)}>
                <Plus size={15} />
                Add Policy
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(policies ?? []).map((p) => (
            <PolicyCard key={p.id} policy={p} />
          ))}
        </div>
      )}

      {adding && <AddPolicyModal onClose={() => setAdding(false)} />}
    </div>
  );
}
