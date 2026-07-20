"""HelpModal — full keymap overlay (`?`)."""

from __future__ import annotations

from rich.text import Text
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.screen import ModalScreen
from textual.widgets import Static

from indra.tui import theme

_KEYS: list[tuple[str, str]] = [
    ("1 – 6", "switch screen (Command · Devas · Agents · Sessions · Tasks · Brain)"),
    ("↑ / ↓", "move cursor (list / table rows)"),
    ("enter", "open detail (deva · agent · session · task · project)"),
    ("/", "filter rows / devas — esc clears"),
    ("s", "cycle sort column + direction (tables)"),
    ("r", "refresh now"),
    ("p", "pause / resume auto-refresh"),
    ("+ / -", "faster / slower refresh"),
    ("?", "this help"),
    ("q", "quit (or close a modal)"),
]


class HelpModal(ModalScreen[None]):
    BINDINGS = [
        ("escape", "dismiss", "Close"),
        ("question_mark", "dismiss", "Close"),
        ("q", "dismiss", "Close"),
    ]

    def compose(self) -> ComposeResult:
        body = Text()
        for key, desc in _KEYS:
            body.append(f"  {key:<9}", style=f"bold {theme.ACCENT}")
            body.append(f"{desc}\n", style=theme.INK_SECONDARY)
        with Vertical(id="help-box"):
            yield Static(f"[{theme.ACCENT}]INDRA · KEYS[/]", id="help-title")
            yield Static(body, id="help-body")
            yield Static(f"[{theme.INK_TERTIARY}]esc / q to close[/]", id="help-hint")
