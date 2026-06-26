"""LightRAG store — per-project KG + vector hybrid retrieval, seeded from graphify.

The graphify graph.json IS the knowledge graph, so we seed LightRAG directly via
ainsert_custom_kg (symbols → entities, typed edges → relationships) — NO LLM
extraction. Embeddings are local (model2vec, free); query keyword extraction uses a
headless Claude session. Retrieval runs with only_need_context, so no generation LLM
call is made — callers get the KG-aware context back.

Store lives in <graphify-out>/.lightrag (derived, regenerable). seed() rebuilds it
from scratch each index so it always matches the current graph (sync guarantee).
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
from typing import Any

import structlog

from indra.domains.aditya.smriti import local_embed
from indra.domains.aditya.smriti.claude_llm import claude_complete

logger = structlog.get_logger()

_EMBED_DIM = 256
# Skip seeding pathologically large graphs into a per-project store.
_MAX_NODES = 4000
# One LightRAG instance per working_dir, kept warm across calls.
_CACHE: dict[str, Any] = {}


def available() -> bool:
    try:
        import lightrag  # noqa: F401
    except ImportError:
        return False
    return local_embed.available()


def _working_dir(graphify_out: str) -> str:
    return os.path.join(graphify_out, ".lightrag")


async def _embed(texts: list[str]):  # type: ignore[no-untyped-def]
    import numpy as np

    vecs = await asyncio.to_thread(local_embed._encode, list(texts))
    return np.array(vecs, dtype=np.float32)


async def _get_rag(graphify_out: str):  # type: ignore[no-untyped-def]
    wd = _working_dir(graphify_out)
    if wd in _CACHE:
        return _CACHE[wd]
    os.makedirs(wd, exist_ok=True)
    from lightrag import LightRAG
    from lightrag.kg.shared_storage import initialize_pipeline_status
    from lightrag.utils import EmbeddingFunc

    rag = LightRAG(
        working_dir=wd,
        embedding_func=EmbeddingFunc(embedding_dim=_EMBED_DIM, max_token_size=512, func=_embed),
        llm_model_func=claude_complete,
    )
    await rag.initialize_storages()
    await initialize_pipeline_status()
    _CACHE[wd] = rag
    return rag


def _graph_to_custom_kg(graphify_out: str) -> dict[str, list[dict[str, Any]]]:
    gj = os.path.join(graphify_out, "graph.json")
    try:
        with open(gj, encoding="utf-8", errors="replace") as f:
            graph = json.load(f)
    except (OSError, ValueError):
        return {"chunks": [], "entities": [], "relationships": []}

    labels: dict[int, str] = {}
    lf = os.path.join(graphify_out, ".graphify_labels.json")
    if os.path.exists(lf):
        try:
            with open(lf, encoding="utf-8") as f:
                labels = {int(k): str(v) for k, v in json.load(f).items()}
        except (OSError, ValueError):
            labels = {}

    def cname(cid: Any) -> str:
        return labels.get(cid, f"Community {cid}") if isinstance(cid, int) else "Uncategorized"

    nodes = [n for n in (graph.get("nodes") or []) if isinstance(n, dict) and "id" in n]
    chunks: list[dict[str, Any]] = []
    entities: list[dict[str, Any]] = []
    relationships: list[dict[str, Any]] = []
    name_of: dict[Any, str] = {}

    for n in nodes:
        nid = n["id"]
        label = str(n.get("label") or nid)
        sf = n.get("source_file", "")
        cid = n.get("community", -1)
        name_of[nid] = label
        sid = f"chunk-{nid}"
        content = f"{label} in {sf} — community {cname(cid)}"
        chunks.append({"content": content, "source_id": sid})
        entities.append({
            "entity_name": label,
            "entity_type": str(n.get("file_type") or "symbol"),
            "description": content,
            "source_id": sid,
        })

    for e in graph.get("links") or graph.get("edges") or []:
        if not isinstance(e, dict):
            continue
        s = e.get("source", e.get("_src"))
        t = e.get("target", e.get("_tgt"))
        if s in name_of and t in name_of and name_of[s] != name_of[t]:
            rel = str(e.get("relation", "related"))
            relationships.append({
                "src_id": name_of[s],
                "tgt_id": name_of[t],
                "description": rel,
                "keywords": rel,
                "weight": float(e.get("weight") or 1.0),
                "source_id": f"chunk-{s}",
            })

    return {"chunks": chunks, "entities": entities, "relationships": relationships}


async def seed(graphify_out: str) -> dict[str, Any]:
    """Rebuild the project's LightRAG store from its current graph.json."""
    kg = _graph_to_custom_kg(graphify_out)
    if not kg["entities"]:
        return {"entities": 0, "relationships": 0, "chunks": 0}
    if len(kg["entities"]) > _MAX_NODES:
        return {"entities": 0, "skipped": len(kg["entities"]), "reason": "graph too large"}

    wd = _working_dir(graphify_out)
    _CACHE.pop(wd, None)
    await asyncio.to_thread(shutil.rmtree, wd, True)  # fresh rebuild → always in sync

    rag = await _get_rag(graphify_out)
    await rag.ainsert_custom_kg(kg)
    return {
        "entities": len(kg["entities"]),
        "relationships": len(kg["relationships"]),
        "chunks": len(kg["chunks"]),
    }


async def query(graphify_out: str, q: str, mode: str = "mix", top_k: int = 12) -> str:
    """KG-aware retrieval. Returns the retrieved context (no LLM generation)."""
    if not os.path.isdir(_working_dir(graphify_out)):
        return ""
    from lightrag import QueryParam

    rag = await _get_rag(graphify_out)
    result = await rag.aquery(
        q, QueryParam(mode=mode, only_need_context=True, top_k=top_k, enable_rerank=False)
    )
    return str(result) if result else ""
