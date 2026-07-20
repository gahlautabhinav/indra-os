"""Agents — status-colored table; Enter → profile + lineage."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rich.text import Text

from indra.tui import theme
from indra.tui.screens.table import TablePane

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


class AgentsPane(TablePane):
    TITLE = "AGENTS"
    COLUMNS = ["NAME", "TYPE", "STATUS", "DOMAIN", "TOKENS", "COST", "SESSION"]
    SORTS = [("name", "name"), ("status", "status"), ("tokens", "token_count"), ("cost", "cost_usd")]
    EMPTY = "no agents — start a CLI session and they appear here"

    async def fetch(self, app: IndraTUI) -> list[dict[str, Any]]:
        data = await app.client.agents() or {}
        return list(data.get("agents") or [])

    def extract(self, raw: dict[str, Any]) -> tuple[str, list[Any]]:
        st = str(raw.get("status", ""))
        rid = str(raw.get("id") or raw.get("name") or "")
        cells = [
            str(raw.get("name", "—")),
            str(raw.get("type", "—")),
            Text(st, style=theme.status_color(st)),
            str(raw.get("domain", "—")),
            f"{int(raw.get('token_count', 0) or 0):,}",
            f"${float(raw.get('cost_usd', 0) or 0):.2f}",
            str(raw.get("session_id") or "—")[:8],
        ]
        return rid, cells

    async def fetch_detail(self, app: IndraTUI, row_id: str) -> tuple[str, Any] | None:
        profile = await app.client.raw(f"/api/v1/agents/{row_id}/profile")
        lineage = await app.client.raw(f"/api/v1/agents/{row_id}/lineage")
        return f"AGENT · {row_id[:8]}", {"profile": profile, "lineage": lineage}
