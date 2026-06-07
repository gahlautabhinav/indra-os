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
    from indra.plugins import (
        ClaudeCodePlugin,
        CodexCliPlugin,
        GeminiCliPlugin,
        KiroCliPlugin,
        OpenCodePlugin,
        plugin_manager,
    )

    logger.info("INDRA starting", environment=settings.environment)

    settings.validate_production_secrets()

    setup_telemetry(app)

    redis = await get_redis()
    await redis.ping()
    logger.info("Redis connected")

    # Register all CLI adapters — each gracefully handles its own absence.
    for plugin in [
        ClaudeCodePlugin(),
        GeminiCliPlugin(),
        CodexCliPlugin(),
        KiroCliPlugin(),
        OpenCodePlugin(),
    ]:
        plugin_manager.register(plugin)
    await plugin_manager.initialize_all()
    logger.info("Plugins online: %s", plugin_manager.plugin_types)

    # Start background poller.
    from indra.core.poller import poller
    poller.start()

    # Start APScheduler for Savita (ADITYA scheduler deva).
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    from indra.database import AsyncSessionLocal
    from indra.domains.aditya.savita.service import SavitaService, set_scheduler

    scheduler = AsyncIOScheduler()
    set_scheduler(scheduler)
    scheduler.start()
    async with AsyncSessionLocal() as db:
        n = await SavitaService.load_all(db)
    logger.info("Savita scheduler started", jobs_loaded=n)

    logger.info("INDRA ready — 33 Devas online")
    yield

    scheduler.shutdown(wait=False)
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
    from indra.domains.aditya.amshah.router import router as amshah_router
    from indra.domains.aditya.aryamah.router import router as aryamah_router
    from indra.domains.aditya.bhagah.router import router as bhagah_router
    from indra.domains.aditya.dhata.router import router as dhata_router
    from indra.domains.aditya.mitrah.router import router as mitrah_router
    from indra.domains.aditya.pushanah.router import router as pushanah_router
    from indra.domains.aditya.savita.router import router as savita_router
    from indra.domains.aditya.smriti.router import router as memory_router
    from indra.domains.aditya.tvastah.router import router as tvastah_router
    from indra.domains.aditya.varunah.router import router as varunah_router
    from indra.domains.aditya.vishnuh.router import router as vishnuh_router
    from indra.domains.aditya.vivasvat.router import router as vivasvat_router
    from indra.domains.indra.router import router as indra_router
    from indra.domains.prajapati.goals.router import router as goals_router
    from indra.domains.prajapati.intelligence.router import router as intelligence_router
    from indra.domains.prajapati.optimization.router import router as optimization_router
    from indra.domains.prajapati.planning.router import router as planning_router
    from indra.domains.rudra.apanah.router import router as apanah_router
    from indra.domains.rudra.devadattah.router import router as devadattah_router
    from indra.domains.rudra.dhananjayah.router import router as dhananjayah_router
    from indra.domains.rudra.jivatma.router import router as jivatma_router
    from indra.domains.rudra.krkalah.router import router as krkalah_router
    from indra.domains.rudra.kurmah.router import router as kurmah_router
    from indra.domains.rudra.nagah.router import router as nagah_router
    from indra.domains.rudra.pranah.router import router as pranah_router
    from indra.domains.rudra.samanah.router import router as samanah_router
    from indra.domains.rudra.udanah.router import router as udanah_router
    from indra.domains.rudra.vyanah.router import router as vyanah_router
    from indra.domains.vasu.agnih.router import router as agnih_router
    from indra.domains.vasu.akasah.router import router as akasah_router
    from indra.domains.vasu.apah.router import router as apah_router
    from indra.domains.vasu.naksatrani.router import router as naksatrani_router
    from indra.domains.vasu.prthivi.router import router as prthivi_router
    from indra.domains.vasu.somah.router import router as mcp_router
    from indra.domains.vasu.suryah.router import router as trace_router
    from indra.domains.vasu.vayuh.router import router as vayuh_router
    from indra.websockets.router import router as ws_router

    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(indra_router, prefix="/api/v1", tags=["indra"])
    app.include_router(mcp_router, prefix="/api/v1", tags=["mcp"])
    app.include_router(trace_router, prefix="/api/v1", tags=["traces"])
    app.include_router(memory_router, prefix="/api/v1", tags=["memory"])
    app.include_router(pranah_router, prefix="/api/v1", tags=["tasks"])
    # RUDRA runtime devas
    app.include_router(devadattah_router, prefix="/api/v1", tags=["notifications"])
    app.include_router(dhananjayah_router, prefix="/api/v1", tags=["processes"])
    app.include_router(jivatma_router, prefix="/api/v1", tags=["identity"])
    app.include_router(vyanah_router, prefix="/api/v1", tags=["messages"])
    app.include_router(nagah_router, prefix="/api/v1", tags=["errors"])
    app.include_router(apanah_router, prefix="/api/v1", tags=["cleanup"])
    app.include_router(udanah_router, prefix="/api/v1", tags=["escalations"])
    app.include_router(samanah_router, prefix="/api/v1", tags=["coordination"])
    app.include_router(kurmah_router, prefix="/api/v1", tags=["checkpoints"])
    app.include_router(krkalah_router, prefix="/api/v1", tags=["recovery"])
    # VASU infrastructure devas
    app.include_router(prthivi_router, prefix="/api/v1", tags=["storage"])
    app.include_router(apah_router, prefix="/api/v1", tags=["events"])
    app.include_router(naksatrani_router, prefix="/api/v1", tags=["knowledge"])
    app.include_router(agnih_router, prefix="/api/v1", tags=["execution"])
    app.include_router(vayuh_router, prefix="/api/v1", tags=["communication"])
    app.include_router(akasah_router, prefix="/api/v1", tags=["context"])
    # ADITYA governance devas
    app.include_router(aryamah_router, prefix="/api/v1", tags=["rbac"])
    app.include_router(varunah_router, prefix="/api/v1", tags=["policies"])
    app.include_router(savita_router, prefix="/api/v1", tags=["schedules"])
    app.include_router(bhagah_router, prefix="/api/v1", tags=["cost"])
    app.include_router(tvastah_router, prefix="/api/v1", tags=["workflows-builder"])
    app.include_router(mitrah_router, prefix="/api/v1", tags=["alliances"])
    app.include_router(pushanah_router, prefix="/api/v1", tags=["discovery"])
    app.include_router(vivasvat_router, prefix="/api/v1", tags=["telemetry"])
    app.include_router(vishnuh_router, prefix="/api/v1", tags=["pervasion"])
    app.include_router(dhata_router, prefix="/api/v1", tags=["foundations"])
    app.include_router(amshah_router, prefix="/api/v1", tags=["shares"])
    # PRAJAPATI strategy deva — the 33rd
    app.include_router(goals_router, prefix="/api/v1", tags=["goals"])
    app.include_router(intelligence_router, prefix="/api/v1", tags=["intelligence"])
    app.include_router(planning_router, prefix="/api/v1", tags=["planning"])
    app.include_router(optimization_router, prefix="/api/v1", tags=["optimization"])
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
