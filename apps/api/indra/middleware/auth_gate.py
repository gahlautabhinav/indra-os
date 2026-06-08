"""
Auth gate middleware.

Rejects unauthenticated requests to protected /api/v1 endpoints with 401 so the
REST surface is not browsable without a session token. Public paths (login,
health, docs, CORS preflight, websockets) pass through. This is a lightweight
JWT-validity check; per-route `get_current_user` still performs the DB/is_active
lookup where a concrete user identity is needed.
"""

from __future__ import annotations

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from indra.config import settings

# Exact paths or prefixes that never require a token.
_PUBLIC_PREFIXES = (
    "/api/v1/auth/",   # login / token issuance
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
)


def _is_public(path: str) -> bool:
    # Only /api/v1/* is gated; everything else (static, ws upgrade, root) is open.
    if not path.startswith("/api/v1"):
        return True
    return any(path.startswith(p) for p in _PUBLIC_PREFIXES)


class AuthGateMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # CORS preflight carries no auth header by design.
        if request.method == "OPTIONS" or _is_public(request.url.path):
            return await call_next(request)

        auth = request.headers.get("Authorization", "")
        token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        if not token:
            return _unauthorized("Authentication required")

        try:
            jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        except JWTError:
            return _unauthorized("Invalid or expired token")

        return await call_next(request)


def _unauthorized(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"error": "unauthorized", "message": message},
        headers={"WWW-Authenticate": "Bearer"},
    )
