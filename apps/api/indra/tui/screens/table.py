"""TablePane — shared base for the table screens.

Gives every table: live refresh, `/` substring filter, `s` sort (cycles column +
direction), Enter row drill-down (DetailModal), and a teaching empty-state. Subclasses
declare COLUMNS/SORTS/EMPTY and implement fetch(), extract(), and (optionally)
fetch_detail().
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import TYPE_CHECKING, Any, cast

from rich.text import Text
from textual import on
from textual.app import ComposeResult
from textual.binding import Binding
from textual.widget import Widget
from textual.widgets import DataTable, Input, Static

from indra.tui import theme
from indra.tui.screens.base import Pane
from indra.tui.widgets.detail_modal import DetailModal

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI

# (row_id, raw_dict, display_cells, filter_text)
_Item = tuple[str, dict[str, Any], list[Any], str]


def _sortval(v: Any) -> tuple[int, Any]:
    """Sort key that keeps None last and compares numbers/strings sanely."""
    if v is None:
        return (2, "")
    if isinstance(v, bool):
        return (1, str(v))
    if isinstance(v, (int, float)):
        return (0, v)
    return (1, str(v).lower())


class TablePane(Pane):
    TITLE = ""
    COLUMNS: list[str] = []
    SORTS: list[tuple[str, str]] = []  # (label, dict-key)
    EMPTY = "no data yet"

    BINDINGS = [
        Binding("slash", "filter", "Filter"),
        Binding("s", "sort", "Sort"),
        Binding("escape", "clear_filter", "Clear", show=False),
    ]

    def on_mount(self) -> None:
        self._items: list[_Item] = []
        self._filter = ""
        self._sort_idx = -1
        self._sort_desc = False
        self.query_one("#tp-table", DataTable).add_columns(*self.COLUMNS)
        self.query_one("#tp-filter", Input).display = False
        self.query_one("#tp-empty", Static).display = False

    def compose(self) -> ComposeResult:
        yield Static(self.TITLE, classes="pane-title", id="tp-title")
        yield from self.extra_widgets()
        yield Input(placeholder="filter… (esc to clear)", id="tp-filter")
        yield DataTable(id="tp-table", zebra_stripes=True, cursor_type="row")
        yield Static("", id="tp-empty")

    # ── subclass hooks ───────────────────────────────────────────────────────
    def extra_widgets(self) -> Iterable[Widget]:
        """Optional widgets between the title and the filter (e.g. a stats line)."""
        return ()

    async def fetch(self, app: IndraTUI) -> list[dict[str, Any]]:
        raise NotImplementedError

    def extract(self, raw: dict[str, Any]) -> tuple[str, list[Any]]:
        raise NotImplementedError

    async def fetch_detail(self, app: IndraTUI, row_id: str) -> tuple[str, Any] | None:
        return None

    # ── engine ───────────────────────────────────────────────────────────────
    def _tui(self) -> IndraTUI:
        return cast("IndraTUI", self.app)

    async def refresh_view(self, app: IndraTUI) -> None:
        rows = await self.fetch(app)
        items: list[_Item] = []
        for raw in rows:
            rid, cells = self.extract(raw)
            ftext = " ".join(
                c.plain if isinstance(c, Text) else str(c) for c in cells
            ).lower()
            items.append((rid, raw, cells, ftext))
        self._items = items
        self._rebuild()

    def _rebuild(self) -> None:
        rows = self._items
        if self._filter:
            rows = [r for r in rows if self._filter in r[3]]
        if 0 <= self._sort_idx < len(self.SORTS):
            key = self.SORTS[self._sort_idx][1]
            rows = sorted(rows, key=lambda r: _sortval(r[1].get(key)), reverse=self._sort_desc)

        table = self.query_one("#tp-table", DataTable)
        empty = self.query_one("#tp-empty", Static)
        table.clear()
        if not rows:
            table.display = False
            empty.display = True
            msg = "no rows match filter" if self._filter else self.EMPTY
            empty.update(f"[{theme.INK_TERTIARY}]{msg}[/]")
        else:
            empty.display = False
            table.display = True
            for rid, _raw, cells, _f in rows:
                table.add_row(*cells, key=rid)
        self._update_title()

    def _update_title(self) -> None:
        parts = [self.TITLE]
        if 0 <= self._sort_idx < len(self.SORTS):
            arrow = "▼" if self._sort_desc else "▲"
            parts.append(f"↕ {self.SORTS[self._sort_idx][0]} {arrow}")
        if self._filter:
            parts.append(f"/{self._filter}")
        self.query_one("#tp-title", Static).update("   ".join(parts))

    # ── actions ──────────────────────────────────────────────────────────────
    def activate(self) -> None:
        self.query_one("#tp-table", DataTable).focus()

    def action_filter(self) -> None:
        inp = self.query_one("#tp-filter", Input)
        inp.display = True
        inp.focus()

    def action_clear_filter(self) -> None:
        inp = self.query_one("#tp-filter", Input)
        inp.value = ""
        inp.display = False
        self._filter = ""
        self._rebuild()
        self.query_one("#tp-table", DataTable).focus()

    def action_sort(self) -> None:
        if self._sort_idx == -1:
            self._sort_idx, self._sort_desc = 0, False
        elif not self._sort_desc:
            self._sort_desc = True
        else:
            self._sort_idx += 1
            self._sort_desc = False
            if self._sort_idx >= len(self.SORTS):
                self._sort_idx = -1
        self._rebuild()

    @on(Input.Changed, "#tp-filter")
    def _on_filter(self, event: Input.Changed) -> None:
        self._filter = event.value.strip().lower()
        self._rebuild()

    @on(Input.Submitted, "#tp-filter")
    def _on_filter_submit(self) -> None:
        self.query_one("#tp-table", DataTable).focus()

    @on(DataTable.RowSelected, "#tp-table")
    async def _on_row(self, event: DataTable.RowSelected) -> None:
        rid = event.row_key.value
        if rid is None:
            return
        result = await self.fetch_detail(self._tui(), str(rid))
        if result is not None:
            title, data = result
            self.app.push_screen(DetailModal(title, data))
