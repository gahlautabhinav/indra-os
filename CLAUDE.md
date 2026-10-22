# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# INDRA-OS

Command center that observes/governs every local AI-agent CLI (Claude Code, Codex, Kiro, Gemini, OpenCode, Antigravity). Monorepo: `apps/api` (FastAPI, also hosts the Textual TUI), `apps/web` (Next.js 15), `packages/types` + `packages/design-tokens` (consumed from source). Full design: `ARCHITECTURE.md`. Design language: `INDRA_DESIGN.md`.

## Runtime Facts
<!-- maintained by /env-facts — update when environment changes -->
- Python: `py -3.14` for all backend + TUI (NOT 3.10/3.11). Only RAG-Anything/mineru needs <3.14. CI lints/tests on 3.11 and ruff targets py311 — keep syntax 3.11-compatible.
- Ports: **API 9333**, **Web 3333** on this machine. Repo default is API 8333 (README, `.env.example`, client/TUI fallbacks); 9333 is a local override (see quirk), so pass `--port 9333` and set `.env.local`.
- Run (from repo root unless noted):
  - Redis first: `redis-server` (API pings it on startup and fails without it)
  - API (`apps/api`): `py -3.14 -m uvicorn indra.main:app --reload --port 9333`
  - Web (`apps/web`): `npm run dev`  (port 3333, Turbopack)
  - TUI (`apps/api`): `py -3.14 -m indra.tui --port 9333`  (one-time: `py -3.14 -m pip install -e ".[tui]"`)
  - MCP server: `py -3.14 -m indra.mcp_server` (stdio; works without the API running). LightRAG native UI: `py -3.14 -m indra.lightrag_ui "<project>"` (needs `.[lightrag-ui]` extra).
- Web→API wiring: `apps/web/.env.local` → `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` = `localhost:9333`.
- DB: local Postgres (+pgvector); creds in `apps/api/.env` (gitignored — never print). Migrations (from `apps/api`): `py -3.14 -m alembic -c indra/migrations/alembic.ini upgrade head` (`revision --autogenerate -m "..."` for new ones).
- Quirk — `WinError 10013` on port bind: Windows reserves random TCP ranges (Hyper-V/WSL2/Docker). 8333 fell inside excluded `8293–8392` → forbidden (NOT in-use). Diagnose: `netsh int ipv4 show excludedportrange protocol=tcp`. Fix: bind a port outside all ranges (chose 9333). Permanent admin fix (rice-safe): `net stop winnat; netsh int ipv4 set dynamicport tcp start=49152 num=16384; net start winnat`.

## Gates (mirror CI)
- API (`apps/api`): `py -3.14 -m ruff check indra/` · `py -3.14 -m mypy indra/` (strict) · `py -3.14 -m pytest -q`
  - Single test: `py -3.14 -m pytest tests/unit/test_trace_service.py::<test_name> -q` (`asyncio_mode=auto`, no `@pytest.mark.asyncio` needed)
- Web (`apps/web`): `npm run lint` · `npm run typecheck` · `npm run test`
  - Single test: `npx vitest run components/traces/__tests__/VivartaTrace.test.tsx`

## Architecture

### 33 devas = domain modules
Code is organised as "devas" (one service each) under 5 domains: `vasu` (infra), `rudra` (runtime), `aditya` (governance), `prajapati` (strategy), `indra` (command dashboard). Each deva is `apps/api/indra/domains/<domain>/<deva>/` with `router.py` → `service.py` (static-method `XxxService` classes) → `schemas.py` (Pydantic). ORM models are shared in `indra/models/`.
- New router must be imported and `include_router`'d in `main.py::_register_routers` (all under `/api/v1`).
- Backend dir names don't always match UI route names (`pushanah` ↔ `/aditya/pusa`, `vivasvat` ↔ `vivasvan`, `vishnuh` ↔ `visnuh`, `amshah` ↔ `amsuman`, `tvastah` ↔ `tvasta`; `vasu/somah/router.py` is the MCP/sessions router).
- Deva list is duplicated: `apps/web/lib/devata.ts` and `apps/api/indra/tui/registry.py` — keep in sync.

### Data enters only via read-only adapters
`indra/plugins/adapters/<cli>/` each implement `AbstractPlugin` (`plugins/base.py`: `list_sessions/get_session/stream_events/health_check`) by reading the CLI's on-disk store. Never write to CLI data. `plugin_manager` aggregates them.

### Lifespan + background work (`main.py::lifespan`)
Startup order: Redis ping → register adapters → `poller.start()` → Tvasta `index_worker.start()` → APScheduler (Savita jobs loaded from DB).
- **Poller** (`core/poller.py`) is the heartbeat: ~30s `sync_from_plugins()` upserts Session rows and mirrors each as an Agent row; ~60s trace synthesis (Suryah) + knowledge rebuild (Naksatrani); status diffs → Redis pub/sub (WebSocket) + streams `indra:stream:*` (Apah). UI shows nothing until first sync.
- `sync_from_plugins` serialised by a process lock + per-item SAVEPOINTs; unique indexes `uq_sessions_external_id` / `uq_agents_session_id` prevent dupes.
- **Tvasta pipeline** (`domains/aditya/tvastah/pipeline.py`, run by DB-queue `worker.py`): `detect → graphify → semantic (Claude community naming) → vault → Smriti ingest → LightRAG seed → Naksatrani`. Worker reaps orphaned "running" runs on startup.
- **Smriti** (`domains/aditya/smriti/`): Obsidian vault scanner, per-project LightRAG store seeded from `graph.json` via `ainsert_custom_kg` (no LLM extraction), local model2vec embeddings (`local_embed.py`), pgvector search, headless-Claude LLM (`claude_llm.py`).

### Windows subprocess rules (hard-won)
- Uvicorn's SelectorEventLoop can't spawn subprocesses → run them with `subprocess.run` inside `asyncio.to_thread`.
- Headless `claude` calls spawn node grandchildren that hold the pipe → on timeout, `taskkill /F /T /PID` the whole tree (see `smriti/claude_llm.py`, `tvastah/semantic_names.py`). Plain `proc.kill()` hangs.

### Auth (3 layers)
`AppShell` redirect to `/login` (web) · `middleware/auth_gate.py` 401s every `/api/v1/*` except `/api/v1/auth/*`, `/health`, `/docs`, preflight · `/ws/connect?token=` handshake. Middleware order in `create_app` matters: CORS added last (outermost) so 401s carry CORS headers.

### Web
App Router pages at `app/<domain>/<deva>/page.tsx`. API calls go through `lib/api/client.ts` (axios `indraApi`) + TanStack Query hooks in `lib/api/hooks.ts`; add endpoints there, not ad-hoc fetches. Shared types: `packages/types/src/index.ts`. Zustand stores in `lib/store/`. WebSocket hook: `lib/websocket/useIndraWS.ts`.

## Navigation
Knowledge graph (`graphify-out/`, built by `/graph-enrich`, refreshed by `/graph-sync`) — how to query it lives in `CLAUDE.local.md`. Never run `graphify update .` here (it drops the AI layer). Planning docs (`PLAN*.md`, `TUI_PLAN.md`, `TVASTA_PIPELINE.md`, `PRD.md`) are design history; trust code + `ARCHITECTURE.md` for current state.
