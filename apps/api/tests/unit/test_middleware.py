"""Unit tests for security + logging middleware."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from starlette.requests import Request
from starlette.responses import JSONResponse

from indra.middleware.logging import RequestLoggingMiddleware
from indra.middleware.security import SecurityHeadersMiddleware


def _make_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/ping")
    async def ping() -> dict:
        return {"pong": True}

    @app.get("/echo-request-id")
    async def echo(request: Request) -> JSONResponse:
        return JSONResponse({"request_id": getattr(request.state, "request_id", None)})

    return app


def _client(app: FastAPI) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")  # type: ignore[arg-type]


@pytest.mark.anyio
async def test_security_headers_present() -> None:
    async with _client(_make_app()) as client:
        r = await client.get("/ping")
    assert r.status_code == 200
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["X-XSS-Protection"] == "1; mode=block"
    assert r.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


@pytest.mark.anyio
async def test_request_id_injected() -> None:
    async with _client(_make_app()) as client:
        r = await client.get("/echo-request-id")
    assert r.status_code == 200
    assert "X-Request-ID" in r.headers
    rid = r.headers["X-Request-ID"]
    assert len(rid) == 36  # UUID4 format
    assert r.json()["request_id"] == rid


@pytest.mark.anyio
async def test_no_hsts_in_development() -> None:
    async with _client(_make_app()) as client:
        r = await client.get("/ping")
    # HSTS is production-only; must not appear in development
    assert "Strict-Transport-Security" not in r.headers
