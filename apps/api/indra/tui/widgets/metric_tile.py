"""MetricTile — big mono/tabular value + label-caps caption, with a domain top-strip.

Values are kept Digits-safe (only 0-9 . , + - space); units/symbols go in the caption
(e.g. value "1.83", unit "$ TODAY"). The colored top border echoes the web `.domain-panel`.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Digits, Label

from indra.tui import theme

_DIGITS_OK = set("0123456789.,+- ")


def _safe(value: str) -> str:
    return "".join(c for c in value if c in _DIGITS_OK).strip() or "0"


class MetricTile(Vertical):
    def __init__(
        self,
        label: str,
        value: str = "0",
        unit: str = "",
        accent: str = theme.ACCENT,
        *,
        id: str | None = None,
    ) -> None:
        super().__init__(id=id, classes="metric-tile")
        self._label = label
        self._value = value
        self._unit = unit
        self._accent = accent

    def compose(self) -> ComposeResult:
        yield Label(self._label.upper(), classes="tile-label")
        yield Digits(_safe(self._value), classes="tile-value")
        yield Label(self._unit.upper(), classes="tile-unit")

    def on_mount(self) -> None:
        self.styles.border_top = ("heavy", self._accent)

    def update(self, value: str, unit: str | None = None) -> None:
        self.query_one(Digits).update(_safe(value))
        if unit is not None:
            self.query_one(".tile-unit", Label).update(unit.upper())
