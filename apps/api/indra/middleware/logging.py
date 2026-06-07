"""
Request timing + structured logging middleware.
Logs method, path, status_code, duration_ms, and request_id for every request.
"""

from __future__ import annotations

import time

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger()

_SKIP_PATHS = frozenset({"/health", "/docs", "/openapi.json", "/redoc"})


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        request_id = getattr(request.state, "request_id", None)

        log = logger.bind(
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
            **({"request_id": request_id} if request_id else {}),
        )

        if response.status_code >= 500:
            log.error("request_error")
        elif response.status_code >= 400:
            log.warning("request_client_error")
        else:
            log.info("request_ok")

        return response
