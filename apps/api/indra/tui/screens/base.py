"""Pane — base for the six content panes. Each fetches only what it renders."""

from __future__ import annotations

from typing import TYPE_CHECKING

from textual.containers import Vertical

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


class Pane(Vertical):
    async def refresh_view(self, app: IndraTUI) -> None:
        """Repaint from live data. Called on tick while this pane is active."""

    def activate(self) -> None:
        """Called when this pane becomes active — focus its default widget. Override."""
