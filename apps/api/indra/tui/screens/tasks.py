"""Tasks — stat summary line + DataTable of tasks."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rich.text import Text
from textual.app import ComposeResult
from textual.widgets import DataTable, Static

from indra.tui import theme
from indra.tui.screens.base import Pane

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI

_STAT_ORDER = [
    ("running", "running"),
    ("pending", "pending"),
    ("completed", "completed"),
    ("failed", "failed"),
    ("cancelled", "cancelled"),
]


class TasksPane(Pane):
    def compose(self) -> ComposeResult:
        yield Static("TASKS", classes="pane-title")
        yield Static("", id="task-stats")
        yield DataTable(id="tasks-table", zebra_stripes=True, cursor_type="row")

    def on_mount(self) -> None:
        self.query_one(DataTable).add_columns("NAME", "STATUS", "PRIORITY", "CREATED", "ERROR")

    async def refresh_view(self, app: IndraTUI) -> None:
        stats: dict[str, Any] = await app.client.task_stats() or {}
        line = Text()
        for key, label in _STAT_ORDER:
            n = int(stats.get(key, 0) or 0)
            line.append(f"{label} ", style=theme.INK_TERTIARY)
            line.append(f"{n}   ", style=theme.status_color(key))
        line.append(f"total {int(stats.get('total', 0) or 0)}", style=theme.INK_SECONDARY)
        self.query_one("#task-stats", Static).update(line)

        data: dict[str, Any] = await app.client.tasks() or {}
        table = self.query_one(DataTable)
        table.clear()
        for tk in data.get("tasks") or []:
            st = str(tk.get("status", ""))
            prio = int(tk.get("priority", 0) or 0)
            prio_label = {0: "normal", 1: "high", 2: "critical"}.get(prio, str(prio))
            table.add_row(
                str(tk.get("name", "—")),
                Text(st, style=theme.status_color(st)),
                prio_label,
                str(tk.get("created_at") or "—")[:19],
                str(tk.get("error") or "")[:40],
            )
