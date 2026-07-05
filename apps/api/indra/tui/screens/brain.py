"""Second Brain — indexed projects + knowledge-graph rollup."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rich.text import Text
from textual.app import ComposeResult
from textual.widgets import DataTable, Static

from indra.tui import theme
from indra.tui.screens.base import Pane

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


class BrainPane(Pane):
    def compose(self) -> ComposeResult:
        yield Static("SECOND BRAIN · INDEXED PROJECTS", classes="pane-title")
        yield Static("", id="brain-stats")
        yield DataTable(id="projects-table", zebra_stripes=True, cursor_type="row")

    def on_mount(self) -> None:
        self.query_one(DataTable).add_columns(
            "PROJECT", "STATUS", "INDEX", "LAST INDEXED", "STAGES"
        )

    async def refresh_view(self, app: IndraTUI) -> None:
        ov: dict[str, Any] = await app.client.overview() or {}
        line = Text()
        line.append("knowledge nodes ", style=theme.INK_TERTIARY)
        line.append(f"{int(ov.get('knowledge_nodes', 0) or 0):,}   ", style=theme.ACCENT)
        line.append("memory chunks ", style=theme.INK_TERTIARY)
        line.append(f"{int(ov.get('memory_chunks', 0) or 0):,}", style=theme.DOMAIN['aditya'])
        self.query_one("#brain-stats", Static).update(line)

        data = await app.client.projects()
        rows = data if isinstance(data, list) else []
        table = self.query_one(DataTable)
        table.clear()
        for p in rows:
            st = str(p.get("status", ""))
            stages = p.get("stages") or []
            table.add_row(
                str(p.get("name", "—")),
                Text(st, style=theme.status_color(st)),
                f"v{int(p.get('index_version', 0) or 0)}",
                str(p.get("last_indexed_at") or "—")[:19],
                f"{len(stages)} stages" if isinstance(stages, list) else "—",
            )
