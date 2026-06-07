# INDRA (इन्द्रः)

**The Operating System for AI Workforces**

INDRA is not a chatbot. Not an IDE. Not a wrapper.

It is a complete Agentic OS — a single command center for monitoring, managing, orchestrating, governing, observing, debugging, and scaling intelligent agent civilizations.

---

## Architecture: 33 Deva Domains

```
INDRA (Command)
├── VASU × 8    — Infrastructure Layer
├── RUDRA × 11  — Agent Runtime Layer
├── ADITYA × 12 — Governance Layer
└── PRAJAPATI   — Strategic Intelligence
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, TailwindCSS, shadcn/ui, React Flow, Framer Motion |
| State | Zustand + TanStack Query + WebSocket |
| Backend | FastAPI, Python 3.11, asyncio |
| Database | PostgreSQL 16 + pgvector |
| Cache / Events | Redis 7 (Streams + Pub/Sub) |
| Observability | OpenTelemetry, AgTrace |
| Infra | Docker, Turborepo monorepo |

## Quick Start

```bash
# Prerequisites: Docker, Node 20+, Python 3.11+

# 1. Clone
git clone https://github.com/gahlautabhinav/indra-os.git
cd indra-os

# 2. Copy env
cp .env.example .env

# 3. Start all services
docker compose -f infrastructure/docker-compose.yml up

# 4. Access
# Frontend: http://localhost:3000
# API:      http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Development

```bash
# Install dependencies
npm install

# Run dev (frontend + api hot reload)
npm run dev

# API only
cd apps/api && pip install -e ".[dev]" && uvicorn indra.main:app --reload

# Frontend only
cd apps/web && npm run dev
```

## Project Structure

```
indra/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── api/          # FastAPI backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── design-tokens/
└── infrastructure/   # Docker, nginx
```

## Supported Agent Systems

Claude Code · Gemini CLI · Codex CLI · OpenCode · Kiro CLI · MCP Servers · Custom Agents
