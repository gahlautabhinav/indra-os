"""Tier-2 semantic naming — name graphify communities via a headless Claude Code
session (`claude -p`), using the user's Claude subscription rather than a metered
API key.

This is a CONTAINED call: the community→symbols listing is piped on stdin and Claude
returns ONLY a JSON object mapping community id → name. No tools, no file access — it
can't touch the project. INDRA (not the model) writes graphify-out/.graphify_labels.json,
which the vault builder consumes. Runs unattended (no permission prompts), so it works
in automode (scheduled mode=semantic) too.

`claude` not on PATH ⇒ skipped; the vault keeps "Community N" names.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import subprocess
from collections import defaultdict

import structlog

logger = structlog.get_logger()

_TIMEOUT_S = 240
_MAX_LABELS_PER_COMMUNITY = 18
_MAX_COMMUNITIES = 120

_INSTRUCTION = (
    "The text on stdin lists code communities — one line per community ('community "
    "<id>: name1, name2, ...'), each listing code-symbol names from ONE codebase. "
    "Return ONLY a JSON object mapping each community id (as a string) to a short, "
    'specific, Title-Case name (2-4 words, e.g. "Authentication & Tokens", "Redis '
    'Storage", "X3DH Key Agreement"). Base each name on what its symbols do. No prose, '
    "no markdown fences — output only the JSON object."
)


def _extract_map(text: str) -> dict[str, str]:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return {}
    try:
        obj = json.loads(m.group(0))
    except ValueError:
        return {}
    if not isinstance(obj, dict):
        return {}
    return {str(k): str(v).strip() for k, v in obj.items() if str(v).strip()}


def _run_claude(cmd: list[str], stdin_text: str) -> tuple[int, str, str]:
    try:
        p = subprocess.run(
            cmd,
            input=stdin_text,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=_TIMEOUT_S,
            check=False,
        )
        return p.returncode, p.stdout or "", p.stderr or ""
    except subprocess.TimeoutExpired:
        return -1, "", f"timeout after {_TIMEOUT_S}s"
    except (OSError, ValueError) as exc:
        return -1, "", str(exc)


async def name_communities(graph_json_path: str) -> int:
    """Name communities via `claude -p` and write .graphify_labels.json next to the
    graph. Returns the count named (0 if skipped/failed — non-fatal)."""
    claude = shutil.which("claude")
    if claude is None:
        logger.info("semantic_names.skipped_no_claude")
        return 0
    try:
        with open(graph_json_path, encoding="utf-8", errors="replace") as f:
            graph = json.load(f)
    except (OSError, ValueError) as exc:
        logger.warning("semantic_names.graph_read_failed", error=str(exc))
        return 0

    by_comm: dict[int, list[str]] = defaultdict(list)
    for n in graph.get("nodes") or []:
        if not isinstance(n, dict):
            continue
        cid = n.get("community")
        if isinstance(cid, int) and cid >= 0 and len(by_comm[cid]) < _MAX_LABELS_PER_COMMUNITY:
            lbl = str(n.get("label") or n.get("norm_label") or "").strip()
            if lbl:
                by_comm[cid].append(lbl)
    if not by_comm or len(by_comm) > _MAX_COMMUNITIES:
        return 0

    listing = "\n".join(
        f"community {cid}: " + ", ".join(labels) for cid, labels in sorted(by_comm.items())
    )
    cmd = [claude, "-p", _INSTRUCTION, "--output-format", "json"]
    rc, out, err = await asyncio.to_thread(_run_claude, cmd, listing)
    if rc != 0:
        logger.warning("semantic_names.claude_failed", rc=rc, err=err[:200])
        return 0

    # `--output-format json` wraps the model's answer in {"result": "..."}.
    text = out
    try:
        env = json.loads(out)
        if isinstance(env, dict) and isinstance(env.get("result"), str):
            text = env["result"]
    except ValueError:
        pass

    labels = _extract_map(text)
    if not labels:
        logger.warning("semantic_names.no_labels_parsed")
        return 0

    out_path = os.path.join(os.path.dirname(graph_json_path), ".graphify_labels.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(labels, f, ensure_ascii=False)
    logger.info("semantic_names.written", count=len(labels), path=out_path)
    return len(labels)
