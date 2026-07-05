"""Entry point: `py -3.14 -m indra.tui` (or the `indra-tui` console script)."""

from __future__ import annotations

import argparse
import contextlib
import os
import sys


def main() -> None:
    # Braille/block glyphs (sparkline, gauges, banner) need UTF-8 on Windows conhost.
    for stream in (sys.stdout, sys.stderr):
        with contextlib.suppress(Exception):
            stream.reconfigure(encoding="utf-8")  # type: ignore[union-attr]

    p = argparse.ArgumentParser(prog="indra-tui", description="INDRA-OS terminal dashboard")
    p.add_argument("--host", default="localhost", help="API host (default localhost)")
    p.add_argument("--port", type=int, default=8333, help="API port (default 8333)")
    p.add_argument("--interval", type=float, default=2.0, help="refresh seconds (default 2)")
    p.add_argument("--token", default=os.environ.get("INDRA_TUI_TOKEN"), help="Bearer JWT")
    p.add_argument("--email", help="login email (non-interactive)")
    p.add_argument("--password", help="login password (non-interactive)")
    args = p.parse_args()

    from indra.tui.app import IndraTUI

    cli_login = (args.email, args.password) if args.email and args.password else None
    app = IndraTUI(
        base_url=f"http://{args.host}:{args.port}",
        interval=args.interval,
        token=args.token,
        cli_login=cli_login,
    )
    app.run()


if __name__ == "__main__":
    main()
