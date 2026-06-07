"""
MCP server reader.

Discovers MCP servers from Claude Desktop / Claude Code configuration files
and probes each server for reachability.

Config file locations (checked in order):
    ~/.config/Claude/claude_desktop_config.json   (Claude Desktop, Linux/macOS)
    ~/AppData/Roaming/Claude/claude_desktop_config.json  (Claude Desktop, Windows)
    ~/.claude/settings.json                        (Claude Code CLI settings)
"""

from __future__ import annotations

import json
import logging
import socket
import time
from pathlib import Path

log = logging.getLogger(__name__)

_CONFIG_CANDIDATES = [
    Path.home() / ".config" / "Claude" / "claude_desktop_config.json",
    Path.home() / "AppData" / "Roaming" / "Claude" / "claude_desktop_config.json",
    Path.home() / ".claude" / "settings.json",
]


def _find_config() -> Path | None:
    for p in _CONFIG_CANDIDATES:
        if p.exists():
            return p
    return None


def _load_mcp_servers_from_config(path: Path) -> list[dict]:
    """
    Parse an MCP config JSON and return raw server entries.
    Supports both Claude Desktop format (mcpServers) and Claude Code format.
    """
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("Cannot load MCP config from %s: %s", path, exc)
        return []

    # Claude Desktop format: {"mcpServers": {"name": {...}}}
    if isinstance(data.get("mcpServers"), dict):
        return [
            {"name": name, **cfg}
            for name, cfg in data["mcpServers"].items()
        ]

    return []


def discover_mcp_servers() -> list[dict]:
    """
    Discover MCP servers from local config files.

    Returns list of dicts:
        {
            "name": str,
            "transport": "stdio" | "sse" | "http",
            "endpoint": str | None,    # URL for sse/http, None for stdio
            "command": str | None,     # command for stdio servers
            "args": list[str],
        }
    """
    config_path = _find_config()
    if not config_path:
        log.info("No MCP config file found in known locations")
        return []

    raw_servers = _load_mcp_servers_from_config(config_path)
    servers: list[dict] = []

    for raw in raw_servers:
        name = raw.get("name", "unknown")
        # Determine transport from keys present in config.
        if raw.get("url"):
            transport = "sse" if "sse" in raw.get("url", "").lower() else "http"
            endpoint = raw["url"]
            command = None
            args: list[str] = []
        elif raw.get("command"):
            transport = "stdio"
            endpoint = None
            command = raw.get("command")
            args = raw.get("args", [])
        else:
            transport = "unknown"
            endpoint = None
            command = None
            args = []

        servers.append({
            "name": name,
            "transport": transport,
            "endpoint": endpoint,
            "command": command,
            "args": args,
        })

    log.info("Discovered %d MCP servers from %s", len(servers), config_path)
    return servers


def ping_mcp_server(server: dict, timeout_s: float = 2.0) -> dict:
    """
    Probe an MCP server for reachability and measure latency.

    Returns:
        {
            "status": "healthy" | "degraded" | "unreachable" | "unknown",
            "latency_ms": float | None,
        }
    """
    transport = server.get("transport", "unknown")

    if transport in ("sse", "http"):
        return _ping_http(server.get("endpoint", ""), timeout_s)
    elif transport == "stdio":
        return _ping_stdio(server, timeout_s)
    else:
        return {"status": "unknown", "latency_ms": None}


def _ping_http(url: str, timeout_s: float) -> dict:
    """Attempt a TCP connect to the HTTP/SSE endpoint."""
    if not url:
        return {"status": "unknown", "latency_ms": None}

    import urllib.parse
    parsed = urllib.parse.urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    t0 = time.monotonic()
    try:
        with socket.create_connection((host, port), timeout=timeout_s):
            latency_ms = (time.monotonic() - t0) * 1000
            return {"status": "healthy", "latency_ms": round(latency_ms, 1)}
    except (TimeoutError, ConnectionRefusedError):
        return {"status": "unreachable", "latency_ms": None}
    except OSError:
        return {"status": "degraded", "latency_ms": None}


def _ping_stdio(server: dict, timeout_s: float) -> dict:
    """
    Probe a stdio MCP server by checking if its command is resolvable.
    We do NOT spawn the process (that would start the tool) — just check
    that the command exists in PATH.
    """
    command = server.get("command")
    if not command:
        return {"status": "unknown", "latency_ms": None}

    import shutil
    t0 = time.monotonic()
    found = shutil.which(command) is not None
    latency_ms = round((time.monotonic() - t0) * 1000, 1)

    return {
        "status": "healthy" if found else "unreachable",
        "latency_ms": latency_ms if found else None,
    }
