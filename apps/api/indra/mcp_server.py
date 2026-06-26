"""INDRA second-brain MCP server.

Exposes INDRA's read-only retrieval — Smriti (pgvector semantic search) and
LightRAG (per-project knowledge-graph retrieval) — as MCP tools, so coding-agent
CLIs (Claude Code, Codex, …) can query INDRA's second brain mid-task. This closes
the loop: INDRA already watches the CLIs; now the CLIs can ask INDRA what it knows.

Strictly read-only. Talks to the same Postgres + per-project .lightrag stores the
API uses, so it works whether or not the API server is running.

Run (stdio):  py -3.14 -m indra.mcp_server
Register with Claude Code (cwd = apps/api):
    claude mcp add indra -- py -3.14 -m indra.mcp_server
"""

from __future__ import annotations

import logging
import os
import sys

# stdio transport speaks JSON-RPC over stdout — keep every log on stderr so it can
# never corrupt the protocol stream. LightRAG / nano-vectordb are chatty at INFO.
logging.basicConfig(level=logging.WARNING, stream=sys.stderr)
for _n in ("lightrag", "LightRAG", "nano-vectordb", "httpx", "httpcore"):
    logging.getLogger(_n).setLevel(logging.WARNING)

from mcp.server.fastmcp import FastMCP  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from indra.database import AsyncSessionLocal  # noqa: E402
from indra.models.project import Project  # noqa: E402

mcp = FastMCP("indra-second-brain")

_VALID_MODES = ("mix", "hybrid", "local", "global", "naive")


async def _resolve_project(db: AsyncSession, ref: str) -> Project | None:
    """Match a user-supplied project reference to a registered project.

    Tries, in order: exact name, path leaf, then root-path substring — so an agent
    can pass "shhh", "Ved Project", or a path fragment and still hit the right row.
    """
    ref_l = ref.strip().lower()
    projects = list((await db.execute(select(Project))).scalars())
    for p in projects:
        if p.name.lower() == ref_l:
            return p
    for p in projects:
        leaf = p.root_path.replace("\\", "/").rstrip("/").split("/")[-1].lower()
        if leaf == ref_l:
            return p
    for p in projects:
        if ref_l and ref_l in p.root_path.lower():
            return p
    return None


@mcp.tool()
async def indra_list_projects() -> str:
    """List the projects INDRA knows about, with whether each is indexed.

    Use this first to discover the project names accepted by the other tools.
    """
    async with AsyncSessionLocal() as db:
        ps = list(
            (
                await db.execute(select(Project).order_by(Project.enabled.desc(), Project.name))
            ).scalars()
        )
    if not ps:
        return "No projects registered in INDRA."
    return "\n".join(
        f"- {p.name}  ["
        f"{'indexed' if p.graphify_out else 'no-graph'}"
        f"{', auto-index' if p.enabled else ''}]  {p.root_path}"
        for p in ps
    )


@mcp.tool()
async def indra_memory_search(query: str, project: str | None = None, limit: int = 8) -> str:
    """Semantic search over INDRA's Smriti memory (code symbols, communities, notes).

    Args:
        query: what to look for, in natural language.
        project: optional project name to scope the search (see indra_list_projects).
        limit: max results (1–25).
    """
    from indra.domains.aditya.smriti.schemas import MemorySearchRequest
    from indra.domains.aditya.smriti.service import smriti_service

    limit = max(1, min(limit, 25))
    async with AsyncSessionLocal() as db:
        project_id = None
        if project:
            p = await _resolve_project(db, project)
            if p is None:
                return f"No project matching '{project}'. Call indra_list_projects to see names."
            project_id = p.id
        req = MemorySearchRequest(
            query=query, limit=limit, project_id=project_id, similarity_threshold=0.3
        )
        resp = await smriti_service.search(db, req)

    if not resp.results:
        return f"No matches for '{query}'."
    lines = [f"{r.similarity:.3f} [{r.source_type or '?'}] {r.content}" for r in resp.results]
    return f"{len(resp.results)} results ({resp.search_mode}):\n" + "\n".join(lines)


@mcp.tool()
async def indra_kg_query(project: str, query: str, mode: str = "mix") -> str:
    """Knowledge-graph retrieval over a project (LightRAG): entities, relationships,
    and the source chunks that connect them — richer than flat search for "how does X
    relate to Y" questions.

    Args:
        project: project name (see indra_list_projects); must be indexed.
        query: natural-language question about the project.
        mode: mix | hybrid | local | global | naive (default mix).
    """
    from indra.domains.aditya.smriti import lightrag_store

    if mode not in _VALID_MODES:
        mode = "mix"
    if not lightrag_store.available():
        return "LightRAG / local embeddings are not available on this INDRA install."
    async with AsyncSessionLocal() as db:
        p = await _resolve_project(db, project)
        if p is None:
            return f"No project matching '{project}'. Call indra_list_projects to see names."
        # Pull what we need while the row is session-attached, then run the (slow)
        # LightRAG query off the DB session.
        gout = p.graphify_out or os.path.join(p.root_path, "graphify-out")
        pname = p.name
    ctx = await lightrag_store.query(gout, query, mode=mode)
    return ctx or f"No knowledge-graph context for '{query}' (is '{pname}' indexed?)."


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
