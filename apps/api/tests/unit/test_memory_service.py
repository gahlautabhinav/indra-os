"""Unit tests for Smriti memory service (no DB, no network)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from indra.domains.aditya.smriti.schemas import MemoryIngestRequest, MemorySearchRequest
from indra.domains.aditya.smriti.service import SmritiService


@pytest.fixture()
def service() -> SmritiService:
    return SmritiService()


# ── embedding_enabled ─────────────────────────────────────────────────────────

def test_embedding_disabled_when_no_key(service: SmritiService) -> None:
    with patch("indra.domains.aditya.smriti.service.settings") as mock_settings:
        mock_settings.openai_api_key = ""
        assert service.embedding_enabled() is False


def test_embedding_enabled_when_key_set(service: SmritiService) -> None:
    with patch("indra.domains.aditya.smriti.service.settings") as mock_settings:
        mock_settings.openai_api_key = "sk-test"
        assert service.embedding_enabled() is True


# ── _embed ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_embed_returns_none_when_disabled(service: SmritiService) -> None:
    with patch("indra.domains.aditya.smriti.service.settings") as mock_settings:
        mock_settings.openai_api_key = ""
        result = await service._embed("hello world")
    assert result is None


@pytest.mark.asyncio
async def test_embed_returns_none_on_api_error(service: SmritiService) -> None:
    with patch("indra.domains.aditya.smriti.service.settings") as mock_settings:
        mock_settings.openai_api_key = "sk-test"
        mock_settings.embedding_model = "text-embedding-3-small"
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post.side_effect = Exception("network error")
            mock_client_cls.return_value = mock_client

            result = await service._embed("hello world")
    assert result is None


# ── ingest ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ingest_without_embedding(service: SmritiService) -> None:
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    chunk_id = uuid.uuid4()
    from datetime import datetime, timezone

    def mock_refresh(obj: object) -> None:
        from indra.models.memory import MemoryChunk
        if isinstance(obj, MemoryChunk):
            obj.id = chunk_id
            obj.created_at = datetime(2026, 6, 7, tzinfo=timezone.utc)

    db.refresh.side_effect = mock_refresh

    req = MemoryIngestRequest(content="Remember this crucial fact about agents.")

    with patch.object(service, "_embed", new=AsyncMock(return_value=None)):
        result = await service.ingest(db, req)

    assert result.id == chunk_id
    assert result.has_embedding is False
    assert "Remember this" in result.content_preview


@pytest.mark.asyncio
async def test_ingest_with_embedding(service: SmritiService) -> None:
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    chunk_id = uuid.uuid4()
    fake_embedding = [0.1] * 1536

    from datetime import datetime, timezone

    def mock_refresh(obj: object) -> None:
        from indra.models.memory import MemoryChunk
        if isinstance(obj, MemoryChunk):
            obj.id = chunk_id
            obj.created_at = datetime(2026, 6, 7, tzinfo=timezone.utc)

    db.refresh.side_effect = mock_refresh

    req = MemoryIngestRequest(content="Vector search is powered by pgvector.")

    with patch.object(service, "_embed", new=AsyncMock(return_value=fake_embedding)):
        result = await service.ingest(db, req)

    assert result.has_embedding is True


# ── content_preview truncation ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ingest_truncates_long_content(service: SmritiService) -> None:
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    from datetime import datetime, timezone

    def mock_refresh(obj: object) -> None:
        from indra.models.memory import MemoryChunk
        if isinstance(obj, MemoryChunk):
            obj.id = uuid.uuid4()
            obj.created_at = datetime(2026, 6, 7, tzinfo=timezone.utc)

    db.refresh.side_effect = mock_refresh

    long_content = "x" * 500
    req = MemoryIngestRequest(content=long_content)

    with patch.object(service, "_embed", new=AsyncMock(return_value=None)):
        result = await service.ingest(db, req)

    assert result.content_preview.endswith("…")
    assert len(result.content_preview) <= 121  # 120 chars + ellipsis


# ── search mode selection ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_falls_back_to_trigram_when_no_embedding(
    service: SmritiService,
) -> None:
    db = AsyncMock()
    req = MemorySearchRequest(query="find related memories")

    with (
        patch.object(service, "_embed", new=AsyncMock(return_value=None)),
        patch.object(
            service,
            "_trigram_search",
            new=AsyncMock(
                return_value=MagicMock(search_mode="trigram", results=[], total=0, query=req.query)
            ),
        ) as mock_trgm,
    ):
        result = await service.search(db, req)

    mock_trgm.assert_called_once()
    assert result.search_mode == "trigram"


@pytest.mark.asyncio
async def test_search_uses_vector_when_embedding_available(
    service: SmritiService,
) -> None:
    db = AsyncMock()
    req = MemorySearchRequest(query="vector search query")
    fake_embedding = [0.5] * 1536

    with (
        patch.object(service, "_embed", new=AsyncMock(return_value=fake_embedding)),
        patch.object(
            service,
            "_vector_search",
            new=AsyncMock(
                return_value=MagicMock(search_mode="vector", results=[], total=0, query=req.query)
            ),
        ) as mock_vec,
    ):
        result = await service.search(db, req)

    mock_vec.assert_called_once()
    assert result.search_mode == "vector"
