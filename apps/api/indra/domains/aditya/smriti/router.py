"""
Smriti router — Memory + RAG endpoints.
ADITYA domain: Governance layer.

Endpoints:
  POST /api/v1/memory/chunks        — ingest a memory chunk (embed + store)
  GET  /api/v1/memory/chunks        — list chunks (paginated)
  POST /api/v1/memory/search        — semantic / trigram search
  GET  /api/v1/memory/stats         — coverage stats
  DELETE /api/v1/memory/chunks/{id} — delete a chunk
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from indra.database import get_db

from .schemas import (
    MemoryIngestRequest,
    MemoryIngestResponse,
    MemoryListResponse,
    MemorySearchRequest,
    MemorySearchResponse,
    MemoryStatsResponse,
)
from .service import smriti_service

router = APIRouter()


@router.post(
    "/memory/chunks",
    response_model=MemoryIngestResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["memory"],
)
async def ingest_chunk(
    req: MemoryIngestRequest,
    db: AsyncSession = Depends(get_db),
) -> MemoryIngestResponse:
    return await smriti_service.ingest(db, req)


@router.get("/memory/chunks", response_model=MemoryListResponse, tags=["memory"])
async def list_chunks(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    agent_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> MemoryListResponse:
    return await smriti_service.list_chunks(db, limit=limit, offset=offset, agent_id=agent_id)


@router.post("/memory/search", response_model=MemorySearchResponse, tags=["memory"])
async def search_memory(
    req: MemorySearchRequest,
    db: AsyncSession = Depends(get_db),
) -> MemorySearchResponse:
    return await smriti_service.search(db, req)


@router.get("/memory/stats", response_model=MemoryStatsResponse, tags=["memory"])
async def get_memory_stats(
    db: AsyncSession = Depends(get_db),
) -> MemoryStatsResponse:
    return await smriti_service.get_stats(db)


@router.delete(
    "/memory/chunks/{chunk_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["memory"],
)
async def delete_chunk(
    chunk_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    deleted = await smriti_service.delete_chunk(db, chunk_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory chunk not found")
