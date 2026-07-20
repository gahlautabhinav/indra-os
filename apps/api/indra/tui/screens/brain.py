"""Second Brain — KG rollup line + indexed-projects table; Enter → project runs."""

from __future__ import annotations

from collections.abc import Iterable
from typing import TYPE_CHECKING, Any

from rich.text import Text
from textual.widget import Widget
from textual.widgets import Static

from indra.tui import theme
from indra.tui.screens.table import TablePane

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


class BrainPane(TablePane):
    TITLE = "SECOND BRAIN · INDEXED PROJECTS"
    COLUMNS = ["PROJECT", "STATUS", "INDEX", "LAST INDEXED", "STAGES"]
    SORTS = [("name", "name"), ("status", "status"), ("index", "index_version")]
    EMPTY = "no indexed projects — run graphify / Tvasta auto-index to build a second brain"

    def extra_widgets(self) -> Iterable[Widget]:
        return (Static("", id="brain-stats"),)

    async def refresh_view(self, app: IndraTUI) -> None:
        ov = await app.client.overview() or {}
        line = Text()
        line.append("knowledge nodes ", style=theme.INK_TERTIARY)
        line.append(f"{int(ov.get('knowledge_nodes', 0) or 0):,}   ", style=theme.ACCENT)
        line.append("memory chunks ", style=theme.INK_TERTIARY)
        line.append(f"{int(ov.get('memory_chunks', 0) or 0):,}", style=theme.DOMAIN["aditya"])
        self.query_one("#brain-stats", Static).update(line)
        await super().refresh_view(app)

    async def fetch(self, app: IndraTUI) -> list[dict[str, Any]]:
        data = await app.client.projects()
        return list(data) if isinstance(data, list) else []

    def extract(self, raw: dict[str, Any]) -> tuple[str, list[Any]]:
        st = str(raw.get("status", ""))
        rid = str(raw.get("id") or "")
        stages = raw.get("stages") or []
        cells = [
            str(raw.get("name", "—")),
            Text(st, style=theme.status_color(st)),
            f"v{int(raw.get('index_version', 0) or 0)}",
            str(raw.get("last_indexed_at") or "—")[:19],
            f"{len(stages)} stages" if isinstance(stages, list) else "—",
        ]
        return rid, cells

    async def fetch_detail(self, app: IndraTUI, row_id: str) -> tuple[str, Any] | None:
        runs = await app.client.raw(f"/api/v1/projects/{row_id}/runs")
        return f"PROJECT · {row_id[:8]}", runs
