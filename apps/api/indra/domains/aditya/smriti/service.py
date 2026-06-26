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
from collections import defaultdict
from typing import TYPE_CHECKING, Any

import httpx
import structlog
from sqlalchemy import func, literal_column, select, text
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from indra.domains.aditya.smriti.ingest import MemorySource

from indra.config import settings
from indra.domains.aditya.smriti import local_embed
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

    # ── Project-scoped ingestion (Smriti second brain) ────────────────────────

    async def upsert_sources(
        self, db: AsyncSession, sources: list[MemorySource]
    ) -> dict[str, int]:
        """Incrementally upsert ingested sources, keyed by (project_id, source_type,
        source_id). Unchanged content (same hash) is skipped; sources that vanished
        from a (project, type) are pruned. Free path: no embedding (trigram search)."""
        stats = {"inserted": 0, "updated": 0, "skipped": 0, "pruned": 0}
        if not sources:
            return stats

        groups: dict[tuple[uuid.UUID, str], list[MemorySource]] = defaultdict(list)
        for s in sources:
            groups[(s.project_id, s.source_type)].append(s)

        to_embed: list[tuple[MemoryChunk, str]] = []
        for (pid, stype), items in groups.items():
            rows = (
                await db.execute(
                    select(MemoryChunk).where(
                        MemoryChunk.project_id == pid, MemoryChunk.source_type == stype
                    )
                )
            ).scalars().all()
            existing = {c.source_id: c for c in rows}
            seen: set[str] = set()
            for s in items:
                seen.add(s.source_id)
                cur = existing.get(s.source_id)
                if cur is None:
                    ch = MemoryChunk(
                        project_id=pid, source_type=stype, source_id=s.source_id,
                        content=s.content, content_hash=s.content_hash,
                        metadata_=s.metadata, embedding=None, embedding_local=None,
                    )
                    db.add(ch)
                    to_embed.append((ch, s.content))
                    stats["inserted"] += 1
                elif cur.content_hash != s.content_hash:
                    cur.content = s.content
                    cur.content_hash = s.content_hash
                    cur.metadata_ = s.metadata
                    cur.embedding = None
                    to_embed.append((cur, s.content))
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
                    if cur.embedding_local is None:
                        to_embed.append((cur, s.content))  # backfill missing embedding
            for sid, c in existing.items():
                if sid not in seen:
                    await db.delete(c)
                    stats["pruned"] += 1

        # Embed new/changed chunks locally (free) in one batch.
        if to_embed and local_embed.available():
            vecs = await local_embed.embed_texts([c for _, c in to_embed])
            for (ch, _), v in zip(to_embed, vecs, strict=False):
                ch.embedding_local = v

        await db.commit()
        return stats

    # ── Search ────────────────────────────────────────────────────────────────

    async def search(
        self,
        db: AsyncSession,
        req: MemorySearchRequest,
    ) -> MemorySearchResponse:
        # Prefer free local embeddings, then OpenAI, then trigram.
        if local_embed.available():
            qv = await local_embed.embed_one(req.query)
            return await self._local_vector_search(db, req, qv)
        query_embedding = await self._embed(req.query)
        if query_embedding is not None:
            return await self._vector_search(db, req, query_embedding)
        return await self._trigram_search(db, req)

    async def _local_vector_search(
        self,
        db: AsyncSession,
        req: MemorySearchRequest,
        query_vector: list[float],
    ) -> MemorySearchResponse:
        from sqlalchemy.sql.elements import Label

        embedding_str = "[" + ",".join(str(v) for v in query_vector) + "]"
        distance = f"(embedding_local <=> '{embedding_str}'::vector)"
        similarity_expr: Label[float] = literal_column(f"1 - {distance}").label("similarity")

        stmt = (
            select(MemoryChunk, similarity_expr)
            .where(MemoryChunk.embedding_local.is_not(None))
            .where(literal_column(f"1 - {distance}") >= req.similarity_threshold)
            .order_by(literal_column(distance))
            .limit(req.limit)
        )
        if req.agent_id is not None:
            stmt = stmt.where(MemoryChunk.agent_id == req.agent_id)
        if req.project_id is not None:
            stmt = stmt.where(MemoryChunk.project_id == req.project_id)
        if req.source_types:
            stmt = stmt.where(MemoryChunk.source_type.in_(req.source_types))

        rows = await db.execute(stmt)
        results = [
            MemorySearchResult(
                id=chunk.id,
                content=chunk.content,
                similarity=round(float(similarity), 4),
                agent_id=chunk.agent_id,
                project_id=chunk.project_id,
                source_type=chunk.source_type,
                metadata=chunk.metadata_,
                created_at=chunk.created_at,
            )
            for chunk, similarity in rows.all()
        ]
        return MemorySearchResponse(
            results=results, total=len(results), query=req.query, search_mode="local-vector"
        )

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
        if req.project_id is not None:
            stmt = stmt.where(MemoryChunk.project_id == req.project_id)
        if req.source_types:
            stmt = stmt.where(MemoryChunk.source_type.in_(req.source_types))

        rows = await db.execute(stmt)
        results = [
            MemorySearchResult(
                id=chunk.id,
                content=chunk.content,
                similarity=round(float(similarity), 4),
                agent_id=chunk.agent_id,
                project_id=chunk.project_id,
                source_type=chunk.source_type,
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
        if req.project_id is not None:
            stmt = stmt.where(MemoryChunk.project_id == req.project_id)
        if req.source_types:
            stmt = stmt.where(MemoryChunk.source_type.in_(req.source_types))

        rows = await db.execute(stmt)
        results = [
            MemorySearchResult(
                id=chunk.id,
                content=chunk.content,
                similarity=round(float(similarity), 4),
                agent_id=chunk.agent_id,
                project_id=chunk.project_id,
                source_type=chunk.source_type,
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
                    has_embedding=c.embedding is not None or c.embedding_local is not None,
                    agent_id=c.agent_id,
                    project_id=c.project_id,
                    source_type=c.source_type,
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
                MemoryChunk.embedding.is_not(None) | MemoryChunk.embedding_local.is_not(None)
            )
        )
        embedded = embedded_result.scalar_one()

        return MemoryStatsResponse(
            total_chunks=total,
            chunks_with_embedding=embedded,
            embedding_coverage_pct=round((embedded / total * 100) if total > 0 else 0.0, 1),
            embedding_enabled=self.embedding_enabled() or local_embed.available(),
        )


smriti_service = SmritiService()
