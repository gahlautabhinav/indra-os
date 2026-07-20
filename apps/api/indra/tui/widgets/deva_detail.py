"""DevaDetail — renders one deva's identity + its live endpoint data."""

from __future__ import annotations

from typing import TYPE_CHECKING

from rich.text import Text
from textual.widgets import Static

from indra.tui import theme
from indra.tui.registry import ENDPOINTS, Deva
from indra.tui.widgets.render import render_into

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


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
            render_into(t, data)
        self.update(t)
