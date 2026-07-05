"""Sessions — DataTable of CLI sessions mirrored into INDRA."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any

from rich.text import Text
from textual.app import ComposeResult
from textual.widgets import DataTable, Static

from indra.tui import theme
from indra.tui.screens.base import Pane

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


class SessionsPane(Pane):
    def compose(self) -> ComposeResult:
        yield Static("SESSIONS", classes="pane-title")
        yield DataTable(id="sessions-table", zebra_stripes=True, cursor_type="row")

    def on_mount(self) -> None:
        self.query_one(DataTable).add_columns(
            "PLUGIN", "PROJECT", "STATUS", "TOKENS", "COST", "EVENTS", "STARTED"
        )

    async def refresh_view(self, app: IndraTUI) -> None:
        data: dict[str, Any] = await app.client.sessions() or {}
        table = self.query_one(DataTable)
        table.clear()
        for s in data.get("sessions") or []:
            st = str(s.get("status", ""))
            proj = s.get("project_path") or ""
            table.add_row(
                str(s.get("plugin_type", "—")),
                os.path.basename(str(proj).rstrip("/\\")) or "—",
                Text(st, style=theme.status_color(st)),
                f"{int(s.get('token_count', 0) or 0):,}",
                f"${float(s.get('cost_usd', 0) or 0):.2f}",
                str(s.get("event_count", 0)),
                str(s.get("started_at") or "—")[:19],
            )
