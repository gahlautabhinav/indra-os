"""Headless Claude completion (`claude -p`) — the LLM backend LightRAG uses for
query keyword extraction (and optional answer generation). Uses the Claude
subscription, no API key. Returns "" if claude isn't available (callers degrade).
"""

from __future__ import annotations

import asyncio
import json
import shutil
import subprocess

import structlog

logger = structlog.get_logger()

_TIMEOUT_S = 180


def _run(cmd: list[str], stdin_text: str) -> tuple[int, str, str]:
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


async def claude_complete(
    prompt: str,
    system_prompt: str | None = None,
    history_messages: list | None = None,
    **kwargs: object,
) -> str:
    """LightRAG-compatible llm_model_func. Small prompts (keyword extraction) only —
    LightRAG queries run with only_need_context, so generation isn't invoked."""
    claude = shutil.which("claude")
    if claude is None:
        return ""
    # Pass the (possibly large, possibly "--"-prefixed) prompt via stdin so the CLI
    # never mis-parses it as a flag; a fixed instruction tells Claude to follow it.
    full = (f"{system_prompt}\n\n" if system_prompt else "") + (prompt or "")
    cmd = [
        claude, "-p",
        "Follow the instructions provided on standard input exactly. Output only the "
        "requested result, with no preamble or commentary.",
        "--output-format", "json",
    ]
    rc, out, err = await asyncio.to_thread(_run, cmd, full)
    if rc != 0:
        logger.warning("claude_complete.failed", err=err[:200])
        return ""
    try:
        env = json.loads(out)
    except ValueError:
        return out
    if isinstance(env, dict):
        result = env.get("result")
        if isinstance(result, str):
            return result
    return out
