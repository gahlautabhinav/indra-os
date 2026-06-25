"""Vaults router — the Obsidian "second brain" corpus (read-only).

Hosted under the Smriti deva (ADITYA / Memory). Serves the vault catalog, note
lists, single note bodies, a per-vault normalized knowledge graph, and a
project-centric rollup that ties each project's vault(s) to its CLI sessions.

Endpoints:
  GET /api/v1/vaults                       — catalog (+ matched_project)
  GET /api/v1/vaults/projects              — project rollup (vaults + sessions)
  GET /api/v1/vaults/{id}/notes            — paginated note list
  GET /api/v1/vaults/{id}/notes/{name}     — single note markdown body
  GET /api/v1/vaults/{id}/graph            — normalized graphify graph
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db
from indra.models.session import Session

from . import vault_scan

router = APIRouter()


def _project_leaf(path: str) -> str:
    leaf = path.replace("\\", "/").rstrip("/").split("/")[-1]
    return leaf or path


async def _session_index(db: AsyncSession) -> dict[str, dict]:
    """Map normalized project_path → {project_root, leaf, session_count, active_count}."""
    rows = (await db.execute(select(Session.project_path, Session.status))).all()
    roots: dict[str, str] = {}
    total: dict[str, int] = {}
    active: dict[str, int] = {}
    for project_path, status in rows:
        if not project_path:
            continue
        key = vault_scan._norm(project_path)
        roots.setdefault(key, project_path)
        total[key] = total.get(key, 0) + 1
        if status == "active":
            active[key] = active.get(key, 0) + 1
    return {
        key: {
            "project_root": root,
            "leaf": _project_leaf(root),
            "session_count": total.get(key, 0),
            "active_count": active.get(key, 0),
        }
        for key, root in roots.items()
    }


@router.get("/vaults", tags=["vaults"])
async def list_vaults(db: AsyncSession = Depends(get_db)) -> dict:
    vaults = vault_scan.scan_vaults()
    matched_paths = set((await _session_index(db)).keys())

    graphify = 0
    matched = 0
    missing = 0
    for v in vaults:
        is_match = bool(v.get("project_root")) and vault_scan._norm(v["project_root"]) in matched_paths
        v["matched_project"] = is_match
        if v.get("is_graphify"):
            graphify += 1
        if is_match:
            matched += 1
        if not v.get("exists"):
            missing += 1

    return {
        "vaults": vaults,
        "counts": {
            "total": len(vaults),
            "graphify": graphify,
            "matched": matched,
            "missing": missing,
        },
    }


@router.get("/vaults/projects", tags=["vaults"])
async def list_vault_projects(db: AsyncSession = Depends(get_db)) -> dict:
    """Project-centric rollup: every project that has a vault and/or sessions,
    with its vault(s) and CLI session counts joined by normalized path."""
    session_index = await _session_index(db)
    vaults = vault_scan.scan_vaults()

    projects: dict[str, dict] = {}

    def bucket(key: str, root: str) -> dict:
        if key not in projects:
            base = session_index.get(key)
            projects[key] = {
                "project_root": base["project_root"] if base else root,
                "leaf": base["leaf"] if base else _project_leaf(root),
                "vaults": [],
                "session_count": base["session_count"] if base else 0,
                "active_count": base["active_count"] if base else 0,
            }
        return projects[key]

    # Seed from sessions so projects with no vault still appear.
    for key, base in session_index.items():
        bucket(key, base["project_root"])

    # Attach vaults (creating vault-only projects when there are no sessions).
    for v in vaults:
        root = v.get("project_root")
        if not root:
            continue
        b = bucket(vault_scan._norm(root), root)
        b["vaults"].append(v)

    rollup = sorted(
        projects.values(),
        key=lambda p: (len(p["vaults"]) > 0, p["session_count"]),
        reverse=True,
    )
    return {
        "projects": rollup,
        "counts": {
            "projects": len(rollup),
            "with_vaults": sum(1 for p in rollup if p["vaults"]),
        },
    }


@router.get("/vaults/graph", tags=["vaults"])
async def combined_vault_graph(cap: int = Query(800, ge=100, le=1500)) -> dict:
    """One combined Obsidian-style force graph of every vault (per-vault clusters)."""
    return vault_scan.combined_graph(cap)


@router.get("/vaults/{vault_id}/notes", tags=["vaults"])
async def list_vault_notes(
    vault_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    result = vault_scan.list_notes(vault_id, limit=limit, offset=offset)
    if result is None:
        raise HTTPException(status_code=404, detail="Vault not found or unavailable")
    return result


@router.get("/vaults/{vault_id}/notes/{name}", tags=["vaults"])
async def get_vault_note(vault_id: str, name: str) -> dict:
    note = vault_scan.read_note(vault_id, name)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.get("/vaults/{vault_id}/graph", tags=["vaults"])
async def get_vault_graph(vault_id: str) -> dict:
    graph = vault_scan.read_graph(vault_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="Vault not found or unavailable")
    return graph
