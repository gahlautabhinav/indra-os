"""Headless Claude completion (`claude -p`) — the LLM backend LightRAG uses for
query keyword extraction (and optional answer generation). Uses the Claude
subscription, no API key. Returns "" if claude isn't available (callers degrade).
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import shutil
import subprocess

import structlog

logger = structlog.get_logger()

_TIMEOUT_S = 180


def _run(cmd: list[str], stdin_text: str) -> tuple[int, str, str]:
    """Run `claude -p`, hard-bounded. On timeout the whole process TREE is killed —
    on Windows `claude` spawns a node grandchild that holds the stdout pipe, so a
    plain kill / subprocess.run timeout blocks forever on read."""
    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except (OSError, ValueError) as exc:
        return -1, "", str(exc)
    try:
        out, err = proc.communicate(input=stdin_text, timeout=_TIMEOUT_S)
        return proc.returncode, out or "", err or ""
    except subprocess.TimeoutExpired:
        with contextlib.suppress(Exception):
            if os.name == "nt":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                    capture_output=True,
                    timeout=15,
                    check=False,
                )
            else:
                proc.kill()
        with contextlib.suppress(Exception):
            proc.communicate(timeout=10)
        return -1, "", f"timeout after {_TIMEOUT_S}s (tree-killed)"


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
