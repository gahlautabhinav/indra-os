"""Agents — DataTable of live agents, status-colored."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rich.text import Text
from textual.app import ComposeResult
from textual.widgets import DataTable, Static

from indra.tui import theme
from indra.tui.screens.base import Pane

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


class AgentsPane(Pane):
    def compose(self) -> ComposeResult:
        yield Static("AGENTS", classes="pane-title")
        yield DataTable(id="agents-table", zebra_stripes=True, cursor_type="row")

    def on_mount(self) -> None:
        self.query_one(DataTable).add_columns(
            "NAME", "TYPE", "STATUS", "DOMAIN", "TOKENS", "COST", "SESSION"
        )

    async def refresh_view(self, app: IndraTUI) -> None:
        data: dict[str, Any] = await app.client.agents() or {}
        table = self.query_one(DataTable)
        table.clear()
        for a in data.get("agents") or []:
            st = str(a.get("status", ""))
            table.add_row(
                str(a.get("name", "—")),
                str(a.get("type", "—")),
                Text(st, style=theme.status_color(st)),
                str(a.get("domain", "—")),
                f"{int(a.get('token_count', 0) or 0):,}",
                f"${float(a.get('cost_usd', 0) or 0):.2f}",
                str(a.get("session_id") or "—")[:8],
            )
