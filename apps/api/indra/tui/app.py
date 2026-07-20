"""IndraTUI — the root app: header, connection line, 6 content panes, footer.

Polls /dashboard + /telemetry every tick (cheap, feeds header + sparkline), then
refreshes only the active pane. Auth is bootstrapped once (cached token or login
modal); a mid-run 401 re-prompts. Every fetch degrades gracefully.
"""

from __future__ import annotations

import contextlib
from collections import deque
from typing import Any

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.timer import Timer
from textual.widgets import ContentSwitcher, Footer, Header, Static

from indra.tui import theme
from indra.tui.client import IndraClient
from indra.tui.screens.agents import AgentsPane
from indra.tui.screens.base import Pane
from indra.tui.screens.brain import BrainPane
from indra.tui.screens.command import CommandPane
from indra.tui.screens.devas import DevaPane
from indra.tui.screens.sessions import SessionsPane
from indra.tui.screens.tasks import TasksPane
from indra.tui.widgets.help_modal import HelpModal
from indra.tui.widgets.login_modal import LoginModal

_PANES: list[tuple[str, type[Pane]]] = [
    ("command", CommandPane),
    ("devas", DevaPane),
    ("agents", AgentsPane),
    ("sessions", SessionsPane),
    ("tasks", TasksPane),
    ("brain", BrainPane),
]


class IndraTUI(App[None]):
    CSS_PATH = "indra.tcss"
    TITLE = "INDRA"
    SUB_TITLE = "Agentic OS"
    BINDINGS = [
        Binding("1", "show('command')", "Command"),
        Binding("2", "show('devas')", "Devas"),
        Binding("3", "show('agents')", "Agents"),
        Binding("4", "show('sessions')", "Sessions"),
        Binding("5", "show('tasks')", "Tasks"),
        Binding("6", "show('brain')", "Brain"),
        Binding("r", "refresh", "Refresh"),
        Binding("p", "pause", "Pause"),
        Binding("plus", "faster", "Faster"),
        Binding("minus", "slower", "Slower"),
        Binding("equals_sign", "faster", "Faster", show=False),
        Binding("question_mark", "help", "Help"),
        Binding("q", "quit", "Quit"),
    ]

    client: IndraClient

    def __init__(
        self,
        base_url: str,
        interval: float = 2.0,
        token: str | None = None,
        cli_login: tuple[str, str] | None = None,
    ) -> None:
        super().__init__()
        self._base_url = base_url
        self._interval = interval
        self._token_arg = token
        self._cli_login = cli_login
        self.last_dashboard: dict[str, Any] | None = None
        self.last_telemetry: dict[str, Any] | None = None
        self.history: dict[str, deque[float]] = {"burn": deque([0.0], maxlen=90)}
        self._modal_open = False
        self._paused = False
        self._timer: Timer | None = None

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield Static("", id="conn")
        with ContentSwitcher(initial="command", id="switch"):
            for pid, cls in _PANES:
                yield cls(id=pid)
        yield Footer()

    def on_mount(self) -> None:
        self.client = IndraClient(self._base_url, token=self._token_arg)
        self.run_worker(self._bootstrap(), exclusive=True, group="boot")

    async def _bootstrap(self) -> None:
        self.client.load_cache()
        if not self.client.has_token and self._cli_login is not None:
            await self.client.login(*self._cli_login)
        if not self.client.has_token:
            await self._prompt_login()
        await self._tick()
        self._timer = self.set_interval(self._interval, self._schedule_tick)

    async def _prompt_login(self) -> None:
        self._modal_open = True
        await self.push_screen_wait(LoginModal(self.client))
        self._modal_open = False

    def _schedule_tick(self) -> None:
        self.run_worker(self._tick(), exclusive=True, group="tick")

    async def _tick(self) -> None:
        if self._paused:
            self._update_conn()
            return
        if self.client.needs_login and not self._modal_open:
            await self._prompt_login()
        d = await self.client.dashboard()
        t = await self.client.telemetry()
        if d is not None:
            self.last_dashboard = d
        if t is not None:
            self.last_telemetry = t
        burn = (d or {}).get("token_burn_rate")
        if isinstance(burn, (int, float)):
            self.history["burn"].append(float(burn))
        self._update_conn()
        await self._refresh_active()

    def _active_pane(self) -> Pane | None:
        cur = self.query_one("#switch", ContentSwitcher).current
        if not cur:
            return None
        node = self.query_one(f"#{cur}")
        return node if isinstance(node, Pane) else None

    async def _refresh_active(self) -> None:
        pane = self._active_pane()
        if pane is None:
            return
        # A pane fetch hiccup must never kill the tick loop.
        with contextlib.suppress(Exception):
            await pane.refresh_view(self)

    def _update_conn(self) -> None:
        ok = self.client.connected
        if self._paused:
            dot, label = theme.STATE["degraded"], "PAUSED"
        elif ok:
            dot, label = theme.STATE["healthy"], "CONNECTED"
        else:
            dot, label = theme.STATE["critical"], "RECONNECTING…"
        self.query_one("#conn", Static).update(
            f"[{dot}]●[/] [{theme.INK_SECONDARY}]{label}[/] "
            f"[{theme.INK_TERTIARY}]{self._base_url} · refresh {self._interval:g}s · ? help[/]"
        )

    def action_show(self, pane: str) -> None:
        self.query_one("#switch", ContentSwitcher).current = pane
        node = self._active_pane()
        if node is not None:
            node.activate()
        self.run_worker(self._refresh_active(), exclusive=True, group="tick")

    def action_refresh(self) -> None:
        self.run_worker(self._tick(), exclusive=True, group="tick")

    def action_help(self) -> None:
        self.push_screen(HelpModal())

    def action_pause(self) -> None:
        self._paused = not self._paused
        self._update_conn()

    def action_faster(self) -> None:
        self._set_interval(max(0.5, round(self._interval - 0.5, 1)))

    def action_slower(self) -> None:
        self._set_interval(min(10.0, round(self._interval + 0.5, 1)))

    def _set_interval(self, value: float) -> None:
        self._interval = value
        if self._timer is not None:
            self._timer.stop()
        self._timer = self.set_interval(self._interval, self._schedule_tick)
        self._update_conn()

    async def on_unmount(self) -> None:
        await self.client.aclose()
