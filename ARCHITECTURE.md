# INDRA — Architecture

**The Operating System for AI Workforces.** INDRA is a single command surface that
observes, manages, governs, and connects the AI agents running across your machine —
Claude Code, Codex CLI, Kiro, Gemini, OpenCode, and Antigravity — without ever
modifying their data.

This document describes the system **as built**.

---

## 1. The 33-Deva Architecture

INDRA is organised as a pantheon of 33 *devas* (services), grouped into five domains.
Each deva owns one responsibility and surfaces as one page in the UI.

```
INDRA (Command)              — the sovereign dashboard / command layer
│
├── VASU × 8     Infrastructure
│   ├── Sūryaḥ        Traces (Vivarta span waterfalls)
│   ├── Somah         Sessions (CLI adapter sessions + conversation timeline)
│   ├── Agniḥ         Execution Engine (agent/task run ledger)
│   ├── Ākāśaḥ        Context (per-session token-window pressure)
│   ├── Āpaḥ          Event Bus (Redis streams)
│   ├── Nakṣatrāṇi    Knowledge Graph (live constellation)
│   ├── Pṛthivī       Storage (workspaces)
│   └── Vāyuḥ         Communication (channels)
│
├── RUDRA × 11    Runtime
│   ├── Prāṇaḥ        Tasks / orchestration board
│   ├── Vyānaḥ        Inter-agent messaging
│   ├── Samānaḥ       Coordination / load balancing
│   ├── Udānaḥ        Escalations
│   ├── Apānaḥ        Cleanup / resource reclamation
│   ├── Dhanañjayaḥ   Processes (psutil)
│   ├── Devadattaḥ    Notifications
│   ├── Nāgaḥ         Error detection
│   ├── Kūrmaḥ        Checkpoints
│   ├── Kṛkalaḥ       Recovery / self-healing
│   └── Jīvātmā       Agent identity
│
├── ADITYA × 12   Governance
│   ├── Smṛti         Memory / RAG · Second Brain (Obsidian + LightRAG KG)
│   ├── Aryamā        RBAC
│   ├── Varuṇaḥ       Policy engine
│   ├── Savitā        Scheduler (APScheduler)
│   ├── Bhagaḥ        Cost analytics
│   ├── Tvaṣṭā        Auto-index pipeline + workflow builder
│   ├── Mitraḥ        Alliances
│   ├── Pūṣā          Discovery (incl. the local Claude Code environment)
│   ├── Vivasvān      Telemetry (host + workload)
│   ├── Viṣṇuḥ        Pervasion (system reach)
│   ├── Dhātā         Foundations (schema / entity counts)
│   └── Aṃśah         Resource shares
│
└── PRAJAPATI       Strategy — Goals · Planning · Intelligence · Optimization
```

---

## 2. Tech Stack

| Layer        | Technology |
|--------------|------------|
| API          | FastAPI · SQLAlchemy 2 (async) · asyncpg · Pydantic v2 |
| Datastores   | PostgreSQL + pgvector (primary) · Redis (pub/sub + streams) |
| RAG / Knowledge | graphify · LightRAG (KG + vector) · model2vec (local embeddings) · MCP (stdio server) |
| Auth         | JWT (HS256) via python-jose · bcrypt (passlib) |
| Scheduling   | APScheduler |
| Web          | Next.js 15 (App Router, Turbopack) · React 18 · TypeScript |
| UI           | Tailwind CSS · TanStack Query · Zustand · reactflow |
| Tooling      | ruff · mypy (strict) · pytest · ESLint · vitest |

The repo is a monorepo:

```
apps/api               FastAPI backend (indra/)
apps/web               Next.js frontend
packages/types         shared TypeScript types (consumed from source)
packages/design-tokens
infrastructure/        docker-compose (optional; local dev runs without it)
```

---

## 3. The Adapter Model — how CLI activity enters INDRA

INDRA never talks to a CLI's process. Each adapter is a **read-only reader** of the
CLI's on-disk session store, implementing `AbstractPlugin`
(`apps/api/indra/plugins/base.py`):

```
list_sessions() · get_session() · stream_events() · health_check()
```

| Adapter        | Source | Session name |
|----------------|--------|--------------|
| `claude_code`  | `~/.claude/projects/<enc>/<uuid>.jsonl` | `ai-title` entry |
| `codex_cli`    | `~/.codex/session_index.jsonl` + `sessions/` | `thread_name` |
| `kiro_cli`     | `~/.kiro/sessions/cli/*.json(l)` | `title` |
| `gemini_cli`   | `~/.gemini/history`, `tmp` | from JSON |
| `opencode`     | `~/.local/share/opencode/opencode.db` (SQLite) | session `title` / `slug` |
| `antigravity`  | `~/.gemini/antigravity/conversations/*.pb` + IDE `state.vscdb` | decoded trajectory title |

Notable decoding work:
- **Claude Code** session names + real project path come from the JSONL `ai-title`
  and `cwd` fields (the project dir name is dash-encoded and lossy on Windows).
- **Antigravity** conversation content is encrypted protobuf; the human task title
  is recovered by decoding the `trajectorySummaries` blob in the IDE's SQLite
  `state.vscdb` (copied to a temp file to read past the WAL lock).
- **Active/ended status** uses a uniform recency heuristic (last activity < 5 min) —
  Kiro/Codex lock-files and missing end-markers are not trusted.

Obsidian vaults are **not** CLI sessions, so they do not use this adapter model — they
are read by a separate read-only scanner under Smṛti (see §5, Second Brain).

---

## 4. Data Flow

```
 CLI on-disk stores
        │  (adapters, read-only)
        ▼
 plugin_manager.aggregate_sessions()
        │
        ▼
 Background poller  ── every ~30s ──►  sync_from_plugins()
        │                                   │  upserts Session rows
        │                                   │  mirrors each session as an Agent row
        │                                   ▼
        │                              PostgreSQL  ◄── REST API ──►  Next.js UI
        │                                   ▲
        ├── every ~60s ──► trace synthesis (Suryah)  ─┘  (Session events → Trace + Spans)
        ├── every ~60s ──► knowledge rebuild (Naksatrani)
        └── status diffs ──► Redis pub/sub + streams (Apah)  ──►  WebSocket
```

The **poller** (`indra/core/poller.py`) is the heartbeat. Each cycle it:
1. persists CLI sessions to the DB (`sync_from_plugins`), mirroring every session as
   an Agent row so the workforce/dashboard reflect live CLI activity;
2. synthesises Vivarta traces from session event timelines (CLI agents emit no OTel);
3. rebuilds the knowledge constellation;
4. emits status-change events to Redis (pub/sub for live WS + streams for Āpaḥ).

`sync_from_plugins` is serialized by a process lock with per-item SAVEPOINTs, and
unique indexes (`uq_sessions_external_id`, `uq_agents_session_id`) guarantee no
duplicate rows under concurrent syncs.

---

## 5. Key Subsystems

- **Sessions & Workforce (Somah / INDRA dashboard)** — every CLI session is a Session
  row and a mirrored Agent row (`domain=rudra`), named by its recovered title. The
  Somah detail panel renders the live conversation timeline from
  `GET /sessions/{id}/events`.
- **Traces (Sūryaḥ)** — synthesised per session: one root span over the session plus a
  child span per event (tool calls named from content). Running sessions sort first;
  `POST /traces/synthesize` forces a rebuild.
- **Execution (Agniḥ)** — the ledger merges agent runs (each CLI session is an
  execution) with INDRA task runs into one status vocabulary.
- **Event Bus (Āpaḥ)** — `publish_event` does both Redis pub/sub (ephemeral WS) and
  XADD to `indra:stream:*` (durable, inspectable via XREVRANGE).
- **Knowledge Graph (Nakṣatrāṇi)** — a multi-layer constellation: plugin (CLI) ←
  agent (session) → project (cwd), plus MCP servers, spawn lineage, and **vault** nodes
  (`documents` edge → project). Sessions that share a project cluster together
  (cross-CLI links). Rendered as a live, draggable, force-directed star map
  (`ConstellationGraph`).
- **Second Brain (Smṛti)** — a per-project knowledge base, three views over one
  `graphify` graph. (1) **Obsidian vaults**: a scanner (`smriti/vault_scan.py`) reads the
  registry (`%APPDATA%/obsidian/obsidian.json`) and each vault on disk; the project root
  is recovered from the path (strip `…/graphify-out/<vault>`) and matched to
  `Session.project_path`. Served live (catalog, note list/body with path-traversal + ADS
  guard, per-vault graph + one combined force graph). (2) **LightRAG store**
  (`smriti/lightrag_store.py`): the project's `graph.json` is seeded straight into a
  per-project `.lightrag` KG + vector store via `ainsert_custom_kg` (no LLM extraction);
  embeddings are local (model2vec, 256-dim), keyword extraction uses a headless Claude
  session, retrieval runs with `only_need_context` so no generation spend. Noise dirs
  (`.claude`, `skills`, `node_modules`) are filtered and real `file_path`s preserved for
  citations. (3) **pgvector** flat semantic search over ingested chunks. The UI
  (`/aditya/smriti`) is a project hub (notes + KG graph + inline `graph.html` + sessions)
  + vault browser + memory search. **Ask KG** (`/aditya/tvasta`) returns KG-aware context
  or draws the live knowledge graph (`POST /projects/{id}/kg-query`, `/kg-graph`).
- **Auto-index pipeline (Tvaṣṭā)** — keeps every derived store in sync from one source.
  `tvastah/pipeline.py` runs, off the request path via the DB-queue worker:
  `detect → graphify → semantic (Claude community naming) → vault → Smṛti ingest →
  LightRAG seed → Naksatrani`. Triggered manually (`POST /projects/{id}/reindex`),
  on a schedule (Savitā), or by the poller's change-detect (`detect_and_enqueue`).
  Subprocess stages run via `subprocess.run` in `asyncio.to_thread` (Windows
  SelectorEventLoop can't spawn under uvicorn).
- **MCP server (`indra.mcp_server`)** — a stdio MCP server exposing the second brain to
  coding-agent CLIs: `indra_list_projects`, `indra_memory_search` (pgvector),
  `indra_kg_query` (LightRAG). Talks to the same Postgres + `.lightrag` stores, so it
  works whether or not the API is up; all logs pinned to stderr to keep the JSON-RPC
  stream clean. A companion launcher (`indra.lightrag_ui`) starts LightRAG's native web
  UI for a project, feeding it INDRA's local model2vec + Claude via an OpenAI-compatible
  shim so the existing store queries correctly.
- **Discovery (Pūṣā)** — surfaces the local **Claude Code environment**: skills,
  subagents, MCP servers (global + per-project), installed plugins, and hooks, scanned
  from `~/.claude/`.
- **Observability** — Vivasvān (host metrics via psutil), Dhātā (entity counts +
  schema head), Viṣṇuḥ (per-domain reach), Aṃśah (token/cost shares), Bhagaḥ (cost).

---

## 6. Auth (3 layers)

1. **Frontend guard** — `AppShell` redirects to `/login` when there's no token;
   `/login` renders bare (no chrome).
2. **Backend gate** — `AuthGateMiddleware` rejects any `/api/v1/*` request without a
   valid JWT (401), except `/api/v1/auth/*`, `/health`, `/docs`, and CORS preflight.
3. **WebSocket** — the `/ws/connect` handshake validates a `?token=` query param
   (browsers can't set WS headers).

Tokens are long-lived by default (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES=43200`, 30 days) so
sessions persist until explicit logout. Login runs a constant-time bcrypt comparison
against a real decoy hash to avoid leaking account existence.

---

## 7. Local Development

Dedicated ports keep INDRA out of the way of other dev work:

| Service | Port |
|---------|------|
| API     | **8333** |
| Web     | **3333** |
| Postgres| 5432 |
| Redis   | 6379 |

```bash
# 1. Redis (must be first — the API pings it on startup)
redis-server

# 2. API  (apps/api)
py -3.14 -m uvicorn indra.main:app --reload --port 8333

# 3. Web  (apps/web)
npm run dev          # defaults to port 3333
```

Then open `http://localhost:3333` and sign in. Sessions/agents auto-populate ~30s
after the API boots (no manual sync needed). Database migrations live under
`apps/api/indra/migrations` (Alembic) and only need running after a schema change.

Configuration is read from `apps/api/.env` (gitignored) and `apps/web/.env.local`;
see `.env.example` for the shape.

---

## 8. Quality Gates

Every change is held to: `ruff`, `mypy --strict`, `pytest` (api), and `eslint`,
`tsc --noEmit`, `vitest` (web). CI (`.github/workflows/ci.yml`) runs all six.
