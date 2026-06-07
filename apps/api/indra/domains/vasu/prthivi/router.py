"""
Prthivi router — Storage & Workspace endpoints.
VASU domain: Infrastructure layer.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import FileListResponse, StorageAnalytics, WorkspaceCreate, WorkspaceRead
from .service import PrthiviService

router = APIRouter()


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
