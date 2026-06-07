"""
Smriti service — Memory storage + RAG retrieval.
ADITYA domain: Governance layer.

RAG pipeline:
  Ingest: content → embed (OpenAI) → store in pgvector
  Search: query → embed → cosine similarity → ranked results
  Fallback: if no embedding API configured → trigram text search
"""

from __future__ import annotations

import uuid
from typing import Any

import httpx
import structlog
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from indra.config import settings
from indra.models.memory import MemoryChunk

from .schemas import (
    MemoryChunkRead,
    MemoryIngestRequest,
    MemoryIngestResponse,
    MemoryListResponse,
    MemorySearchRequest,
    MemorySearchResponse,
    MemorySearchResult,
    MemoryStatsResponse,
)

logger = structlog.get_logger()


class SmritiService:
    """Smriti — the memory deva. Stores and retrieves knowledge chunks."""

    # ── Embedding ─────────────────────────────────────────────────────────────

    def embedding_enabled(self) -> bool:
        return bool(settings.openai_api_key)

    async def _embed(self, text_input: str) -> list[float] | None:
        if not self.embedding_enabled():
            return None
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    json={
                        "model": settings.embedding_model,
                        "input": text_input,
                        "encoding_format": "float",
                    },
                )
                resp.raise_for_status()
                data: dict[str, Any] = resp.json()
                return data["data"][0]["embedding"]  # type: ignore[no-any-return]
        except Exception as exc:
            logger.warning("embedding_failed", error=str(exc))
            return None

    # ── Ingest ────────────────────────────────────────────────────────────────

    async def ingest(
        self,
        db: AsyncSession,
        req: MemoryIngestRequest,
    ) -> MemoryIngestResponse:
        embedding = await self._embed(req.content)

        chunk = MemoryChunk(
            agent_id=req.agent_id,
            content=req.content,
            embedding=embedding,
            metadata_=req.metadata,
        )
        db.add(chunk)
        await db.commit()
        await db.refresh(chunk)

        logger.info(
            "memory_ingested",
            chunk_id=str(chunk.id),
            has_embedding=embedding is not None,
            content_len=len(req.content),
        )

        return MemoryIngestResponse(
            id=chunk.id,
            content_preview=req.content[:120] + ("…" if len(req.content) > 120 else ""),
            has_embedding=embedding is not None,
            created_at=chunk.created_at,
        )

    # ── Search ────────────────────────────────────────────────────────────────

    async def search(
        self,
        db: AsyncSession,
        req: MemorySearchRequest,
    ) -> MemorySearchResponse:
        query_embedding = await self._embed(req.query)

        if query_embedding is not None:
            return await self._vector_search(db, req, query_embedding)
        return await self._trigram_search(db, req)

    async def _vector_search(
        self,
        db: AsyncSession,
        req: MemorySearchRequest,
        query_embedding: list[float],
    ) -> MemorySearchResponse:
        # pgvector cosine distance: 1 - cosine_similarity
        # similarity = 1 - distance
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        from sqlalchemy.sql.elements import Label
        similarity_expr: Label[float] = text(
            f"1 - (embedding <=> '{embedding_str}'::vector)"
        ).label("similarity")

        stmt = (
            select(
                MemoryChunk,
                similarity_expr,
            )
            .where(MemoryChunk.embedding.is_not(None))
            .where(
                text(f"1 - (embedding <=> '{embedding_str}'::vector) >= {req.similarity_threshold}")
            )
            .order_by(text(f"embedding <=> '{embedding_str}'::vector"))
            .limit(req.limit)
        )

        if req.agent_id is not None:
            stmt = stmt.where(MemoryChunk.agent_id == req.agent_id)

        rows = await db.execute(stmt)
        results = [
            MemorySearchResult(
                id=chunk.id,
                content=chunk.content,
                similarity=round(float(similarity), 4),
                agent_id=chunk.agent_id,
                metadata=chunk.metadata_,
                created_at=chunk.created_at,
            )
            for chunk, similarity in rows.all()
        ]

        return MemorySearchResponse(
            results=results,
            total=len(results),
            query=req.query,
            search_mode="vector",
        )

    async def _trigram_search(
        self,
        db: AsyncSession,
        req: MemorySearchRequest,
    ) -> MemorySearchResponse:
        stmt = (
            select(
                MemoryChunk,
                func.similarity(MemoryChunk.content, req.query).label("similarity"),
            )
            .where(
                func.similarity(MemoryChunk.content, req.query) >= req.similarity_threshold
            )
            .order_by(
                func.similarity(MemoryChunk.content, req.query).desc()
            )
            .limit(req.limit)
        )

        if req.agent_id is not None:
            stmt = stmt.where(MemoryChunk.agent_id == req.agent_id)

        rows = await db.execute(stmt)
        results = [
            MemorySearchResult(
                id=chunk.id,
                content=chunk.content,
                similarity=round(float(similarity), 4),
                agent_id=chunk.agent_id,
                metadata=chunk.metadata_,
                created_at=chunk.created_at,
            )
            for chunk, similarity in rows.all()
        ]

        return MemorySearchResponse(
            results=results,
            total=len(results),
            query=req.query,
            search_mode="trigram",
        )

    # ── List ──────────────────────────────────────────────────────────────────

    async def list_chunks(
        self,
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        agent_id: uuid.UUID | None = None,
    ) -> MemoryListResponse:
        stmt = select(MemoryChunk).order_by(MemoryChunk.created_at.desc())
        count_stmt = select(func.count()).select_from(MemoryChunk)

        if agent_id is not None:
            stmt = stmt.where(MemoryChunk.agent_id == agent_id)
            count_stmt = count_stmt.where(MemoryChunk.agent_id == agent_id)

        total_result = await db.execute(count_stmt)
        total = total_result.scalar_one()

        rows = await db.execute(stmt.limit(limit).offset(offset))
        chunks = rows.scalars().all()

        return MemoryListResponse(
            chunks=[
                MemoryChunkRead(
                    id=c.id,
                    content=c.content,
                    has_embedding=c.embedding is not None,
                    agent_id=c.agent_id,
                    metadata=c.metadata_,
                    created_at=c.created_at,
                )
                for c in chunks
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete_chunk(
        self,
        db: AsyncSession,
        chunk_id: uuid.UUID,
    ) -> bool:
        row = await db.get(MemoryChunk, chunk_id)
        if row is None:
            return False
        await db.delete(row)
        await db.commit()
        return True

    # ── Stats ─────────────────────────────────────────────────────────────────

    async def get_stats(self, db: AsyncSession) -> MemoryStatsResponse:
        total_result = await db.execute(
            select(func.count()).select_from(MemoryChunk)
        )
        total = total_result.scalar_one()

        embedded_result = await db.execute(
            select(func.count()).select_from(MemoryChunk).where(
                MemoryChunk.embedding.is_not(None)
            )
        )
        embedded = embedded_result.scalar_one()

        return MemoryStatsResponse(
            total_chunks=total,
            chunks_with_embedding=embedded,
            embedding_coverage_pct=round((embedded / total * 100) if total > 0 else 0.0, 1),
            embedding_enabled=self.embedding_enabled(),
        )


smriti_service = SmritiService()
