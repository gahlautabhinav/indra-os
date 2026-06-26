"""
Prthivi router — Storage & Workspace endpoints.
VASU domain: Infrastructure layer.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import (
    FileListResponse,
    KgQueryRequest,
    KgQueryResponse,
    ProjectRead,
    RunRead,
    StorageAnalytics,
    WorkspaceCreate,
    WorkspaceRead,
)
from .service import PrthiviService

router = APIRouter()


# ── Project registry (Tvasta auto-index) ────────────────────────────────────


@router.get("/projects", response_model=list[ProjectRead], tags=["projects"])
async def list_projects(db: AsyncSession = Depends(get_db)) -> list[ProjectRead]:
    return await PrthiviService.list_projects(db)


@router.post("/projects/discover", response_model=list[ProjectRead], tags=["projects"])
async def discover_projects(db: AsyncSession = Depends(get_db)) -> list[ProjectRead]:
    return await PrthiviService.discover_projects(db)


@router.post("/projects/{project_id}/enable", response_model=ProjectRead, tags=["projects"])
async def enable_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> ProjectRead:
    return await PrthiviService.set_project_enabled(db, project_id, True)


@router.post("/projects/{project_id}/disable", response_model=ProjectRead, tags=["projects"])
async def disable_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> ProjectRead:
    return await PrthiviService.set_project_enabled(db, project_id, False)


@router.post(
    "/projects/{project_id}/reindex",
    response_model=RunRead,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["projects"],
)
async def reindex_project(
    project_id: uuid.UUID,
    mode: str = Query("fast", pattern="^(fast|semantic)$"),
    db: AsyncSession = Depends(get_db),
) -> RunRead:
    return await PrthiviService.reindex_project(db, project_id, mode=mode)


@router.post("/projects/{project_id}/kg-query", response_model=KgQueryResponse, tags=["projects"])
async def kg_query(
    project_id: uuid.UUID, body: KgQueryRequest, db: AsyncSession = Depends(get_db)
) -> KgQueryResponse:
    return await PrthiviService.kg_query(db, project_id, body.query, body.mode)


@router.get("/projects/{project_id}/kg-graph", tags=["projects"])
async def kg_graph(
    project_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return await PrthiviService.kg_graph(db, project_id)


@router.get("/projects/{project_id}/graph-html", tags=["projects"])
async def graph_html(
    project_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> FileResponse:
    path = await PrthiviService.graph_html_path(db, project_id)
    return FileResponse(path, media_type="text/html")


@router.get("/projects/runs", response_model=list[RunRead], tags=["projects"])
async def list_all_runs(
    limit: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)
) -> list[RunRead]:
    return await PrthiviService.list_runs(db, limit=limit)


@router.get("/projects/{project_id}/runs", response_model=list[RunRead], tags=["projects"])
async def list_project_runs(
    project_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[RunRead]:
    return await PrthiviService.list_runs(db, project_id=project_id, limit=limit)


@router.get("/storage/workspaces", response_model=list[WorkspaceRead], tags=["storage"])
async def list_workspaces(db: AsyncSession = Depends(get_db)) -> list[WorkspaceRead]:
    return await PrthiviService.list_workspaces(db)


@router.post("/storage/workspaces", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED, tags=["storage"])
async def create_workspace(
    body: WorkspaceCreate, db: AsyncSession = Depends(get_db)
) -> WorkspaceRead:
    return await PrthiviService.create_workspace(db, body.name, body.path, body.description)


@router.post("/storage/workspaces/{workspace_id}/reindex", response_model=WorkspaceRead, tags=["storage"])
async def reindex_workspace(
    workspace_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> WorkspaceRead:
    return await PrthiviService.reindex_workspace(db, workspace_id)


@router.get("/storage/workspaces/{workspace_id}/files", response_model=FileListResponse, tags=["storage"])
async def list_workspace_files(
    workspace_id: uuid.UUID,
    path: str = Query(default="", description="Subpath within workspace"),
    db: AsyncSession = Depends(get_db),
) -> FileListResponse:
    return await PrthiviService.get_workspace_files(db, workspace_id, path)


@router.delete("/storage/workspaces/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["storage"])
async def delete_workspace(
    workspace_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> None:
    await PrthiviService.delete_workspace(db, workspace_id)


@router.get("/storage/analytics", response_model=StorageAnalytics, tags=["storage"])
async def storage_analytics(db: AsyncSession = Depends(get_db)) -> StorageAnalytics:
    return await PrthiviService.get_analytics(db)
