"""
Somaḥ router — MCP server discovery and health endpoints.
VASU domain: Infrastructure layer.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from indra.plugins.adapters.mcp_server.reader import discover_mcp_servers, ping_mcp_server

router = APIRouter()


class MCPServerInfo(BaseModel):
    name: str
    transport: str
    endpoint: str | None
    status: str
    latency_ms: float | None
    tool_count: int


class MCPServerListResponse(BaseModel):
    servers: list[MCPServerInfo]
    total: int


@router.get("/mcp/servers", response_model=MCPServerListResponse, tags=["mcp"])
async def list_mcp_servers() -> MCPServerListResponse:
    """
    Discover and probe all configured MCP servers.
    Reads from Claude Desktop / Claude Code config files.
    """
    import asyncio
    raw_servers = discover_mcp_servers()

    async def _probe(srv: dict) -> MCPServerInfo:
        loop = asyncio.get_running_loop()
        probe = await loop.run_in_executor(None, ping_mcp_server, srv)
        return MCPServerInfo(
            name=srv["name"],
            transport=srv.get("transport", "unknown"),
            endpoint=srv.get("endpoint"),
            status=probe["status"],
            latency_ms=probe["latency_ms"],
            tool_count=0,  # MCP tool enumeration is Phase 2
        )

    results = await asyncio.gather(*(_probe(s) for s in raw_servers))

    return MCPServerListResponse(
        servers=list(results),
        total=len(results),
    )
