export const DOMAIN_COLORS = {
  indra: "#4dc8c8",
  vasu: "#d4843a",
  rudra: "#c44450",
  aditya: "#3a80d4",
  prajapati: "#9a44d4",
} as const;

export const STATE_COLORS = {
  healthy: "#2ab870",
  degraded: "#e0a030",
  critical: "#e04040",
  idle: "#4080a0",
  dead: "#3d5060",
} as const;

export const CANVAS = "#07090d";

export const SURFACES = {
  1: "#0c1018",
  2: "#111722",
  3: "#16202c",
  4: "#1c2836",
  5: "#212f40",
} as const;

export const INK = {
  primary: "#e8eef4",
  secondary: "#a8b8c8",
  tertiary: "#637585",
  ghost: "#3d5060",
} as const;

export const HAIRLINE = "#263445";
export const HAIRLINE_BRIGHT = "#334455";
export const ACCENT = "#4dc8c8";

export type DomainId = keyof typeof DOMAIN_COLORS;
