"""IndraClient — async httpx wrapper over the read-only INDRA REST API.

Logs in once (POST /auth/login), caches the Bearer JWT to ~/.indra/tui.json, and
exposes typed GET wrappers. Every call degrades gracefully: on a network error it
returns None and flips `connected` False; on 401 it clears the token and flags
`needs_login` so the app can re-prompt. Only one non-GET call exists (login).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx

_CACHE = Path.home() / ".indra" / "tui.json"


class IndraClient:
    def __init__(self, base_url: str, token: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self._token: str | None = token
        self._http = httpx.AsyncClient(base_url=self.base_url, timeout=6.0)
        self.connected = False
        self.needs_login = False

    @property
    def has_token(self) -> bool:
        return bool(self._token)

    def load_cache(self) -> None:
        """Load a cached token if we don't already have one (from --token/env)."""
        if self._token:
            return
        try:
            data = json.loads(_CACHE.read_text(encoding="utf-8"))
            self._token = str(data.get("token") or "") or None
        except (OSError, ValueError):
            self._token = None

    def _save_cache(self) -> None:
        try:
            _CACHE.parent.mkdir(parents=True, exist_ok=True)
            _CACHE.write_text(json.dumps({"token": self._token}), encoding="utf-8")
        except OSError:
            pass

    async def login(self, email: str, password: str) -> bool:
        try:
            r = await self._http.post(
                "/api/v1/auth/login", json={"email": email, "password": password}
            )
        except httpx.HTTPError:
            return False
        if r.status_code != 200:
            return False
        try:
            token = str(r.json().get("access_token") or "") or None
        except ValueError:
            return False
        if not token:
            return False
        self._token = token
        self.needs_login = False
        self.connected = True
        self._save_cache()
        return True

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any | None:
        if not self._token:
            self.needs_login = True
            return None
        try:
            r = await self._http.get(
                path, params=params, headers={"Authorization": f"Bearer {self._token}"}
            )
        except httpx.HTTPError:
            self.connected = False
            return None
        if r.status_code == 401:
            self._token = None
            self.needs_login = True
            self.connected = False
            return None
        self.connected = r.status_code == 200
        if r.status_code != 200:
            return None
        try:
            return r.json()
        except ValueError:
            return None

    # ── read-only endpoint wrappers ──────────────────────────────────────────
    async def dashboard(self) -> Any | None:
        return await self._get("/api/v1/dashboard")

    async def telemetry(self) -> Any | None:
        return await self._get("/api/v1/telemetry/metrics")

    async def overview(self) -> Any | None:
        return await self._get("/api/v1/intelligence/overview")

    async def discovery(self) -> Any | None:
        return await self._get("/api/v1/discovery/registry")

    async def agents(self) -> Any | None:
        return await self._get("/api/v1/agents", {"limit": 100})

    async def sessions(self) -> Any | None:
        return await self._get("/api/v1/sessions", {"limit": 100})

    async def tasks(self) -> Any | None:
        return await self._get("/api/v1/tasks", {"limit": 100})

    async def task_stats(self) -> Any | None:
        return await self._get("/api/v1/tasks/stats")

    async def notifications(self) -> Any | None:
        return await self._get("/api/v1/notifications", {"limit": 50})

    async def projects(self) -> Any | None:
        return await self._get("/api/v1/projects")

    async def raw(self, path: str) -> Any | None:
        """GET an arbitrary /api/v1 path — used by the per-deva detail view."""
        return await self._get(path)

    async def aclose(self) -> None:
        await self._http.aclose()
