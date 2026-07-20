"""DetailModal — full-record drill-down (agent lineage, session events, task io)."""

from __future__ import annotations

from typing import Any

from textual.app import ComposeResult
from textual.containers import Vertical, VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import Static

from indra.tui import theme
from indra.tui.widgets.render import render_data


class DetailModal(ModalScreen[None]):
    BINDINGS = [
        ("escape", "dismiss", "Close"),
        ("q", "dismiss", "Close"),
    ]

    def __init__(self, title: str, data: Any) -> None:
        super().__init__()
        self._title = title
        self._data = data

    def compose(self) -> ComposeResult:
        with Vertical(id="detail-box"):
            yield Static(f"[{theme.ACCENT}]{self._title}[/]", id="detail-title")
            with VerticalScroll(id="detail-body"):
                yield Static(render_data(self._data))
            yield Static(f"[{theme.INK_TERTIARY}]esc / q to close[/]", id="detail-hint")
