from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from indra.config import settings
from indra.core.exceptions import IndraException
from indra.core.telemetry import setup_telemetry
from indra.database import engine
from indra.redis import close_redis, get_redis

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    from indra.plugins import ClaudeCodePlugin, plugin_manager

    logger.info("INDRA starting", environment=settings.environment)

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
    from indra.domains.indra.router import router as indra_router
    from indra.websockets.router import router as ws_router
    from indra.core.auth import router as auth_router

    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(indra_router, prefix="/api/v1", tags=["indra"])
    app.include_router(ws_router, tags=["websocket"])

    @app.get("/health", tags=["system"])
    async def health() -> dict:
        return {"status": "ok", "version": "0.1.0", "devas": 33}


app = create_app()
