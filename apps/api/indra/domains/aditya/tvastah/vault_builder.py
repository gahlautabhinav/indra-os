"""Generic Obsidian vault builder — deterministic, from a graphify graph.json.

Reproduces the core graphify vault for ANY project with NO LLM: one note per code
symbol (root), file notes (Files/), community notes (Communities/), a Home index,
and the .obsidian graph-view config. Community names come from a sibling
`.graphify_labels.json` if present, else "Community N".

It does NOT generate the LLM narrative pages (Architecture Overview, etc.) that the
full `/graphify` skill bakes in — run that skill if you want those. Output matches
the note format INDRA's vault scanner reads (**File:** / **Community:** / [[links]]
/ #community tags), so the Second Brain stays consistent.

Standalone, stdlib only:
  python vault_builder.py --graph <graph.json> --out <vault dir> [--name <project>]
"""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import defaultdict
from typing import Any

_COLORS = [
    "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F",
    "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC",
]


def _safe(s: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "_", s)


def _wl(label: str) -> str:
    return f"[[{label}]]"


def _tag(c: str) -> str:
    return c.replace(" & ", "_and_").replace("&", "_and_").replace(" ", "_").lower()


def _basename(sf: str) -> str:
    return sf.replace("\\", "/").split("/")[-1]


def _ends(lk: dict) -> tuple[Any, Any]:
    return lk.get("source", lk.get("_src")), lk.get("target", lk.get("_tgt"))


def build(graph_path: str, vault: str, name: str = "project") -> dict[str, int]:
    with open(graph_path, encoding="utf-8", errors="replace") as f:
        data = json.load(f)
    nodes: list[dict] = [n for n in (data.get("nodes") or []) if isinstance(n, dict) and "id" in n]
    links: list[dict] = [
        lk for lk in (data.get("links") or data.get("edges") or []) if isinstance(lk, dict)
    ]
    node_map = {n["id"]: n for n in nodes}

    labels: dict[int, str] = {}
    lf = os.path.join(os.path.dirname(graph_path), ".graphify_labels.json")
    if os.path.exists(lf):
        try:
            with open(lf, encoding="utf-8") as f:
                labels = {int(k): str(v) for k, v in json.load(f).items()}
        except (OSError, ValueError):
            labels = {}

    def cname(cid: int) -> str:
        return labels.get(cid, f"Community {cid}")

    out_edges: dict[Any, list] = defaultdict(list)
    in_edges: dict[Any, list] = defaultdict(list)
    for lk in links:
        s, t = _ends(lk)
        if s is None or t is None:
            continue
        rel = lk.get("relation", "related")
        conf = lk.get("confidence", "")
        out_edges[s].append((rel, t, conf))
        in_edges[t].append((rel, s, conf))
    degree = {n["id"]: len(out_edges[n["id"]]) + len(in_edges[n["id"]]) for n in nodes}

    by_comm: dict[int, list] = defaultdict(list)
    for n in nodes:
        by_comm[n.get("community", -1)].append(n)
    file_nodes = [n for n in nodes if n.get("source_file") and n["label"] == _basename(n["source_file"])]

    for sub in ("", "Communities", "Files", ".obsidian"):
        os.makedirs(os.path.join(vault, sub), exist_ok=True)

    def write(path: str, content: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    # .obsidian — enable graph view + colour by community
    write(
        os.path.join(vault, ".obsidian", "app.json"),
        json.dumps({"legacyEditor": False, "livePreview": True}, indent=2),
    )
    color_groups = []
    for cid in sorted(c for c in by_comm if c >= 0):
        c = cname(cid)
        color_groups.append(
            {"query": f"tag:community/{_tag(c)}", "color": {"a": 1, "rgb": int(_COLORS[cid % len(_COLORS)].lstrip("#"), 16)}}
        )
    write(
        os.path.join(vault, ".obsidian", "graph.json"),
        json.dumps(
            {"showTags": True, "showOrphans": True, "colorGroups": color_groups,
             "nodeSizeMultiplier": 1.2, "linkDistance": 250, "repelStrength": 10},
            indent=2,
        ),
    )

    # Home
    comm_links = "\n".join(
        f"- {_wl(cname(cid))} ({len(m)} nodes)" for cid, m in sorted(by_comm.items()) if cid >= 0
    )
    file_links = "\n".join(f"- {_wl(n['label'])}" for n in sorted(file_nodes, key=lambda x: x.get("source_file", "")))
    top = sorted(nodes, key=lambda n: degree.get(n["id"], 0), reverse=True)[:10]
    god = "\n".join(f"- {_wl(_safe(n['label']))} ({degree.get(n['id'], 0)} edges)" for n in top)
    n_comm = len([c for c in by_comm if c >= 0])
    write(
        os.path.join(vault, "Home.md"),
        f"# {name} — Knowledge Graph\n\n"
        f"> Auto-generated from graphify · {len(nodes)} nodes · {len(links)} edges · {n_comm} communities\n\n"
        f"## Community Hubs\n\n{comm_links}\n\n## Most Connected\n\n{god}\n\n## Source Files\n\n{file_links}\n",
    )

    # community notes
    for cid, members in sorted(by_comm.items()):
        if cid < 0:
            continue
        c = cname(cid)
        lines = "\n".join(
            f"- {_wl(_safe(m['label']))} `{m.get('source_file', '')}:{m.get('source_location', '')}`"
            for m in sorted(members, key=lambda x: x.get("label", ""))
        )
        write(
            os.path.join(vault, "Communities", _safe(c) + ".md"),
            f"# {c}\n\n**Community ID:** {cid}\n**Members:** {len(members)}\n\n"
            f"## Nodes\n\n{lines}\n\n---\n\n*See [[Home]].*\n\n#community/{_tag(c)}\n",
        )

    # symbol notes (root) + file notes (Files/)
    n_sym = n_file = 0
    for n in nodes:
        label = n["label"]
        sf = n.get("source_file", "")
        c = cname(n.get("community", -1))
        nid = n["id"]
        out_l = "\n".join(
            f"- {'✓' if conf == 'EXTRACTED' else '~'} `{rel}` → {_wl(_safe(node_map.get(t, {}).get('label', str(t))))}"
            for rel, t, conf in out_edges.get(nid, [])
        )
        in_l = "\n".join(
            f"- {'✓' if conf == 'EXTRACTED' else '~'} `{rel}` ← {_wl(_safe(node_map.get(s, {}).get('label', str(s))))}"
            for rel, s, conf in in_edges.get(nid, [])
        )
        body = (
            f"# {label}\n\n"
            f"**File:** `{sf}` · `{n.get('source_location', '')}`\n"
            f"**Community:** {_wl(c)}\n**Degree:** {degree.get(nid, 0)}\n\n"
            f"## Calls / Relations (outgoing)\n\n{out_l or '_None_'}\n\n"
            f"## Called By / Used By (incoming)\n\n{in_l or '_None_'}\n\n"
            f"---\n\n*See [[Home]] · [[{c}]]*\n\n#community/{_tag(c)}\n"
        )
        is_file = bool(sf) and label == _basename(sf)
        write(os.path.join(vault, "Files" if is_file else "", _safe(label) + ".md"), body)
        if is_file:
            n_file += 1
        else:
            n_sym += 1

    return {"symbols": n_sym, "files": n_file, "communities": n_comm}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--graph", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--name", default="project")
    a = ap.parse_args()
    print("vault built:", build(a.graph, a.out, a.name))
