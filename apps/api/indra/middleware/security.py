"""
Security headers middleware.
Adds hardening headers to every response + injects X-Request-ID.
"""

from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from indra.config import settings

_ALWAYS_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}

_PRODUCTION_HEADERS = {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        response: Response = await call_next(request)

        response.headers["X-Request-ID"] = request_id

        for header, value in _ALWAYS_HEADERS.items():
            response.headers[header] = value

        if not settings.is_development:
            for header, value in _PRODUCTION_HEADERS.items():
                response.headers[header] = value

        return response
