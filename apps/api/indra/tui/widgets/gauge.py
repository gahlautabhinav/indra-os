"""HostGauge — a btop-style labeled bar (block chars), colored by threshold."""

from __future__ import annotations

from textual.widgets import Static

from indra.tui import theme

_WIDTH = 24


class HostGauge(Static):
    def __init__(self, label: str, *, id: str | None = None) -> None:
        super().__init__(id=id, classes="host-gauge")
        self._label = label

    def set_pct(self, pct: float) -> None:
        pct = max(0.0, min(100.0, float(pct)))
        filled = round(pct / 100 * _WIDTH)
        if pct < 70:
            color = theme.STATE["healthy"]
        elif pct < 90:
            color = theme.STATE["degraded"]
        else:
            color = theme.STATE["critical"]
        bar = (
            f"[{color}]{'█' * filled}[/]"
            f"[{theme.INK_GHOST}]{'─' * (_WIDTH - filled)}[/]"
        )
        self.update(
            f"[{theme.INK_TERTIARY}]{self._label:<4}[/] {bar} [{color}]{pct:4.0f}%[/]"
        )
