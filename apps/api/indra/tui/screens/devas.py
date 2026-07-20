"""Devas — master-detail with a real health sweep + type-to-jump filter.

Opening the screen probes all 33 deva endpoints concurrently and colors each dot by
what actually came back (healthy / idle-empty / critical-error / n-a). ↑/↓ loads a
deva's detail live; `/` filters the list; Enter selects.
"""

from __future__ import annotations

import asyncio
import contextlib
from typing import TYPE_CHECKING, Any, cast

from rich.text import Text
from textual import on
from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, VerticalScroll
from textual.widgets import Input, OptionList, Static
from textual.widgets.option_list import Option

from indra.tui import theme
from indra.tui.registry import DEVAS, DOMAINS, ENDPOINTS, Deva, by_domain, lookup
from indra.tui.screens.base import Pane
from indra.tui.widgets.deva_detail import DevaDetail

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


def _classify(data: Any) -> str:
    """Map a deva endpoint's response to a health state (real signal, coarse)."""
    if data is None:
        return "critical"
    if isinstance(data, list):
        return "healthy" if data else "idle"
    if isinstance(data, dict):
        for k, v in data.items():
            if k == "deva":
                continue
            if isinstance(v, (int, float)):  # bool is an int subclass
                if v:
                    return "healthy"
            elif isinstance(v, str):
                if v.strip():
                    return "healthy"
            elif v:
                return "healthy"
        return "idle"
    return "healthy" if data else "idle"


class DevaPane(Pane):
    BINDINGS = [
        Binding("slash", "filter", "Filter"),
        Binding("escape", "clear_filter", "Clear", show=False),
    ]

    def compose(self) -> ComposeResult:
        yield Static("33 DEVAS · SELECT TO INSPECT · / filter", classes="pane-title")
        yield Input(placeholder="filter devas… (esc to clear)", id="deva-filter")
        with Horizontal(id="deva-split"):
            yield OptionList(id="deva-list")
            with VerticalScroll(id="deva-detail-box"):
                yield DevaDetail(id="deva-detail")

    def on_mount(self) -> None:
        self._current: str | None = None
        self._filter = ""
        self._health: dict[str, str] = {}
        self.query_one("#deva-filter", Input).display = False
        self._build_options()

    def _tui(self) -> IndraTUI:
        return cast("IndraTUI", self.app)

    def _dot(self, deva: Deva, accent: str) -> tuple[str, str]:
        st = self._health.get(deva.name)
        if st is None:
            return accent, "●"  # not swept yet
        if st == "na":
            return theme.INK_GHOST, "○"
        return theme.STATE.get(st, theme.INK_GHOST), ("○" if st == "idle" else "●")

    def _build_options(self) -> None:
        ol = self.query_one(OptionList)
        ol.clear_options()
        f = self._filter
        for dom in DOMAINS:
            devas = [d for d in by_domain(dom) if not f or f in d.name.lower() or f in d.role.lower()]
            if not devas:
                continue
            accent = theme.DOMAIN[dom]
            ol.add_option(Option(Text(dom.upper(), style=f"bold {accent}"), disabled=True))
            for d in devas:
                color, glyph = self._dot(d, accent)
                p = Text()
                p.append(f"{glyph} ", style=color)
                p.append(f"{d.name}  ", style=theme.INK_SECONDARY)
                p.append(d.role, style=theme.INK_TERTIARY)
                ol.add_option(Option(p, id=d.name))

    async def _sweep(self) -> None:
        client = getattr(self._tui(), "client", None)
        if client is None or not client.connected:
            return
        names = [d.name for d in DEVAS]

        async def probe(path: str | None) -> str:
            if path is None:
                return "na"
            return _classify(await client.raw(path))

        results = await asyncio.gather(*(probe(ENDPOINTS.get(n)) for n in names))
        self._health = dict(zip(names, results, strict=True))
        self._build_options()

    async def _load(self, deva: Deva | None) -> None:
        if deva is not None:
            await self.query_one(DevaDetail).load(self._tui(), deva)

    @on(OptionList.OptionHighlighted, "#deva-list")
    async def _on_highlight(self, event: OptionList.OptionHighlighted) -> None:
        if event.option_id:
            self._current = event.option_id
            await self._load(lookup(event.option_id))

    @on(Input.Changed, "#deva-filter")
    def _on_filter(self, event: Input.Changed) -> None:
        self._filter = event.value.strip().lower()
        self._build_options()

    @on(Input.Submitted, "#deva-filter")
    def _on_filter_submit(self) -> None:
        self.query_one(OptionList).focus()

    async def refresh_view(self, app: IndraTUI) -> None:
        await self._load(lookup(self._current or DEVAS[0].name))

    def activate(self) -> None:
        with contextlib.suppress(Exception):
            self.query_one("#deva-list", OptionList).focus()
        self.run_worker(self._sweep(), exclusive=True, group="deva-sweep")

    def action_filter(self) -> None:
        inp = self.query_one("#deva-filter", Input)
        inp.display = True
        inp.focus()

    def action_clear_filter(self) -> None:
        inp = self.query_one("#deva-filter", Input)
        inp.value = ""
        inp.display = False
        self._filter = ""
        self._build_options()
        self.query_one(OptionList).focus()
