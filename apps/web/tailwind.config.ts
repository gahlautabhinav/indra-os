import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--indra-canvas)",
        "surface-1": "var(--indra-surface-1)",
        "surface-2": "var(--indra-surface-2)",
        "surface-3": "var(--indra-surface-3)",
        "surface-4": "var(--indra-surface-4)",
        "surface-5": "var(--indra-surface-5)",
        hairline: "var(--indra-hairline)",
        "hairline-bright": "var(--indra-hairline-bright)",
        "ink-primary": "var(--indra-ink-primary)",
        "ink-secondary": "var(--indra-ink-secondary)",
        "ink-tertiary": "var(--indra-ink-tertiary)",
        "ink-ghost": "var(--indra-ink-ghost)",
        accent: "var(--indra-accent)",
        "accent-dim": "var(--indra-accent-dim)",
        "domain-indra": "var(--domain-indra)",
        "domain-vasu": "var(--domain-vasu)",
        "domain-rudra": "var(--domain-rudra)",
        "domain-aditya": "var(--domain-aditya)",
        "domain-prajapati": "var(--domain-prajapati)",
        healthy: "var(--state-healthy)",
        degraded: "var(--state-degraded)",
        critical: "var(--state-critical)",
        idle: "var(--state-idle)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "label-caps": ["10px", { letterSpacing: "0.1em", fontWeight: "600" }],
      },
      borderColor: {
        DEFAULT: "var(--indra-hairline)",
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      spacing: {
        "sigil-collapsed": "64px",
        "sigil-expanded": "240px",
        topbar: "48px",
      },
      boxShadow: {
        floating: "var(--shadow-floating)",
        "command-ether": "var(--shadow-command-ether)",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        "flow-dash": {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "command-in": {
          from: { opacity: "0", transform: "scale(0.97) translateY(-8px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "flow-dash": "flow-dash 1s linear infinite",
        "fade-in": "fade-in 200ms ease forwards",
        "slide-in-left": "slide-in-left 200ms ease forwards",
        "command-in": "command-in 150ms ease forwards",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
      },
    },
  },
  plugins: [],
};

export default config;
