"""Command — the hero screen: banner, metric tiles, host gauges, burn sparkline, alerts."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Sparkline, Static

from indra.tui import theme
from indra.tui.banner import INDRA_ASCII, TAGLINE
from indra.tui.screens.base import Pane
from indra.tui.widgets.alerts import AlertsFeed
from indra.tui.widgets.gauge import HostGauge
from indra.tui.widgets.metric_tile import MetricTile

if TYPE_CHECKING:
    from indra.tui.app import IndraTUI


def _burn(n: float) -> tuple[str, str]:
    if n >= 1000:
        return f"{n / 1000:.1f}", "k tok/min"
    return f"{n:.0f}", "tok/min"


class CommandPane(Pane):
    def compose(self) -> ComposeResult:
        yield Static(
            f"[{theme.ACCENT}]{INDRA_ASCII}[/]\n[{theme.INK_TERTIARY}]{TAGLINE}[/]",
            id="banner",
        )
        with Horizontal(id="tiles"):
            yield MetricTile("Agents", unit="live", id="m-agents")
            yield MetricTile("Tasks", unit="running", id="m-tasks")
            yield MetricTile("Burn", unit="tok/min", id="m-burn")
            yield MetricTile("Cost", unit="$ today", id="m-cost")
            yield MetricTile("Health", unit="% up", id="m-health")
            yield MetricTile("Sessions", unit="active", id="m-sessions")
        with Horizontal(id="cmd-mid"):
            with Vertical(id="host-box"):
                yield Static("HOST", classes="pane-title")
                yield HostGauge("CPU", id="g-cpu")
                yield HostGauge("MEM", id="g-mem")
                yield Static("", id="host-extra")
            with Vertical(id="spark-box"):
                yield Static("TOKEN BURN", classes="pane-title")
                yield Sparkline([0.0], summary_function=max, id="burn-spark")
        with Vertical(id="alerts-box"):
            yield Static("ALERTS", classes="pane-title")
            yield AlertsFeed(id="alerts")

    async def refresh_view(self, app: IndraTUI) -> None:
        d: dict[str, Any] = app.last_dashboard or {}
        t: dict[str, Any] = app.last_telemetry or {}
        host: dict[str, Any] = t.get("host") or {}
        wl: dict[str, Any] = t.get("workload") or {}

        self.query_one("#m-agents", MetricTile).update(str(d.get("active_agents", 0)))
        self.query_one("#m-tasks", MetricTile).update(str(d.get("running_tasks", 0)))
        bval, bunit = _burn(float(d.get("token_burn_rate", 0) or 0))
        self.query_one("#m-burn", MetricTile).update(bval, bunit)
        self.query_one("#m-cost", MetricTile).update(
            f"{float(d.get('total_cost_today', 0) or 0):.2f}"
        )
        health = float(d.get("system_health", 0) or 0)
        if health <= 1.0:
            health *= 100
        self.query_one("#m-health", MetricTile).update(f"{health:.0f}")
        self.query_one("#m-sessions", MetricTile).update(str(d.get("active_sessions", 0)))

        self.query_one("#g-cpu", HostGauge).set_pct(host.get("cpu_percent", 0) or 0)
        self.query_one("#g-mem", HostGauge).set_pct(host.get("memory_percent", 0) or 0)
        self.query_one("#host-extra", Static).update(
            f"[{theme.INK_TERTIARY}]{host.get('memory_used_gb', '—')}/"
            f"{host.get('memory_total_gb', '—')} GB · {host.get('process_count', '—')} procs · "
            f"{host.get('cpu_count', '—')} cores · {wl.get('total_traces', '—')} traces[/]"
        )

        self.query_one("#burn-spark", Sparkline).data = list(app.history["burn"]) or [0.0]
        self.query_one("#alerts", AlertsFeed).render_alerts(d.get("alerts") or [])
