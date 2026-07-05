"""The INDRA deva registry — mirror of apps/web/lib/devata.ts (name, domain, role).

Classical count: 8 Vasus + 11 Rudras + 12 Adityas + Indra + Prajapati = 33.
Prajapati is surfaced as its 4 functional route modules, so this list has 36 rows
grouped under 5 domains.
"""

from __future__ import annotations

from typing import NamedTuple


class Deva(NamedTuple):
    name: str
    domain: str
    role: str


DOMAINS: list[str] = ["indra", "vasu", "rudra", "aditya", "prajapati"]

DEVAS: list[Deva] = [
    Deva("Indra", "indra", "Command"),
    # VASU · infrastructure (8)
    Deva("Suryah", "vasu", "Traces"),
    Deva("Somah", "vasu", "Sessions"),
    Deva("Agnih", "vasu", "Execution"),
    Deva("Akasah", "vasu", "Context"),
    Deva("Apah", "vasu", "Events"),
    Deva("Naksatrani", "vasu", "Knowledge"),
    Deva("Prthivi", "vasu", "Storage"),
    Deva("Vayuh", "vasu", "Comms"),
    # RUDRA · runtime (11)
    Deva("Pranah", "rudra", "Tasks"),
    Deva("Vyanah", "rudra", "Messages"),
    Deva("Samanah", "rudra", "Coordination"),
    Deva("Udanah", "rudra", "Escalations"),
    Deva("Apanah", "rudra", "Cleanup"),
    Deva("Dhananjayah", "rudra", "Processes"),
    Deva("Devadattah", "rudra", "Notifications"),
    Deva("Nagah", "rudra", "Errors"),
    Deva("Kurmah", "rudra", "Checkpoints"),
    Deva("Krkalah", "rudra", "Recovery"),
    Deva("Jivatma", "rudra", "Identity"),
    # ADITYA · governance (12)
    Deva("Smriti", "aditya", "Memory"),
    Deva("Aryama", "aditya", "RBAC"),
    Deva("Varunah", "aditya", "Policies"),
    Deva("Savita", "aditya", "Scheduler"),
    Deva("Bhagah", "aditya", "Cost"),
    Deva("Tvasta", "aditya", "Workflows"),
    Deva("Mitrah", "aditya", "Alliances"),
    Deva("Pusa", "aditya", "Discovery"),
    Deva("Vivasvan", "aditya", "Telemetry"),
    Deva("Visnuh", "aditya", "Pervasion"),
    Deva("Dhata", "aditya", "Foundations"),
    Deva("Amsuman", "aditya", "Shares"),
    # PRAJAPATI · strategy (4 route modules)
    Deva("Goals", "prajapati", "Objectives"),
    Deva("Planning", "prajapati", "Plans"),
    Deva("Intelligence", "prajapati", "Strategy"),
    Deva("Optimization", "prajapati", "Tuning"),
]


def by_domain(domain: str) -> list[Deva]:
    return [d for d in DEVAS if d.domain == domain]


def lookup(name: str) -> Deva | None:
    return next((d for d in DEVAS if d.name == name), None)


# Each deva's primary read-only endpoint, for the drill-down detail view. Devas
# without a clean list/stat endpoint (per-agent only) are omitted -> "overview only".
ENDPOINTS: dict[str, str] = {
    "Indra": "/api/v1/dashboard",
    "Suryah": "/api/v1/traces/stats",
    "Somah": "/api/v1/sessions",
    "Agnih": "/api/v1/execution/stats",
    "Akasah": "/api/v1/context/windows",
    "Apah": "/api/v1/events/streams",
    "Naksatrani": "/api/v1/knowledge/graph",
    "Prthivi": "/api/v1/storage/analytics",
    "Vayuh": "/api/v1/communication/overview",
    "Pranah": "/api/v1/tasks/stats",
    "Samanah": "/api/v1/coordination/tasks",
    "Udanah": "/api/v1/escalations",
    "Dhananjayah": "/api/v1/processes",
    "Devadattah": "/api/v1/notifications/stats",
    "Nagah": "/api/v1/errors",
    "Kurmah": "/api/v1/checkpoints",
    "Krkalah": "/api/v1/recovery/status",
    "Jivatma": "/api/v1/agents",
    "Smriti": "/api/v1/memory/stats",
    "Aryama": "/api/v1/rbac/stats",
    "Varunah": "/api/v1/policies",
    "Savita": "/api/v1/schedules",
    "Bhagah": "/api/v1/cost/summary",
    "Tvasta": "/api/v1/workflows/aditya",
    "Mitrah": "/api/v1/alliances",
    "Pusa": "/api/v1/discovery/registry",
    "Vivasvan": "/api/v1/telemetry/metrics",
    "Visnuh": "/api/v1/pervasion/overview",
    "Dhata": "/api/v1/foundations/overview",
    "Amsuman": "/api/v1/shares/allocation",
    "Goals": "/api/v1/goals",
    "Planning": "/api/v1/planning/templates",
    "Intelligence": "/api/v1/intelligence/overview",
    "Optimization": "/api/v1/optimization/recommendations",
}
