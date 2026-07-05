"""DevaDetail — renders one deva's identity + its live endpoint data.

A single generic renderer covers all 33 devas: scalar fields become aligned
label/value rows (status-like keys colored), list fields show a count + a few
example rows. No per-deva bespoke code.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rich.text import Text
from textual.widgets import Static

from indra.tui import theme
from indra.tui.registry import ENDPOINTS, Deva

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


def _fmt(v: Any) -> str:
    if isinstance(v, bool):
        return "yes" if v else "no"
    if isinstance(v, int):
        return f"{v:,}"
    if isinstance(v, float):
        return f"{v:,.2f}"
    return str(v)[:64]


def _style_for(key: str, value: Any) -> str:
    kl = key.lower()
    if isinstance(value, str) and ("status" in kl or "health" in kl or "state" in kl or "severity" in kl):
        return theme.status_color(value)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return theme.ACCENT
    return theme.INK_PRIMARY


def _one_line(item: Any) -> str:
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
        text = str(label)[:44]
        if status:
            text += f" · {status}"
        return text
    return str(item)[:60]


def _render_into(t: Text, data: Any, indent: int = 0) -> None:
    pad = "  " * indent
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, list):
                t.append(f"{pad}{k}  ", style=theme.INK_TERTIARY)
                t.append(f"[{len(v)}]\n", style=theme.INK_SECONDARY)
                for item in v[:5]:
                    t.append(f"{pad}  • ", style=theme.INK_GHOST)
                    t.append(f"{_one_line(item)}\n", style=theme.INK_SECONDARY)
            elif isinstance(v, dict):
                t.append(f"{pad}{k}\n", style=theme.INK_TERTIARY)
                _render_into(t, v, indent + 1)
            else:
                t.append(f"{pad}{k:<22}", style=theme.INK_TERTIARY)
                t.append(f"{_fmt(v)}\n", style=_style_for(k, v))
    elif isinstance(data, list):
        t.append(f"{len(data)} items\n", style=theme.INK_SECONDARY)
        for item in data[:10]:
            t.append("• ", style=theme.INK_GHOST)
            t.append(f"{_one_line(item)}\n", style=theme.INK_SECONDARY)
    else:
        t.append(f"{data}\n", style=theme.INK_SECONDARY)


class DevaDetail(Static):
    async def load(self, app: IndraTUI, deva: Deva) -> None:
        accent = theme.DOMAIN[deva.domain]
        t = Text()
        t.append(f"{deva.name}\n", style=f"bold {accent}")
        t.append(f"{deva.domain.upper()} · {deva.role}\n", style=theme.INK_TERTIARY)

        path = ENDPOINTS.get(deva.name)
        if path is None:
            t.append("\noverview only — no live endpoint", style=theme.INK_TERTIARY)
            self.update(t)
            return

        t.append(f"{path}\n\n", style=theme.INK_GHOST)
        client = getattr(app, "client", None)
        if client is None:
            self.update(t)
            return
        data = await client.raw(path)
        if data is None:
            t.append("no live data (offline or empty)", style=theme.INK_TERTIARY)
        else:
            _render_into(t, data)
        self.update(t)
