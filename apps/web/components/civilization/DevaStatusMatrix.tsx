"use client";

import { DOMAIN_COLORS } from "@indra/design-tokens";

// 33 Devas with domain grouping
const DEVAS = [
  // INDRA (1)
  { id: "indra", name: "इन्द्रः", label: "INDRA", domain: "indra" },
  // VASU (8)
  { id: "prthivi", name: "Pṛthivī", label: "Earth", domain: "vasu" },
  { id: "apah", name: "Āpaḥ", label: "Water", domain: "vasu" },
  { id: "agnih", name: "Agniḥ", label: "Fire", domain: "vasu" },
  { id: "vayuh", name: "Vāyuḥ", label: "Wind", domain: "vasu" },
  { id: "akasah", name: "Ākāśaḥ", label: "Space", domain: "vasu" },
  { id: "somah", name: "Somaḥ", label: "Config", domain: "vasu" },
  { id: "suryah", name: "Sūryaḥ", label: "Trace", domain: "vasu" },
  { id: "naksatrani", name: "Nakṣatrāṇi", label: "Events", domain: "vasu" },
  // RUDRA (11)
  { id: "pranah", name: "Prāṇaḥ", label: "Spawn", domain: "rudra" },
  { id: "apanah", name: "Apānaḥ", label: "Term.", domain: "rudra" },
  { id: "vyanah", name: "Vyānaḥ", label: "Route", domain: "rudra" },
  { id: "udanah", name: "Udānaḥ", label: "Output", domain: "rudra" },
  { id: "samanah", name: "Samānaḥ", label: "Sync", domain: "rudra" },
  { id: "nagah", name: "Nāgaḥ", label: "Stream", domain: "rudra" },
  { id: "kurmah", name: "Kūrmaḥ", label: "Retry", domain: "rudra" },
  { id: "krkalah", name: "Kṛkalaḥ", label: "Timeout", domain: "rudra" },
  { id: "devadattah", name: "Devadattaḥ", label: "Signal", domain: "rudra" },
  { id: "dhananjayah", name: "Dhanañjayaḥ", label: "Persist", domain: "rudra" },
  { id: "jivatma", name: "Jīvātmā", label: "Health", domain: "rudra" },
  // ADITYA (12)
  { id: "dhata", name: "Dhātā", label: "Auth", domain: "aditya" },
  { id: "aryama", name: "Aryamā", label: "Audit", domain: "aditya" },
  { id: "mitrah", name: "Mitraḥ", label: "Trust", domain: "aditya" },
  { id: "varunah", name: "Varuṇaḥ", label: "Policy", domain: "aditya" },
  { id: "vivasvan", name: "Vivasvān", label: "Tokens", domain: "aditya" },
  { id: "tvasta", name: "Tvaṣṭā", label: "Schema", domain: "aditya" },
  { id: "vishnuh", name: "Viṣṇuḥ", label: "Perms.", domain: "aditya" },
  { id: "amsuman", name: "Aṃśumān", label: "Quota", domain: "aditya" },
  { id: "bhagah", name: "Bhagaḥ", label: "Cost", domain: "aditya" },
  { id: "pusa", name: "Pūṣā", label: "Supply", domain: "aditya" },
  { id: "savita", name: "Savitā", label: "Gate", domain: "aditya" },
  { id: "sakra", name: "Śakraḥ", label: "RBAC", domain: "aditya" },
  // PRAJAPATI (1)
  { id: "prajapati", name: "Prajāpati", label: "Strategy", domain: "prajapati" },
] as const;

const DOMAIN_LABELS: Record<string, string> = {
  indra: "INDRA — Command",
  vasu: "VASU — Infrastructure",
  rudra: "RUDRA — Agent Runtime",
  aditya: "ADITYA — Governance",
  prajapati: "PRAJAPATI — Strategy",
};

interface DevaStatusMatrixProps {
  onClose: () => void;
  pluginStatuses?: Record<string, string>;
}

function DevaCell({
  deva,
}: {
  deva: (typeof DEVAS)[number];
}) {
  const domainColor =
    DOMAIN_COLORS[deva.domain as keyof typeof DOMAIN_COLORS] ?? "#4dc8c8";

  return (
    <div
      className="flex flex-col items-center gap-1 p-2 rounded bg-surface-2 border border-hairline"
      title={`${deva.name} — ${deva.label}`}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: domainColor, opacity: 0.8 }}
      />
      <span className="text-xs text-ink-tertiary text-center leading-tight">
        {deva.label}
      </span>
    </div>
  );
}

export function DevaStatusMatrix({ onClose, pluginStatuses }: DevaStatusMatrixProps) {
  const domains = ["indra", "vasu", "rudra", "aditya", "prajapati"] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-surface-1 border border-hairline rounded-lg p-6 w-full max-w-2xl mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-caps mb-1">33 Deva Architecture</p>
            <h2 className="text-lg font-bold text-ink-primary">Deva Status Matrix</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-tertiary hover:text-ink-primary transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Plugin health row */}
        {pluginStatuses && Object.keys(pluginStatuses).length > 0 && (
          <div className="mb-4 p-3 rounded bg-surface-2 border border-hairline">
            <p className="label-caps mb-2">Plugin Connections</p>
            <div className="flex items-center gap-4 flex-wrap">
              {Object.entries(pluginStatuses).map(([type, status]) => {
                const color =
                  status === "healthy"
                    ? "#2ab870"
                    : status === "degraded"
                    ? "#e0a030"
                    : status === "unreachable"
                    ? "#e04040"
                    : "#637585";
                return (
                  <span key={type} className="flex items-center gap-1.5 text-xs font-mono text-ink-secondary">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    {type}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Domain groups */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {domains.map((domain) => {
            const devasInDomain = DEVAS.filter((d) => d.domain === domain);
            const color =
              DOMAIN_COLORS[domain as keyof typeof DOMAIN_COLORS] ?? "#4dc8c8";
            return (
              <div key={domain}>
                <p
                  className="text-xs font-mono mb-2"
                  style={{ color }}
                >
                  {DOMAIN_LABELS[domain]}
                </p>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-11">
                  {devasInDomain.map((d) => (
                    <DevaCell key={d.id} deva={d} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-ink-ghost text-center">
          Full Deva observability wires in Phase 2
        </p>
      </div>
    </div>
  );
}
