"""LoginModal — email/password prompt when no valid token is cached."""

from __future__ import annotations

from textual import on
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.screen import ModalScreen
from textual.widgets import Button, Input, Label, Static

from indra.tui.client import IndraClient


class LoginModal(ModalScreen[bool]):
    BINDINGS = [("escape", "app.quit", "Quit")]

    def __init__(self, client: IndraClient, default_email: str = "aiadmin@indra.os") -> None:
        super().__init__()
        self._client = client
        self._default_email = default_email

    def compose(self) -> ComposeResult:
        with Vertical(id="login-box"):
            yield Label("INDRA · SIGN IN", id="login-title")
            yield Input(value=self._default_email, placeholder="email", id="login-email")
            yield Input(placeholder="password", password=True, id="login-pass")
            yield Static("", id="login-err")
            yield Button("Connect", variant="primary", id="login-go")

    def on_mount(self) -> None:
        self.query_one("#login-pass", Input).focus()

    @on(Button.Pressed, "#login-go")
    @on(Input.Submitted)
    async def _submit(self) -> None:
        email = self.query_one("#login-email", Input).value.strip()
        password = self.query_one("#login-pass", Input).value
        err = self.query_one("#login-err", Static)
        err.update("[#637585]connecting…[/]")
        ok = await self._client.login(email, password)
        if ok:
            self.dismiss(True)
        else:
            err.update("[#e04040]login failed — check credentials / API[/]")
            self.query_one("#login-pass", Input).value = ""
