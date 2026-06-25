# INDRA (इन्द्रः)

**The Operating System for AI Workforces.**

INDRA is not a chatbot, an IDE, or a wrapper. It is a single command center that
**observes, manages, governs, and connects** every AI agent CLI running on your
machine — Claude Code, Codex CLI, Kiro, Gemini, OpenCode, and Antigravity — in one
place, **without ever modifying their data** (every adapter is strictly read-only).

> See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.

---

## What it does

- **Unified workforce view** — every CLI session across every tool shows up as a named,
  live agent (status, tokens, cost, project), auto-synced ~30s after the API starts.
- **Conversation timelines** — open any session to read its real prompts, responses,
  and tool calls.
- **Trace center** — Vivarta span waterfalls synthesised from session event timelines
  (CLI agents emit no OpenTelemetry on their own).
- **Knowledge constellation** — a live, draggable, Obsidian-style force graph linking
  CLIs ↔ sessions ↔ projects; sessions that share a project cluster together, so
  cross-tool work (e.g. a Codex session used from Claude Code) is visible.
- **Second Brain** — your Obsidian vaults, read-only, tied to the projects and agent
  sessions that produced them: a project hub, a vault/note browser with an inline reader
  (and "Open in Obsidian"), and one combined Obsidian-style force graph of every vault's
  notes rendered as per-vault clusters — plus a rotating orbital view.
- **Event bus** — live Redis-stream view of system events.
- **Discovery** — surfaces everything wired into your local Claude Code setup: skills,
  subagents, MCP servers, plugins, and hooks.
- **Governance & observability** — RBAC, policies, scheduling, cost analytics,
  host/workload telemetry, per-domain reach, and more.

---

## Architecture: 33 Devas

```
INDRA (Command)
├── VASU × 8     — Infrastructure  (traces, sessions, execution, context, events,
│                                    knowledge graph, storage, communication)
├── RUDRA × 11   — Runtime         (tasks, messaging, coordination, escalations,
│                                    cleanup, processes, notifications, errors,
│                                    checkpoints, recovery, identity)
├── ADITYA × 12  — Governance      (memory, RBAC, policies, scheduler, cost,
│                                    workflows, alliances, discovery, telemetry,
│                                    pervasion, foundations, shares)
└── PRAJAPATI    — Strategy        (goals, planning, intelligence, optimization)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) · React 18 · TypeScript · TailwindCSS · reactflow · TanStack Query · Zustand |
| Backend | FastAPI · SQLAlchemy 2 (async) · asyncpg · Pydantic v2 · Python 3.14 |
| Datastores | PostgreSQL · Redis (Streams + Pub/Sub) |
| Auth | JWT (HS256) · bcrypt · 3-layer guard (UI · API middleware · WS handshake) |
| Tooling | ruff · mypy (strict) · pytest · ESLint · vitest |

---

## Quick Start (local, no Docker)

INDRA runs on dedicated ports — **API 8333**, **Web 3333** — to stay out of the way of
your other dev work. PostgreSQL and Redis run locally.

```bash
# Prereqs: Node 20+, Python 3.14, local PostgreSQL + Redis

# 1. Redis — must be first (the API pings it on startup)
redis-server

# 2. API  (terminal 2)
cd apps/api
py -3.14 -m uvicorn indra.main:app --reload --port 8333

# 3. Web  (terminal 3)
cd apps/web
npm run dev            # defaults to port 3333
```

Open **http://localhost:3333** and sign in. Create the first user via the CLI:

```bash
py -3.14 -m indra.cli create-user
```

Config lives in `apps/api/.env` (gitignored) and `apps/web/.env.local`; copy the shape
from [`.env.example`](./.env.example). Database migrations (Alembic) live under
`apps/api/indra/migrations` and only need running after a schema change.

> A `infrastructure/docker-compose.yml` is provided but optional — the local flow above
> needs no Docker.

---

## Development

```bash
npm install                      # workspace deps

# checks (mirrors CI)
cd apps/api && ruff check indra/ && mypy indra/ && pytest -q
cd apps/web && npm run lint && npm run typecheck && npm run test
```

## Project Structure

```
indra/
├── apps/
│   ├── web/                # Next.js 15 frontend
│   └── api/                # FastAPI backend (indra/)
│       └── indra/plugins/adapters/   # one read-only adapter per CLI
├── packages/
│   ├── types/              # shared TypeScript types
│   └── design-tokens/
└── infrastructure/         # docker-compose (optional)
```

## Supported Agent Systems

Claude Code · Codex CLI · Kiro · Gemini CLI · OpenCode · Antigravity · MCP servers ·
Obsidian vaults (Second Brain)
