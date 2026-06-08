// ── INDRA Devata Registry ──────────────────────────────────────────────────
// Single source of truth for the 33-Deva navigation map. Each domain holds its
// devas with route, romanized name, Devanagari name, and functional role.
// Consumed by the SigilBar menu and any breadcrumb / command-palette surfaces.

import {
  CommandIcon,
  LayersIcon,
  ZapIcon,
  ShieldIcon,
  BrainIcon,
  type LucideIcon,
} from "lucide-react";

export interface Deva {
  /** URL segment, e.g. "suryah" → /vasu/suryah */
  slug: string;
  /** Full route path */
  href: string;
  /** Romanized name */
  name: string;
  /** Devanagari name */
  sanskrit: string;
  /** Functional role shown as subtitle */
  role: string;
}

export interface Domain {
  id: string;
  label: string;
  sanskrit: string;
  icon: LucideIcon;
  color: string;
  /** Landing route when the domain sigil is clicked */
  href: string;
  /** Short tagline */
  tagline: string;
  devas: Deva[];
}

export const DOMAINS: Domain[] = [
  {
    id: "indra",
    label: "INDRA",
    sanskrit: "इन्द्रः",
    icon: CommandIcon,
    color: "var(--domain-indra)",
    href: "/indra",
    tagline: "Command",
    devas: [
      { slug: "indra", href: "/indra", name: "Indra", sanskrit: "इन्द्रः", role: "Command Throne" },
    ],
  },
  {
    id: "vasu",
    label: "VASU",
    sanskrit: "वसु",
    icon: LayersIcon,
    color: "var(--domain-vasu)",
    href: "/vasu/suryah",
    tagline: "Infrastructure · 8 Devas",
    devas: [
      { slug: "suryah", href: "/vasu/suryah", name: "Suryah", sanskrit: "सूर्यः", role: "Traces" },
      { slug: "somah", href: "/vasu/somah", name: "Somah", sanskrit: "सोमः", role: "Sessions" },
      { slug: "agnih", href: "/vasu/agnih", name: "Agnih", sanskrit: "अग्निः", role: "Execution" },
      { slug: "akasah", href: "/vasu/akasah", name: "Akasah", sanskrit: "आकाशः", role: "Context" },
      { slug: "apah", href: "/vasu/apah", name: "Apah", sanskrit: "आपः", role: "Event Streams" },
      { slug: "naksatrani", href: "/vasu/naksatrani", name: "Naksatrani", sanskrit: "नक्षत्राणि", role: "Knowledge Graph" },
      { slug: "prthivi", href: "/vasu/prthivi", name: "Prthivi", sanskrit: "पृथ्वी", role: "Storage" },
      { slug: "vayuh", href: "/vasu/vayuh", name: "Vayuh", sanskrit: "वायुः", role: "Communication" },
    ],
  },
  {
    id: "rudra",
    label: "RUDRA",
    sanskrit: "रुद्र",
    icon: ZapIcon,
    color: "var(--domain-rudra)",
    href: "/rudra/pranah",
    tagline: "Runtime · 11 Devas",
    devas: [
      { slug: "pranah", href: "/rudra/pranah", name: "Pranah", sanskrit: "प्राणः", role: "Tasks" },
      { slug: "vyanah", href: "/rudra/vyanah", name: "Vyanah", sanskrit: "व्यानः", role: "Messages" },
      { slug: "samanah", href: "/rudra/samanah", name: "Samanah", sanskrit: "समानः", role: "Coordination" },
      { slug: "udanah", href: "/rudra/udanah", name: "Udanah", sanskrit: "उदानः", role: "Escalations" },
      { slug: "apanah", href: "/rudra/apanah", name: "Apanah", sanskrit: "अपानः", role: "Cleanup" },
      { slug: "dhananjayah", href: "/rudra/dhananjayah", name: "Dhananjayah", sanskrit: "धनञ्जयः", role: "Processes" },
      { slug: "devadattah", href: "/rudra/devadattah", name: "Devadattah", sanskrit: "देवदत्तः", role: "Notifications" },
      { slug: "nagah", href: "/rudra/nagah", name: "Nagah", sanskrit: "नागः", role: "Errors" },
      { slug: "kurmah", href: "/rudra/kurmah", name: "Kurmah", sanskrit: "कूर्मः", role: "Checkpoints" },
      { slug: "krkalah", href: "/rudra/krkalah", name: "Krkalah", sanskrit: "कृकलः", role: "Recovery" },
      { slug: "jivatma", href: "/rudra/jivatma", name: "Jivatma", sanskrit: "जीवात्मा", role: "Identity" },
    ],
  },
  {
    id: "aditya",
    label: "ADITYA",
    sanskrit: "आदित्य",
    icon: ShieldIcon,
    color: "var(--domain-aditya)",
    href: "/aditya/smriti",
    tagline: "Governance · 12 Devas",
    devas: [
      { slug: "smriti", href: "/aditya/smriti", name: "Smriti", sanskrit: "स्मृति", role: "Memory / RAG" },
      { slug: "aryama", href: "/aditya/aryama", name: "Aryama", sanskrit: "अर्यमा", role: "RBAC" },
      { slug: "varunah", href: "/aditya/varunah", name: "Varunah", sanskrit: "वरुणः", role: "Policies" },
      { slug: "savita", href: "/aditya/savita", name: "Savita", sanskrit: "सविता", role: "Scheduler" },
      { slug: "bhagah", href: "/aditya/bhagah", name: "Bhagah", sanskrit: "भगः", role: "Cost" },
      { slug: "tvasta", href: "/aditya/tvasta", name: "Tvasta", sanskrit: "त्वष्टा", role: "Workflows" },
      { slug: "mitrah", href: "/aditya/mitrah", name: "Mitrah", sanskrit: "मित्रः", role: "Alliances" },
      { slug: "pusa", href: "/aditya/pusa", name: "Pusa", sanskrit: "पूषा", role: "Discovery" },
      { slug: "vivasvan", href: "/aditya/vivasvan", name: "Vivasvan", sanskrit: "विवस्वान्", role: "Telemetry" },
      { slug: "visnuh", href: "/aditya/visnuh", name: "Visnuh", sanskrit: "विष्णुः", role: "Pervasion" },
      { slug: "dhata", href: "/aditya/dhata", name: "Dhata", sanskrit: "धाता", role: "Foundations" },
      { slug: "amsuman", href: "/aditya/amsuman", name: "Amsuman", sanskrit: "अंशुमान्", role: "Shares" },
    ],
  },
  {
    id: "prajapati",
    label: "PRAJAPATI",
    sanskrit: "प्रजापति",
    icon: BrainIcon,
    color: "var(--domain-prajapati)",
    href: "/prajapati/goals",
    tagline: "Strategy",
    devas: [
      { slug: "goals", href: "/prajapati/goals", name: "Goals", sanskrit: "लक्ष्याणि", role: "Objectives" },
      { slug: "planning", href: "/prajapati/planning", name: "Planning", sanskrit: "योजना", role: "Plans" },
      { slug: "intelligence", href: "/prajapati/intelligence", name: "Intelligence", sanskrit: "प्रज्ञा", role: "Strategy" },
      { slug: "optimization", href: "/prajapati/optimization", name: "Optimization", sanskrit: "अनुकूलन", role: "Tuning" },
    ],
  },
];

/** Resolve the active domain from a pathname. */
export function activeDomainFor(pathname: string): Domain {
  return DOMAINS.find((d) => pathname.startsWith(`/${d.id}`)) ?? DOMAINS[0]!;
}

/** Resolve the active deva (if any) from a pathname. */
export function activeDevaFor(pathname: string): Deva | undefined {
  for (const domain of DOMAINS) {
    const match = domain.devas.find((dv) => pathname === dv.href || pathname.startsWith(`${dv.href}/`));
    if (match) return match;
  }
  return undefined;
}
