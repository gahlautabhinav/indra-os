"""PluginManager — registry and lifecycle coordinator for all CLI adapters."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterator

from .base import AbstractPlugin, PluginHealthStatus, SessionInfo

log = logging.getLogger(__name__)


class PluginManager:
    """
    Singleton registry that owns all plugin instances.

    Usage:
        manager = PluginManager()
        manager.register(ClaudeCodePlugin())
        await manager.initialize_all()
        sessions = await manager.aggregate_sessions()
        await manager.shutdown_all()
    """

    def __init__(self) -> None:
        self._plugins: dict[str, AbstractPlugin] = {}

    # ── Registration ─────────────────────────────────────────────────────────

    def register(self, plugin: AbstractPlugin) -> None:
        if plugin.plugin_type in self._plugins:
            raise ValueError(
                f"Plugin '{plugin.plugin_type}' already registered. "
                "Call unregister() first."
            )
        self._plugins[plugin.plugin_type] = plugin
        log.info("Plugin registered: %s", plugin)

    def unregister(self, plugin_type: str) -> None:
        self._plugins.pop(plugin_type, None)

    def get(self, plugin_type: str) -> AbstractPlugin | None:
        return self._plugins.get(plugin_type)

    def __iter__(self) -> Iterator[AbstractPlugin]:
        return iter(self._plugins.values())

    def __len__(self) -> int:
        return len(self._plugins)

    @property
    def plugin_types(self) -> list[str]:
        return list(self._plugins.keys())

    # ── Lifecycle ────────────────────────────────────────────────────────────

    async def initialize_all(self) -> None:
        """Initialize all registered plugins concurrently."""
        async with asyncio.TaskGroup() as tg:
            for plugin in self._plugins.values():
                tg.create_task(self._safe_init(plugin))

    async def shutdown_all(self) -> None:
        """Shutdown all registered plugins concurrently."""
        async with asyncio.TaskGroup() as tg:
            for plugin in self._plugins.values():
                tg.create_task(self._safe_shutdown(plugin))

    async def _safe_init(self, plugin: AbstractPlugin) -> None:
        try:
            await plugin.initialize()
            log.info("Plugin initialized: %s", plugin.plugin_type)
        except Exception:
            log.exception("Plugin init failed: %s", plugin.plugin_type)

    async def _safe_shutdown(self, plugin: AbstractPlugin) -> None:
        try:
            await plugin.shutdown()
        except Exception:
            log.exception("Plugin shutdown error: %s", plugin.plugin_type)

    # ── Aggregation ──────────────────────────────────────────────────────────

    async def aggregate_sessions(
        self,
        limit: int = 50,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        """
        Gather sessions from all plugins concurrently.
        Returns merged list sorted by started_at descending.
        """
        plugins = list(self._plugins.values())
        if not plugins:
            return []

        async def _fetch(plugin: AbstractPlugin) -> list[SessionInfo]:
            try:
                return await plugin.list_sessions(limit=limit, active_only=active_only)
            except Exception:
                log.exception("aggregate_sessions failed for %s", plugin.plugin_type)
                return []

        groups: list[list[SessionInfo]] = await asyncio.gather(
            *(_fetch(p) for p in plugins)
        )
        merged = [s for group in groups for s in group]
        merged.sort(key=lambda s: s.started_at, reverse=True)
        return merged[:limit]

    async def health_summary(self) -> dict[str, PluginHealthStatus]:
        """Return {plugin_type: status} for all plugins concurrently."""
        plugins = list(self._plugins.values())
        if not plugins:
            return {}

        async def _check(plugin: AbstractPlugin) -> tuple[str, PluginHealthStatus]:
            try:
                return plugin.plugin_type, await plugin.health_check()
            except Exception:
                log.exception("health_check failed for %s", plugin.plugin_type)
                return plugin.plugin_type, PluginHealthStatus.UNKNOWN

        pairs: list[tuple[str, PluginHealthStatus]] = await asyncio.gather(
            *(_check(p) for p in plugins)
        )
        return dict(pairs)

    async def poll_all(self) -> dict[str, list[SessionInfo]]:
        """
        Background poller calls this every N seconds.
        Returns {plugin_type: [active sessions]} for diff computation.
        """
        plugins = list(self._plugins.values())
        if not plugins:
            return {}

        async def _poll(plugin: AbstractPlugin) -> tuple[str, list[SessionInfo]]:
            try:
                return plugin.plugin_type, await plugin.poll_once()
            except Exception:
                log.exception("poll_once failed for %s", plugin.plugin_type)
                return plugin.plugin_type, []

        pairs: list[tuple[str, list[SessionInfo]]] = await asyncio.gather(
            *(_poll(p) for p in plugins)
        )
        return dict(pairs)


# Module-level singleton — imported by main.py lifespan and domain routers
plugin_manager = PluginManager()
