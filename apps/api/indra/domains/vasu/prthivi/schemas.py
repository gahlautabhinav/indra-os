from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str
    path: str
    description: str | None = None


class WorkspaceRead(BaseModel):
    id: uuid.UUID
    name: str
    path: str
    description: str | None
    status: str
    file_count: int
    size_bytes: int
    last_indexed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FileEntry(BaseModel):
    name: str
    path: str
    type: Literal["file", "directory"]
    size: int
    modified_at: str


class FileListResponse(BaseModel):
    workspace_id: uuid.UUID
    path: str
    entries: list[FileEntry]
    total: int


class StorageAnalytics(BaseModel):
    total_workspaces: int
    active_workspaces: int
    total_files: int
    total_size_bytes: int
    total_size_human: str


# ── Project registry (Tvasta auto-index) ────────────────────────────────────


class ProjectRead(BaseModel):
    id: uuid.UUID
    root_path: str
    name: str
    enabled: bool
    graphify_out: str | None
    has_vault_builder: bool
    status: str
    index_version: int
    last_indexed_at: datetime | None
    stages: list
    error: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RunRead(BaseModel):
    id: uuid.UUID
    project_id: str | None
    name: str
    status: str
    trigger: str | None
    stages: list
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
