from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from indra.config import settings
from indra.core.exceptions import IndraException
from indra.core.rate_limit import limiter
from indra.core.telemetry import setup_telemetry
from indra.database import engine, get_db
from indra.middleware.logging import RequestLoggingMiddleware
from indra.middleware.security import SecurityHeadersMiddleware
from indra.redis import close_redis, get_redis

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    from indra.plugins import ClaudeCodePlugin, plugin_manager

    logger.info("INDRA starting", environment=settings.environment)

    settings.validate_production_secrets()

    setup_telemetry(app)

    redis = await get_redis()
    await redis.ping()
    logger.info("Redis connected")

    # Register and initialize CLI adapters.
    plugin_manager.register(ClaudeCodePlugin())
    await plugin_manager.initialize_all()
    logger.info("Plugins online: %s", plugin_manager.plugin_types)

    # Start background poller.
    from indra.core.poller import poller
    poller.start()

    logger.info("INDRA ready — 33 Devas online")
    yield

    poller.stop()
    await plugin_manager.shutdown_all()
    await close_redis()
    await engine.dispose()
    logger.info("INDRA shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="INDRA — Agentic OS",
        description="The Operating System for AI Workforces",
        version="0.1.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    # Rate limiter state
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # Middleware order: outermost first (processed top-to-bottom on request, bottom-to-top on response)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(IndraException)
    async def indra_exception_handler(request: Request, exc: IndraException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error_code, "message": exc.message, "domain": exc.domain},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "internal_error", "message": "An unexpected error occurred"},
        )

    _register_routers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    from indra.core.auth import router as auth_router
    from indra.domains.aditya.smriti.router import router as memory_router
    from indra.domains.indra.router import router as indra_router
    from indra.domains.rudra.pranah.router import router as pranah_router
    from indra.domains.vasu.somah.router import router as mcp_router
    from indra.domains.vasu.suryah.router import router as trace_router
    from indra.websockets.router import router as ws_router

    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(indra_router, prefix="/api/v1", tags=["indra"])
    app.include_router(mcp_router, prefix="/api/v1", tags=["mcp"])
    app.include_router(trace_router, prefix="/api/v1", tags=["traces"])
    app.include_router(memory_router, prefix="/api/v1", tags=["memory"])
    app.include_router(pranah_router, prefix="/api/v1", tags=["tasks"])
    app.include_router(ws_router, tags=["websocket"])

    @app.get("/health", tags=["system"])
    async def health(db: AsyncSession = Depends(get_db)) -> dict:
        checks: dict[str, str] = {}

        try:
            await db.execute(text("SELECT 1"))
            checks["db"] = "ok"
        except Exception:
            checks["db"] = "error"

        try:
            redis = await get_redis()
            await redis.ping()
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "error"

        all_ok = all(v == "ok" for v in checks.values())
        return {
            "status": "ok" if all_ok else "degraded",
            "version": "0.1.0",
            "devas": 33,
            "checks": checks,
        }


app = create_app()
