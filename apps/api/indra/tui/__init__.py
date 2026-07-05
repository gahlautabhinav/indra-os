"""INDRA-OS terminal UI — a btop/lazyvim-grade dashboard over the read-only REST API.

Pure client: logs in once, polls /api/v1/* with a Bearer JWT, renders. No backend
changes. Run: `py -3.14 -m indra.tui` (or `indra-tui`).
"""
