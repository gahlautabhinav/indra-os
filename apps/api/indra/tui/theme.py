"""Ported design tokens — mirror of packages/design-tokens (Vedic Command Surface).

Single source of truth for the TUI's colors, kept in sync with the web app's
cosmic-dark palette so both faces of INDRA look identical.
"""

from __future__ import annotations

# Canvas + surface ladder (darkest -> lightest)
CANVAS = "#07090d"
SURFACE_1 = "#0c1018"
SURFACE_2 = "#111722"
SURFACE_3 = "#16202c"
SURFACE_4 = "#1c2836"
SURFACE_5 = "#212f40"

# Hairlines / borders
HAIRLINE = "#263445"
HAIRLINE_BRIGHT = "#334455"

# Ink (text)
INK_PRIMARY = "#e8eef4"
INK_SECONDARY = "#a8b8c8"
INK_TERTIARY = "#637585"
INK_GHOST = "#3d5060"

# Global accent (INDRA cyan)
ACCENT = "#4dc8c8"

# Domain accents
DOMAIN: dict[str, str] = {
    "indra": "#4dc8c8",
    "vasu": "#d4843a",
    "rudra": "#c44450",
    "aditya": "#3a80d4",
    "prajapati": "#9a44d4",
}

# State colors
STATE: dict[str, str] = {
    "healthy": "#2ab870",
    "degraded": "#e0a030",
    "critical": "#e04040",
    "idle": "#4080a0",
    "dead": "#3d5060",
}

# API status string -> state color (web status vocabulary)
_STATUS_COLOR: dict[str, str] = {
    "running": STATE["healthy"],
    "active": STATE["healthy"],
    "ok": STATE["healthy"],
    "healthy": STATE["healthy"],
    "completed": INK_TERTIARY,
    "queued": STATE["idle"],
    "pending": INK_TERTIARY,
    "idle": STATE["idle"],
    "degraded": STATE["degraded"],
    "warn": STATE["degraded"],
    "warning": STATE["degraded"],
    "info": STATE["idle"],
    "error": STATE["critical"],
    "failed": STATE["critical"],
    "critical": STATE["critical"],
    "unreachable": STATE["critical"],
    "cancelled": INK_TERTIARY,
    "dead": STATE["dead"],
    "unknown": INK_TERTIARY,
}


def status_color(status: str | None) -> str:
    """Map an API status/severity string to a state hex (falls back to tertiary ink)."""
    return _STATUS_COLOR.get((status or "").strip().lower(), INK_TERTIARY)
