"""
Prthivi service — Storage & Workspace management.
VASU domain: Infrastructure layer.

Prthivi (पृथ्वी) = Earth — the ground, the foundation, the workspace.
"""

from __future__ import annotations

import contextlib
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.core.exceptions import IndraException
from indra.models.project import Project
from indra.models.session import Session
from indra.models.task import Task
from indra.models.workspace import Workspace

from .schemas import (
    FileEntry,
    FileListResponse,
    KgQueryResponse,
    ProjectRead,
    RunRead,
    StorageAnalytics,
    WorkspaceRead,
)


def _run_read(t: Task) -> RunRead:
    return RunRead(
        id=t.id,
        project_id=t.input.get("project_id"),
        name=t.name,
        status=t.status,
        trigger=t.input.get("trigger"),
        stages=(t.output or {}).get("stages", []),
        error=t.error,
        started_at=t.started_at,
        finished_at=t.finished_at,
        created_at=t.created_at,
    )


class PrthiviService:
    @staticmethod
    async def list_workspaces(db: AsyncSession) -> list[WorkspaceRead]:
        result = await db.execute(select(Workspace).order_by(Workspace.created_at.desc()))
        workspaces = list(result.scalars().all())
        return [WorkspaceRead.model_validate(w, from_attributes=True) for w in workspaces]

    @staticmethod
    async def create_workspace(
        db: AsyncSession, name: str, path: str, description: str | None
    ) -> WorkspaceRead:
        ws = Workspace(name=name, path=path, description=description, status="active")
        db.add(ws)
        await db.commit()
        await db.refresh(ws)
        await PrthiviService._reindex(db, ws)
        return WorkspaceRead.model_validate(ws, from_attributes=True)

    @staticmethod
    async def _reindex(db: AsyncSession, ws: Workspace) -> None:
        p = Path(ws.path)
        if not p.exists() or not p.is_dir():
            ws.status = "error"
            await db.commit()
            return
        count = 0
        total_size = 0
        try:
            for entry in p.rglob("*"):
                if entry.is_file():
                    count += 1
                    with contextlib.suppress(OSError):
                        total_size += entry.stat().st_size
        except PermissionError:
            pass
        ws.file_count = count
        ws.size_bytes = total_size
        ws.last_indexed_at = datetime.now(UTC)
        ws.status = "active"
        await db.commit()

    @staticmethod
    async def reindex_workspace(db: AsyncSession, workspace_id: uuid.UUID) -> WorkspaceRead:
        ws = await db.get(Workspace, workspace_id)
        if ws is None:
            raise IndraException(status_code=404, error_code="workspace_not_found", message="Workspace not found")
        await PrthiviService._reindex(db, ws)
        await db.refresh(ws)
        return WorkspaceRead.model_validate(ws, from_attributes=True)

    @staticmethod
    async def get_workspace_files(
        db: AsyncSession, workspace_id: uuid.UUID, subpath: str = ""
    ) -> FileListResponse:
        ws = await db.get(Workspace, workspace_id)
        if ws is None:
            raise IndraException(status_code=404, error_code="workspace_not_found", message="Workspace not found")
        base = Path(ws.path)
        target = base / subpath if subpath else base
        if not target.exists():
            raise IndraException(status_code=404, error_code="path_not_found", message=f"Path not found: {subpath}")
        entries: list[FileEntry] = []
        try:
            for entry in sorted(target.iterdir(), key=lambda e: (e.is_file(), e.name.lower())):
                try:
                    stat = entry.stat()
                    size = stat.st_size if entry.is_file() else 0
                    modified = datetime.fromtimestamp(stat.st_mtime, tz=UTC).isoformat()
                except OSError:
                    size = 0
                    modified = ""
                entries.append(FileEntry(
                    name=entry.name,
                    path=str(entry.relative_to(base)).replace("\\", "/"),
                    type="directory" if entry.is_dir() else "file",
                    size=size,
                    modified_at=modified,
                ))
        except PermissionError:
            pass
        return FileListResponse(
            workspace_id=workspace_id,
            path=subpath or "/",
            entries=entries,
            total=len(entries),
        )

    @staticmethod
    async def delete_workspace(db: AsyncSession, workspace_id: uuid.UUID) -> None:
        ws = await db.get(Workspace, workspace_id)
        if ws is None:
            raise IndraException(status_code=404, error_code="workspace_not_found", message="Workspace not found")
        await db.delete(ws)
        await db.commit()

    @staticmethod
    async def get_analytics(db: AsyncSession) -> StorageAnalytics:
        result = await db.execute(select(Workspace))
        all_ws = list(result.scalars().all())
        active = [w for w in all_ws if w.status == "active"]
        total_files = sum(w.file_count for w in all_ws)
        total_size = sum(w.size_bytes for w in all_ws)
        if total_size >= 1_073_741_824:
            human = f"{total_size / 1_073_741_824:.1f} GB"
        elif total_size >= 1_048_576:
            human = f"{total_size / 1_048_576:.1f} MB"
        elif total_size >= 1024:
            human = f"{total_size / 1024:.1f} KB"
        else:
            human = f"{total_size} B"
        return StorageAnalytics(
            total_workspaces=len(all_ws),
            active_workspaces=len(active),
            total_files=total_files,
            total_size_bytes=total_size,
            total_size_human=human,
        )

    # ── Project registry (Tvasta auto-index) ────────────────────────────────

    @staticmethod
    def _norm_root(p: str) -> str:
        return p.replace("\\", "/").rstrip("/")

    @staticmethod
    def _leaf(p: str) -> str:
        leaf = p.rstrip("/").split("/")[-1]
        return leaf or p

    @staticmethod
    async def discover_projects(db: AsyncSession) -> list[ProjectRead]:
        """Seed/refresh the registry from CLI session roots + vault project roots.

        New projects start disabled (opt-in). Refreshes graphify-out / build_vault
        flags for existing rows. Never auto-enables anything.
        """
        from indra.domains.aditya.smriti.vault_scan import scan_vaults

        roots: dict[str, str] = {}  # lower(canonical) → canonical
        sessions = await db.execute(select(Session.project_path).distinct())
        for (pp,) in sessions.all():
            if pp:
                canon = PrthiviService._norm_root(pp)
                roots.setdefault(canon.lower(), canon)
        for v in scan_vaults():
            r = v.get("project_root")
            if r:
                canon = PrthiviService._norm_root(r)
                roots.setdefault(canon.lower(), canon)

        existing = {
            p.root_path.lower(): p
            for p in (await db.execute(select(Project))).scalars()
        }
        for low, canon in roots.items():
            p = existing.get(low)
            if p is None:
                # SECURITY INVARIANT: root_path is created ONLY here, from trusted
                # local discovery (CLI session cwds + the local Obsidian vault
                # registry). The pipeline executes graphify against it. Never add a
                # route/body that sets root_path without confining it to a workspace
                # base (Path.resolve() prefix check) — else it becomes RCE.
                p = Project(root_path=canon, name=PrthiviService._leaf(canon), enabled=False)
                db.add(p)
                existing[low] = p
            gout = Path(canon) / "graphify-out"
            p.graphify_out = str(gout) if gout.exists() else None
            p.has_vault_builder = (gout / "build_vault.py").exists()
        await db.commit()
        return await PrthiviService.list_projects(db)

    @staticmethod
    async def list_projects(db: AsyncSession) -> list[ProjectRead]:
        result = await db.execute(
            select(Project).order_by(Project.enabled.desc(), Project.root_path)
        )
        return [ProjectRead.model_validate(p, from_attributes=True) for p in result.scalars()]

    @staticmethod
    async def set_project_enabled(
        db: AsyncSession, project_id: uuid.UUID, enabled: bool
    ) -> ProjectRead:
        p = await db.get(Project, project_id)
        if p is None:
            raise IndraException(status_code=404, error_code="project_not_found", message="Project not found")
        if enabled:
            # Auto-index MAINTAINS an already-graphified project — it never does the
            # first full build (that's the one-time /graphify skill run). Refuse to
            # enable a project with no graphify-out so we don't grind graphify over a
            # huge/unsuitable tree (a home dir, a repo with node_modules, etc.).
            gout = Path(p.root_path) / "graphify-out"
            if not gout.exists():
                raise IndraException(
                    status_code=409,
                    error_code="needs_graphify",
                    message="Run /graphify on this project once before enabling auto-index.",
                )
            p.graphify_out = str(gout)
            p.has_vault_builder = (gout / "build_vault.py").exists()
        p.enabled = enabled
        await db.commit()
        await db.refresh(p)
        return ProjectRead.model_validate(p, from_attributes=True)

    @staticmethod
    async def reindex_project(
        db: AsyncSession, project_id: uuid.UUID, mode: str = "fast"
    ) -> RunRead:
        """Queue an index run. The Tvasta worker executes it off the request path.
        mode: "fast" (deterministic) | "semantic" (AI agy build)."""
        p = await db.get(Project, project_id)
        if p is None:
            raise IndraException(status_code=404, error_code="project_not_found", message="Project not found")
        if not p.enabled:
            raise IndraException(
                status_code=409,
                error_code="project_disabled",
                message="Enable the project before indexing it.",
            )
        # Don't double-queue: one active (queued|running) index run per project.
        active = await db.execute(
            select(Task)
            .where(
                Task.status.in_(("queued", "running")),
                Task.input["kind"].astext == "index",
                Task.input["project_id"].astext == str(project_id),
            )
            .limit(1)
        )
        if active.scalars().first() is not None:
            raise IndraException(
                status_code=409,
                error_code="project_indexing",
                message="An index run is already queued or running for this project.",
            )
        # Tvasta owns execution; Prthivi owns the registry.
        from indra.domains.aditya.tvastah.pipeline import enqueue

        task = await enqueue(db, p, trigger="manual", mode=("semantic" if mode == "semantic" else "fast"))
        return _run_read(task)

    @staticmethod
    async def kg_query(
        db: AsyncSession, project_id: uuid.UUID, query: str, mode: str = "mix"
    ) -> KgQueryResponse:
        """Graph-aware (LightRAG) retrieval over a project's knowledge graph."""
        from indra.domains.aditya.smriti import lightrag_store

        p = await db.get(Project, project_id)
        if p is None:
            raise IndraException(status_code=404, error_code="project_not_found", message="Project not found")
        if not lightrag_store.available():
            raise IndraException(
                status_code=503,
                error_code="lightrag_unavailable",
                message="LightRAG / local embeddings not available.",
            )
        gout = p.graphify_out or str(Path(p.root_path) / "graphify-out")
        context = await lightrag_store.query(gout, query, mode=mode)
        return KgQueryResponse(project_id=project_id, mode=mode, context=context)

    @staticmethod
    async def list_runs(
        db: AsyncSession, project_id: uuid.UUID | None = None, limit: int = 20
    ) -> list[RunRead]:
        stmt = (
            select(Task)
            .where(Task.input["kind"].astext == "index")
            .order_by(Task.created_at.desc())
            .limit(limit)
        )
        if project_id is not None:
            stmt = stmt.where(Task.input["project_id"].astext == str(project_id))
        rows = (await db.execute(stmt)).scalars()
        return [_run_read(t) for t in rows]
