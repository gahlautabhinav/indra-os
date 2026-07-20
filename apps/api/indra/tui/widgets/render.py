"""Shared Rich renderer for arbitrary JSON payloads (deva detail + row drill-down).

Scalars become aligned label/value rows (status-like keys colored), list fields
show a count + a few example rows, nested dicts indent one level.
"""

from __future__ import annotations

from typing import Any

from rich.text import Text

from indra.tui import theme


def _fmt(v: Any) -> str:
    if isinstance(v, bool):
        return "yes" if v else "no"
    if isinstance(v, int):
        return f"{v:,}"
    if isinstance(v, float):
        return f"{v:,.2f}"
    return str(v)[:80]


def _style_for(key: str, value: Any) -> str:
    kl = key.lower()
    if isinstance(value, str) and any(w in kl for w in ("status", "health", "state", "severity")):
        return theme.status_color(value)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return theme.ACCENT
    return theme.INK_PRIMARY


def one_line(item: Any) -> str:
    if isinstance(item, dict):
        label = (
            item.get("name")
            or item.get("title")
            or item.get("label")
            or item.get("type")
            or item.get("id")
            or "—"
        )
        status = item.get("status") or item.get("severity")
        text = str(label)[:52]
        if status:
            text += f" · {status}"
        return text
    return str(item)[:72]


def render_into(t: Text, data: Any, indent: int = 0) -> None:
    pad = "  " * indent
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, list):
                t.append(f"{pad}{k}  ", style=theme.INK_TERTIARY)
                t.append(f"[{len(v)}]\n", style=theme.INK_SECONDARY)
                for item in v[:8]:
                    t.append(f"{pad}  • ", style=theme.INK_GHOST)
                    t.append(f"{one_line(item)}\n", style=theme.INK_SECONDARY)
            elif isinstance(v, dict):
                t.append(f"{pad}{k}\n", style=theme.INK_TERTIARY)
                render_into(t, v, indent + 1)
            else:
                t.append(f"{pad}{k:<22}", style=theme.INK_TERTIARY)
                t.append(f"{_fmt(v)}\n", style=_style_for(k, v))
    elif isinstance(data, list):
        t.append(f"{len(data)} items\n", style=theme.INK_SECONDARY)
        for item in data[:20]:
            t.append("• ", style=theme.INK_GHOST)
            t.append(f"{one_line(item)}\n", style=theme.INK_SECONDARY)
    else:
        t.append(f"{data}\n", style=theme.INK_SECONDARY)


def render_data(data: Any) -> Text:
    t = Text()
    if data is None:
        t.append("no data (offline or empty)", style=theme.INK_TERTIARY)
    else:
        render_into(t, data)
    return t
