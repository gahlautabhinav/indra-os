"""Tasks — stat summary line + table; Enter → full task (input/output/error)."""

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

_STAT_ORDER = ["running", "pending", "completed", "failed", "cancelled"]
_PRIORITY = {0: "normal", 1: "high", 2: "critical"}


class TasksPane(TablePane):
    TITLE = "TASKS"
    COLUMNS = ["NAME", "STATUS", "PRIORITY", "CREATED", "ERROR"]
    SORTS = [("name", "name"), ("status", "status"), ("priority", "priority"), ("created", "created_at")]
    EMPTY = "no tasks yet"

    def extra_widgets(self) -> Iterable[Widget]:
        return (Static("", id="task-stats"),)

    async def refresh_view(self, app: IndraTUI) -> None:
        stats = await app.client.task_stats() or {}
        line = Text()
        for key in _STAT_ORDER:
            line.append(f"{key} ", style=theme.INK_TERTIARY)
            line.append(f"{int(stats.get(key, 0) or 0)}   ", style=theme.status_color(key))
        line.append(f"total {int(stats.get('total', 0) or 0)}", style=theme.INK_SECONDARY)
        self.query_one("#task-stats", Static).update(line)
        await super().refresh_view(app)

    async def fetch(self, app: IndraTUI) -> list[dict[str, Any]]:
        data = await app.client.tasks() or {}
        return list(data.get("tasks") or [])

    def extract(self, raw: dict[str, Any]) -> tuple[str, list[Any]]:
        st = str(raw.get("status", ""))
        rid = str(raw.get("id") or "")
        cells = [
            str(raw.get("name", "—")),
            Text(st, style=theme.status_color(st)),
            _PRIORITY.get(int(raw.get("priority", 0) or 0), str(raw.get("priority", 0))),
            str(raw.get("created_at") or "—")[:19],
            str(raw.get("error") or "")[:40],
        ]
        return rid, cells

    async def fetch_detail(self, app: IndraTUI, row_id: str) -> tuple[str, Any] | None:
        task = await app.client.raw(f"/api/v1/tasks/{row_id}")
        return f"TASK · {row_id[:8]}", task
