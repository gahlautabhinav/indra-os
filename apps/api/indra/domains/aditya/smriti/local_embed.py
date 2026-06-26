"""Free local embeddings via model2vec — static, CPU-only, no API cost (256-dim).

Used by Smriti for project-ingestion semantic search. The model loads once (lazy
singleton) and encoding runs off the event loop in a worker thread. If model2vec
isn't installed or is disabled, callers fall back to trigram search.
"""

from __future__ import annotations

import asyncio
from functools import lru_cache

from indra.config import settings

EMBED_DIM = 256


def available() -> bool:
    if not settings.local_embeddings_enabled:
        return False
    try:
        import model2vec  # noqa: F401
    except ImportError:
        return False
    return True


@lru_cache(maxsize=1)
def _model():  # type: ignore[no-untyped-def]
    from model2vec import StaticModel

    return StaticModel.from_pretrained(settings.local_embed_model)


def _encode(texts: list[str]) -> list[list[float]]:
    vecs = _model().encode(texts)
    return [[float(x) for x in row] for row in vecs]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return await asyncio.to_thread(_encode, texts)


async def embed_one(text: str) -> list[float]:
    out = await embed_texts([text])
    return out[0]
