"""Launch the native LightRAG web UI for one project.

The native UI (graph explorer + chat) is a server, not a file. The catch: our
.lightrag stores were seeded with INDRA's own models — model2vec embeddings
(256-dim) + a headless Claude session — which the stock server can't load from
its env config. So this launcher runs the stock `lightrag-server` but points its
OpenAI bindings at a tiny local shim that serves *those same* models. The server
then queries the existing store correctly (embeddings match) and graph + chat
both work.

Usage:   py -3.14 -m indra.lightrag_ui "<project name | path>"
Opens:   http://127.0.0.1:9621/webui

One-time deps (already present here): pip install "lightrag-hku[api]" openai
"""

from __future__ import annotations

import argparse
import asyncio
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time
import webbrowser
from pathlib import Path

# Imported at module scope (not inside _build_shim) so that, under
# `from __future__ import annotations`, FastAPI can resolve the string
# annotation `req: Request` against module globals. A local import leaves it
# unresolved and FastAPI treats `req` as a query param -> 422 on every call.
from fastapi import FastAPI, Request

_EMBED_DIM = 256


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def _wait_port(host: str, port: int, timeout: float = 30.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex((host, port)) == 0:
                return True
        time.sleep(0.25)
    return False


# ── project resolution ────────────────────────────────────────────────────────


async def _lookup_project(ref: str) -> tuple[str, str] | None:
    """Resolve a project name to (name, graphify_out) via the INDRA registry."""
    from sqlalchemy import select

    from indra.database import AsyncSessionLocal
    from indra.models.project import Project

    ref_l = ref.strip().lower()
    async with AsyncSessionLocal() as db:
        projects = list((await db.execute(select(Project))).scalars())
    for p in projects:
        if p.name.lower() == ref_l:
            return p.name, (p.graphify_out or str(Path(p.root_path) / "graphify-out"))
    for p in projects:
        leaf = p.root_path.replace("\\", "/").rstrip("/").split("/")[-1].lower()
        if leaf == ref_l:
            return p.name, (p.graphify_out or str(Path(p.root_path) / "graphify-out"))
    for p in projects:
        if ref_l and ref_l in p.root_path.lower():
            return p.name, (p.graphify_out or str(Path(p.root_path) / "graphify-out"))
    return None


def _resolve_working_dir(ref: str) -> tuple[str, str]:
    """(display_name, .lightrag working dir). Accepts a project name or a path."""
    p = Path(ref)
    if p.is_dir():
        if p.name == ".lightrag":
            return p.parent.name, str(p)
        for sub in (p / ".lightrag", p / "graphify-out" / ".lightrag"):
            if sub.is_dir():
                return p.name, str(sub)
    found = asyncio.run(_lookup_project(ref))
    if found is None:
        print(f"No project matching '{ref}'.", file=sys.stderr)
        sys.exit(1)
    name, gout = found
    return name, str(Path(gout) / ".lightrag")


# ── OpenAI-compatible shim backed by INDRA's local models ─────────────────────


def _build_shim():  # type: ignore[no-untyped-def]
    from indra.domains.aditya.smriti import local_embed
    from indra.domains.aditya.smriti.claude_llm import claude_complete

    app = FastAPI()

    @app.post("/v1/embeddings")
    async def embeddings(req: Request):  # type: ignore[no-untyped-def]
        body = await req.json()
        inp = body.get("input")
        texts = [inp] if isinstance(inp, str) else list(inp)
        vecs = await asyncio.to_thread(local_embed._encode, texts)
        data = [
            {"object": "embedding", "index": i, "embedding": list(map(float, v))}
            for i, v in enumerate(vecs)
        ]
        return {
            "object": "list",
            "data": data,
            "model": body.get("model", "potion"),
            "usage": {"prompt_tokens": 0, "total_tokens": 0},
        }

    @app.post("/v1/chat/completions")
    async def chat(req: Request):  # type: ignore[no-untyped-def]
        body = await req.json()
        msgs = body.get("messages", [])
        system = "\n".join(m.get("content", "") for m in msgs if m.get("role") == "system")
        prompt = "\n".join(m.get("content", "") for m in msgs if m.get("role") != "system")
        out = await claude_complete(prompt, system_prompt=system or None)
        return {
            "id": "chatcmpl-indra",
            "object": "chat.completion",
            "model": body.get("model", "claude"),
            "choices": [
                {"index": 0, "message": {"role": "assistant", "content": out}, "finish_reason": "stop"}
            ],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        }

    @app.get("/v1/models")
    async def models():  # type: ignore[no-untyped-def]
        return {"object": "list", "data": [{"id": "potion", "object": "model"}, {"id": "claude", "object": "model"}]}

    return app


def _run_shim(port: int) -> None:
    import uvicorn

    # uvicorn skips signal-handler install off the main thread, so this is safe.
    uvicorn.run(_build_shim(), host="127.0.0.1", port=port, log_level="warning")  # type: ignore[no-untyped-call]


def _open_when_up(port: int) -> None:
    if _wait_port("127.0.0.1", port, timeout=60):
        webbrowser.open(f"http://127.0.0.1:{port}/webui")


def _preflight() -> None:
    """The native UI needs the (optional) [api] extra + openai. Fail with a hint
    instead of a deep ModuleNotFoundError traceback from the server subprocess."""
    import importlib.util as iu

    if any(iu.find_spec(m) is None for m in ("aiofiles", "openai")):
        print(
            "Native LightRAG UI needs extra deps. Install once:\n"
            '  py -3.14 -m pip install "lightrag-hku[api]" openai "bcrypt<4.1"\n'
            "(the bcrypt pin keeps INDRA's login working).",
            file=sys.stderr,
        )
        sys.exit(1)


def main() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    _preflight()

    ap = argparse.ArgumentParser(description="Open the native LightRAG web UI for a project.")
    ap.add_argument("project", help="project name (or a path to its dir / .lightrag)")
    ap.add_argument("--port", type=int, default=9621, help="server port (default 9621)")
    a = ap.parse_args()

    name, wd = _resolve_working_dir(a.project)
    if not os.path.isdir(wd):
        print(
            f"No .lightrag store for '{name}' yet — reindex it in INDRA first.\n  expected: {wd}",
            file=sys.stderr,
        )
        sys.exit(1)

    shim_port = _free_port()
    threading.Thread(target=_run_shim, args=(shim_port,), daemon=True).start()
    if not _wait_port("127.0.0.1", shim_port, timeout=30):
        print("Embedding/LLM shim failed to start.", file=sys.stderr)
        sys.exit(1)

    base = f"http://127.0.0.1:{shim_port}/v1"
    env = os.environ.copy()
    env.update(
        {
            # lightrag-server prints a Unicode splash; the child's default cp1252
            # stdout chokes on it and dies. Force UTF-8.
            "PYTHONIOENCODING": "utf-8",
            "PYTHONUTF8": "1",
            "WORKING_DIR": os.path.abspath(wd),
            "HOST": "127.0.0.1",
            "PORT": str(a.port),
            "WORKERS": "1",
            "LLM_BINDING": "openai",
            "LLM_BINDING_HOST": base,
            "LLM_MODEL": "claude",
            "LLM_BINDING_API_KEY": "indra",
            "EMBEDDING_BINDING": "openai",
            "EMBEDDING_BINDING_HOST": base,
            "EMBEDDING_MODEL": "potion",
            "EMBEDDING_DIM": str(_EMBED_DIM),
            "EMBEDDING_BINDING_API_KEY": "indra",
            "MAX_ASYNC": "2",
        }
    )

    # Stock lightrag-server runs from CWD (reads ./.env, writes ./inputs). Use a
    # throwaway dir so it never touches the project or the store.
    rundir = tempfile.mkdtemp(prefix="indra-lightrag-ui-")
    Path(rundir, ".env").write_text("# generated by INDRA lightrag_ui\n", encoding="utf-8")

    print(f"LightRAG UI for '{name}'  ->  http://127.0.0.1:{a.port}/webui   (Ctrl+C to stop)")
    threading.Thread(target=_open_when_up, args=(a.port,), daemon=True).start()

    proc = subprocess.Popen(
        [sys.executable, "-m", "lightrag.api.lightrag_server"], cwd=rundir, env=env
    )
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()


if __name__ == "__main__":
    main()
