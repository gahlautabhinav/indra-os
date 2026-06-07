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
from indra.models.workspace import Workspace

from .schemas import FileEntry, FileListResponse, StorageAnalytics, WorkspaceRead


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
