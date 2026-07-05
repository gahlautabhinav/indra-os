"""Devas — master-detail: navigable list of all 33 devas + live per-deva detail.

↑/↓ (or j/k) move the cursor, which loads that deva's detail live; Enter also
selects. Each deva fetches its own endpoint (registry.ENDPOINTS).
"""

from __future__ import annotations

import contextlib
from typing import TYPE_CHECKING, cast

from rich.text import Text
from textual import on
from textual.app import ComposeResult
from textual.containers import Horizontal, VerticalScroll
from textual.widgets import OptionList, Static
from textual.widgets.option_list import Option

from indra.tui import theme
from indra.tui.registry import DEVAS, DOMAINS, Deva, by_domain, lookup
from indra.tui.screens.base import Pane
from indra.tui.widgets.deva_detail import DevaDetail

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


class DevaPane(Pane):
    _current: str | None = None

    def compose(self) -> ComposeResult:
        yield Static("33 DEVAS · SELECT TO INSPECT", classes="pane-title")
        with Horizontal(id="deva-split"):
            yield OptionList(id="deva-list")
            with VerticalScroll(id="deva-detail-box"):
                yield DevaDetail(id="deva-detail")

    def on_mount(self) -> None:
        ol = self.query_one(OptionList)
        for i, dom in enumerate(DOMAINS):
            if i:
                ol.add_option(Option(Text(""), disabled=True))
            accent = theme.DOMAIN[dom]
            ol.add_option(Option(Text(dom.upper(), style=f"bold {accent}"), disabled=True))
            for d in by_domain(dom):
                p = Text()
                p.append("● ", style=accent)
                p.append(f"{d.name}  ", style=theme.INK_SECONDARY)
                p.append(d.role, style=theme.INK_TERTIARY)
                ol.add_option(Option(p, id=d.name))

    def _tui(self) -> IndraTUI:
        return cast("IndraTUI", self.app)

    async def _load(self, deva: Deva | None) -> None:
        if deva is not None:
            await self.query_one(DevaDetail).load(self._tui(), deva)

    @on(OptionList.OptionHighlighted, "#deva-list")
    async def _on_highlight(self, event: OptionList.OptionHighlighted) -> None:
        if event.option_id:
            self._current = event.option_id
            await self._load(lookup(event.option_id))

    async def refresh_view(self, app: IndraTUI) -> None:
        await self._load(lookup(self._current or DEVAS[0].name))

    def activate(self) -> None:
        with contextlib.suppress(Exception):
            self.query_one("#deva-list", OptionList).focus()
