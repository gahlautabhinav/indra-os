"""AlertsFeed — renders the dashboard's alert dicts as a compact colored feed."""

from __future__ import annotations

from typing import Any

from rich.text import Text
from textual.widgets import Static

from indra.tui import theme


class AlertsFeed(Static):
    def render_alerts(self, alerts: list[dict[str, Any]]) -> None:
        if not alerts:
            self.update(f"[{theme.INK_TERTIARY}]no active alerts[/]")
            return
        t = Text()
        for a in alerts[:8]:
            sev = str(a.get("severity") or a.get("level") or "info")
            color = theme.status_color(sev)
            msg = str(a.get("title") or a.get("message") or a.get("name") or a)
            t.append("● ", style=color)
            t.append(f"{msg}\n", style=theme.INK_SECONDARY)
        self.update(t)
