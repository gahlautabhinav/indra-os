"""Sessions — CLI sessions table; Enter → session events."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any

from rich.text import Text

from indra.tui import theme
from indra.tui.screens.table import TablePane

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


class SessionsPane(TablePane):
    TITLE = "SESSIONS"
    COLUMNS = ["PLUGIN", "PROJECT", "STATUS", "TOKENS", "COST", "EVENTS", "STARTED"]
    SORTS = [
        ("plugin", "plugin_type"),
        ("status", "status"),
        ("tokens", "token_count"),
        ("cost", "cost_usd"),
        ("events", "event_count"),
    ]
    EMPTY = "no sessions yet — run a CLI (Claude Code / Codex / …); the poller mirrors it ~30s"

    async def fetch(self, app: IndraTUI) -> list[dict[str, Any]]:
        data = await app.client.sessions() or {}
        return list(data.get("sessions") or [])

    def extract(self, raw: dict[str, Any]) -> tuple[str, list[Any]]:
        st = str(raw.get("status", ""))
        proj = str(raw.get("project_path") or "")
        rid = str(raw.get("id") or "")
        cells = [
            str(raw.get("plugin_type", "—")),
            os.path.basename(proj.rstrip("/\\")) or "—",
            Text(st, style=theme.status_color(st)),
            f"{int(raw.get('token_count', 0) or 0):,}",
            f"${float(raw.get('cost_usd', 0) or 0):.2f}",
            str(raw.get("event_count", 0)),
            str(raw.get("started_at") or "—")[:19],
        ]
        return rid, cells

    async def fetch_detail(self, app: IndraTUI, row_id: str) -> tuple[str, Any] | None:
        events = await app.client.raw(f"/api/v1/sessions/{row_id}/events")
        return f"SESSION · {row_id[:8]}", events
