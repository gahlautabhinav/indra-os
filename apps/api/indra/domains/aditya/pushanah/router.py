"""Pushanah — Discovery. ADITYA domain.

Pūṣan (पूषन्) = the guide who knows all paths and finds what is lost. Surfaces
the discovery registry: every reachable plugin, MCP server, and agent the system
can route to. Computed live from plugin_manager + DB.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.agent import Agent
from indra.models.mcp_server import MCPServer

router = APIRouter()

_DEVA = "pushanah"


@router.get("/discovery/registry", tags=["pushanah"])
async def discovery_registry(db: AsyncSession = Depends(get_db)) -> dict:
    from indra.plugins import plugin_manager

    health = await plugin_manager.health_summary()
    plugins = [
        {"type": pt, "kind": "plugin", "status": health.get(pt).value if health.get(pt) else "unknown"}
        for pt in plugin_manager.plugin_types
    ]

    mcp_rows = list((await db.execute(select(MCPServer))).scalars())
    mcp = [
        {"name": m.name, "kind": "mcp_server", "status": m.status, "transport": m.transport}
        for m in mcp_rows
    ]

    active_agents = await db.scalar(
        select(func.count()).select_from(Agent).where(Agent.status.in_(["active", "running"]))
    ) or 0

    return {
        "deva": _DEVA,
        "plugins": plugins,
        "mcp_servers": mcp,
        "counts": {
            "plugins": len(plugins),
            "mcp_servers": len(mcp),
            "active_agents": int(active_agents),
            "reachable_total": len(plugins) + len(mcp) + int(active_agents),
        },
    }
