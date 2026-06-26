"""
Smriti schemas — Memory + RAG API contracts.
ADITYA domain: Governance layer.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

# ── Ingest ────────────────────────────────────────────────────────────────────

class MemoryIngestRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=32_000)
    agent_id: uuid.UUID | None = None
    metadata: dict = Field(default_factory=dict)


class MemoryIngestResponse(BaseModel):
    id: uuid.UUID
    content_preview: str
    has_embedding: bool
    created_at: datetime


# ── Search ────────────────────────────────────────────────────────────────────

class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2_000)
    limit: int = Field(10, ge=1, le=50)
    agent_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    source_types: list[str] | None = None
    similarity_threshold: float = Field(0.5, ge=0.0, le=1.0)


class MemorySearchResult(BaseModel):
    id: uuid.UUID
    content: str
    similarity: float
    agent_id: uuid.UUID | None
    project_id: uuid.UUID | None = None
    source_type: str | None = None
    metadata: dict
    created_at: datetime


class MemorySearchResponse(BaseModel):
    results: list[MemorySearchResult]
    total: int
    query: str
    search_mode: str  # "vector" | "trigram"


# ── List ──────────────────────────────────────────────────────────────────────

class MemoryChunkRead(BaseModel):
    id: uuid.UUID
    content: str
    has_embedding: bool
    agent_id: uuid.UUID | None
    metadata: dict
    created_at: datetime


class MemoryListResponse(BaseModel):
    chunks: list[MemoryChunkRead]
    total: int
    limit: int
    offset: int


# ── Stats ─────────────────────────────────────────────────────────────────────

class MemoryStatsResponse(BaseModel):
    total_chunks: int
    chunks_with_embedding: int
    embedding_coverage_pct: float
    embedding_enabled: bool
