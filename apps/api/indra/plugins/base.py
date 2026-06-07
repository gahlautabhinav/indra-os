"""AbstractPlugin ABC — canonical interface every CLI adapter must implement."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from enum import StrEnum


class PluginHealthStatus(StrEnum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNREACHABLE = "unreachable"
    UNKNOWN = "unknown"


@dataclass(frozen=True, slots=True)
class SessionInfo:
    """Lightweight session summary returned by list_sessions()."""

    id: str                          # plugin-local opaque ID
    project_path: str | None         # absolute path to project root
    started_at: str                  # ISO-8601
    status: str                      # "active" | "ended" | "error"
    plugin_type: str                 # e.g. "claude_code"
    token_count: int = 0
    cost_usd: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class SessionDetail(SessionInfo):
    """Full session with event list — returned by get_session()."""

    events: list[SessionEvent] = field(default_factory=list)
    ended_at: str | None = None


@dataclass(frozen=True, slots=True)
class SessionEvent:
    """Single turn/event within a session."""

    id: str
    event_type: str          # "user_message" | "assistant_message" | "tool_call" | "tool_result"
    content: str | None      # text content when applicable
    timestamp: str           # ISO-8601
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    metadata: dict = field(default_factory=dict)


class AbstractPlugin(ABC):
    """
    Every CLI adapter must subclass this and implement all abstract methods.

    Lifecycle:
        plugin = MyPlugin()
        await plugin.initialize()
        sessions = await plugin.list_sessions()
        detail = await plugin.get_session(sessions[0].id)
        events = [e async for e in plugin.stream_events(sessions[0].id)]
        await plugin.shutdown()
    """

    @property
    @abstractmethod
    def plugin_type(self) -> str:
        """Canonical type string — must match AgentType in @indra/types."""

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name shown in UI."""

    @property
    @abstractmethod
    def version(self) -> str:
        """Adapter version string."""

    # ── Lifecycle ────────────────────────────────────────────────────────────

    async def initialize(self) -> None:  # noqa: B027
        """Called once at startup. Override for connection setup."""

    async def shutdown(self) -> None:  # noqa: B027
        """Called on graceful shutdown. Override for cleanup."""

    # ── Core interface ────────────────────────────────────────────────────────

    @abstractmethod
    async def health_check(self) -> PluginHealthStatus:
        """Return current health of the plugin / backing CLI."""

    @abstractmethod
    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        active_only: bool = False,
    ) -> list[SessionInfo]:
        """List sessions, newest first."""

    @abstractmethod
    async def get_session(self, session_id: str) -> SessionDetail | None:
        """Return full session detail or None if not found."""

    @abstractmethod
    def stream_events(
        self,
        session_id: str,
        since_event_id: str | None = None,
    ) -> AsyncIterator[SessionEvent]:
        """
        Async-iterate events for a session.
        Must yield events in ascending timestamp order.
        If since_event_id given, yield only events after that ID.

        Subclass implementations must use `yield` to be async generators.
        AsyncGenerator[SessionEvent, None] satisfies AsyncIterator[SessionEvent].
        """
        raise NotImplementedError

    # ── Optional hooks ───────────────────────────────────────────────────────

    async def get_token_usage(self, session_id: str) -> tuple[int, float]:
        """Return (total_tokens, total_cost_usd) for session. Override for efficiency."""
        detail = await self.get_session(session_id)
        if detail is None:
            return 0, 0.0
        tokens = sum(e.input_tokens + e.output_tokens for e in detail.events)
        cost = sum(e.cost_usd for e in detail.events)
        return tokens, cost

    async def poll_once(self) -> list[SessionInfo]:
        """
        Called by the background poller every N seconds.
        Default: calls list_sessions(active_only=True).
        Override if the plugin has a more efficient change-detection mechanism.
        """
        return await self.list_sessions(active_only=True)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} type={self.plugin_type!r} v={self.version!r}>"
