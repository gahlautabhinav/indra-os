"""Smriti ingestion — turn a project's graphify knowledge into MemorySource records
for the second-brain store.

P4 sources: graph **symbols** (each with its file, community name, and call relations)
and **communities** (named summaries). The Obsidian vault notes are the same data
rendered as markdown, so ingesting the graph covers them. Each source carries a
content_hash so re-ingestion is incremental (unchanged chunks skipped, deleted symbols
pruned).
"""

from __future__ import annotations

import hashlib
import json
import os
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

_MAX_RELS = 12
_MAX_COMMUNITY_MEMBERS = 40


@dataclass(frozen=True, slots=True)
class MemorySource:
    project_id: uuid.UUID
    source_type: str
    source_id: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def content_hash(self) -> str:
        return hashlib.sha256(self.content.encode("utf-8", "replace")).hexdigest()


def _load_labels(graphify_out: str) -> dict[int, str]:
    lf = os.path.join(graphify_out, ".graphify_labels.json")
    if not os.path.exists(lf):
        return {}
    try:
        with open(lf, encoding="utf-8") as f:
            return {int(k): str(v) for k, v in json.load(f).items()}
    except (OSError, ValueError):
        return {}


def build_project_sources(project_id: uuid.UUID, graphify_out: str) -> list[MemorySource]:
    """Read graph.json (+ .graphify_labels.json) and produce MemorySource records.
    Returns [] if there's no usable graph."""
    gj = os.path.join(graphify_out, "graph.json")
    try:
        with open(gj, encoding="utf-8", errors="replace") as f:
            graph = json.load(f)
    except (OSError, ValueError):
        return []

    nodes = [n for n in (graph.get("nodes") or []) if isinstance(n, dict) and "id" in n]
    links = [e for e in (graph.get("links") or graph.get("edges") or []) if isinstance(e, dict)]
    node_map = {n["id"]: n for n in nodes}
    labels = _load_labels(graphify_out)

    def cname(cid: Any) -> str:
        return labels.get(cid, f"Community {cid}") if isinstance(cid, int) else "Uncategorized"

    out_e: dict[Any, list[tuple[str, Any]]] = defaultdict(list)
    in_e: dict[Any, list[tuple[str, Any]]] = defaultdict(list)
    for e in links:
        s = e.get("source", e.get("_src"))
        t = e.get("target", e.get("_tgt"))
        if s is None or t is None:
            continue
        rel = str(e.get("relation", "related"))
        out_e[s].append((rel, t))
        in_e[t].append((rel, s))

    def _label(nid: Any) -> str:
        return str(node_map.get(nid, {}).get("label", nid))

    sources: list[MemorySource] = []
    by_comm: dict[Any, list[str]] = defaultdict(list)

    for n in nodes:
        nid = n["id"]
        label = str(n.get("label") or nid)
        sf = n.get("source_file", "")
        cid = n.get("community", -1)
        by_comm[cid].append(label)
        calls = ", ".join(f"{rel} {_label(t)}" for rel, t in out_e.get(nid, [])[:_MAX_RELS])
        called = ", ".join(f"{rel} {_label(s)}" for rel, s in in_e.get(nid, [])[:_MAX_RELS])
        content = (
            f"{label}\n"
            f"File: {sf}:{n.get('source_location', '')}\n"
            f"Community: {cname(cid)}\n"
            + (f"Calls: {calls}\n" if calls else "")
            + (f"Called by: {called}\n" if called else "")
        )
        sources.append(
            MemorySource(
                project_id, "graph_symbol", str(nid), content,
                {"label": label, "file": sf, "community": cname(cid)},
            )
        )

    for cid, members in by_comm.items():
        if not isinstance(cid, int) or cid < 0:
            continue
        content = f"{cname(cid)}\nMembers: " + ", ".join(members[:_MAX_COMMUNITY_MEMBERS])
        sources.append(
            MemorySource(
                project_id, "community", str(cid), content,
                {"name": cname(cid), "size": len(members)},
            )
        )

    return sources
