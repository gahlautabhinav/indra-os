"""Tvasta index pipeline — deterministic, subprocess-driven project reindex.

Replaces the manual graphify → Antigravity → Claude loop with one idempotent run:
  detect (graphify check-update) → graphify update → rebuild vault → refresh
  knowledge graph → finalize.
No LLM, no prompts. `graphify update` is structural (the CLI states "no LLM
needed"); the one-time semantic/full build + build_vault.py scaffolding remains
the agent skill, so a project with no build_vault.py is flagged needs_bootstrap.

Execution model:
  enqueue(project)  → a `Task` row (status=queued, input.kind="index")
  execute(task)     → runs the stages, updating that Task + the Project
  run_index(project)→ sync convenience = enqueue + execute (manual/CLI)
The P2 IndexWorker claims queued Tasks (FOR UPDATE SKIP LOCKED) and calls execute.

Security: subprocesses are spawned with `create_subprocess_exec` (never a shell),
args as a list, with a timeout, and ONLY for a Project whose root exists on disk.
`root_path` only ever originates from local discovery (see prthivi.discover_projects);
no user string reaches a shell and no endpoint sets an arbitrary root.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import shutil
import subprocess
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from indra.models.project import Project
from indra.models.task import Task

logger = structlog.get_logger()

# graphify on a large repo can take a while; a hard ceiling per stage.
_STAGE_TIMEOUT_S = 900
# Keep captured subprocess output bounded in the run ledger.
_OUT_TAIL = 600
# Dirs ignored when fingerprinting a project's source (derived/vendored/output).
_FP_EXCLUDE = frozenset({
    "graphify-out", ".git", "node_modules", ".next", ".venv", "venv",
    "__pycache__", "dist", "build", ".mypy_cache", ".ruff_cache", ".turbo", ".cache",
})
_FP_MAX_FILES = 5000


def _run_blocking(cmd: list[str], cwd: str | None) -> tuple[int, str, str]:
    """Blocking subprocess run (argv list, never a shell). stdin is /dev/null so a
    prompt can't hang it; a timeout kills the process."""
    try:
        # ponytail: capture_output buffers full stdout/stderr in memory. Bounded by
        # graphify's own (trusted, local) output; cap only if ever fed an unbounded one.
        p = subprocess.run(
            cmd,
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=_STAGE_TIMEOUT_S,
            check=False,
        )
        return p.returncode, p.stdout or "", p.stderr or ""
    except subprocess.TimeoutExpired:
        return -1, "", f"timeout after {_STAGE_TIMEOUT_S}s"
    except (OSError, ValueError) as exc:
        return -1, "", f"spawn failed: {exc}"


async def _run(cmd: list[str], cwd: str | None) -> tuple[int, str, str]:
    """Run a subprocess off the event loop in a worker thread.

    Uses subprocess.run via asyncio.to_thread rather than the event loop's subprocess
    transport — the latter raises NotImplementedError on Windows under uvicorn's
    SelectorEventLoop. This works on any event loop and OS.
    """
    return await asyncio.to_thread(_run_blocking, cmd, cwd)


# ── change detection (loop-safe content fingerprint) ─────────────────────────


async def _git(root: str, args: list[str]) -> str | None:
    rc, out, _ = await _run(["git", "-C", root, *args], cwd=None)
    return out.strip() if rc == 0 else None


def _mtime_fingerprint(root: str) -> str:
    """Bounded hash of source files (relpath|mtime|size), pruning derived dirs."""
    h = hashlib.sha1()
    n = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _FP_EXCLUDE]
        for fn in sorted(filenames):
            fp = os.path.join(dirpath, fn)
            try:
                st = os.stat(fp)
            except OSError:
                continue
            rel = os.path.relpath(fp, root)
            h.update(f"{rel}|{int(st.st_mtime)}|{st.st_size}\n".encode("utf-8", "replace"))
            n += 1
            if n >= _FP_MAX_FILES:
                return f"mtime:{h.hexdigest()[:16]}:{n}"
    return f"mtime:{h.hexdigest()[:16]}:{n}"


async def fingerprint(root: str) -> str:
    """A content fingerprint that changes iff the project's SOURCE changed.

    Prefers git (HEAD + dirty state, with graphify-out filtered out so an index
    run's own output can't retrigger it); falls back to a bounded mtime walk.
    Returns "" if the root is gone.
    """
    p = Path(root)
    if not p.exists():
        return ""
    if (p / ".git").exists() and shutil.which("git"):
        head = await _git(root, ["rev-parse", "HEAD"])
        if head:
            dirty = await _git(root, ["status", "--porcelain"]) or ""
            # Exclude graphify-out so `graphify update` writes don't flip the hash.
            lines = "\n".join(line for line in dirty.splitlines() if "graphify-out" not in line)
            return "git:" + head + ":" + hashlib.sha1(lines.encode("utf-8", "replace")).hexdigest()[:12]
    return await asyncio.to_thread(_mtime_fingerprint, root)


async def _has_active_run(db: AsyncSession, project_id: uuid.UUID) -> bool:
    active = await db.execute(
        select(Task)
        .where(
            Task.status.in_(("queued", "running")),
            Task.input["kind"].astext == "index",
            Task.input["project_id"].astext == str(project_id),
        )
        .limit(1)
    )
    return active.scalars().first() is not None


async def detect_and_enqueue(db: AsyncSession) -> int:
    """Fingerprint every enabled project; enqueue an auto run for those whose
    source changed since their last successful index. Loop-safe: the fingerprint
    only moves on real source changes, and a failed run leaves it unchanged (retry).
    """
    enabled = list((await db.execute(select(Project).where(Project.enabled.is_(True)))).scalars())
    enqueued = 0
    for p in enabled:
        if not Path(p.root_path).exists() or await _has_active_run(db, p.id):
            continue
        fp = await fingerprint(p.root_path)
        if fp and fp != (p.last_fingerprint or ""):
            await enqueue(db, p, trigger="auto")
            enqueued += 1
    if enqueued:
        logger.info("tvastah.detect", enabled=len(enabled), enqueued=enqueued)
    return enqueued


async def enqueue(
    db: AsyncSession, project: Project, trigger: str = "manual", mode: str = "fast"
) -> Task:
    """Queue an index run for a project. Returns the created Task (status=queued).
    mode: "fast" (deterministic graphify+vault) | "semantic" (AI agy build)."""
    task = Task(
        name=f"index:{project.name or project.root_path}",
        status="queued",
        input={
            "kind": "index",
            "project_id": str(project.id),
            "trigger": trigger,
            "mode": mode,
            "root": project.root_path,
        },
    )
    db.add(task)
    project.status = "queued"
    await db.commit()
    await db.refresh(task)
    return task


def _vault_out_dir(root: str, gout: Path) -> str:
    """The Obsidian vault dir to (re)build: the project's registered vault from
    obsidian.json if one exists, else graphify-out/obsidian-vault."""
    try:
        from indra.domains.aditya.smriti.vault_scan import _norm, scan_vaults

        target = _norm(root)
        for v in scan_vaults():
            r = v.get("project_root")
            if r and _norm(r) == target and v.get("path"):
                return str(v["path"])
    except Exception:  # noqa: BLE001 — fall back to the default vault dir
        pass
    return str(gout / "obsidian-vault")


async def execute(db: AsyncSession, task: Task) -> dict[str, Any]:
    """Run the index stages for a claimed Task, updating the Task + its Project."""
    pid = task.input.get("project_id")
    project = await db.get(Project, uuid.UUID(pid)) if pid else None
    if project is None:
        task.status = "failed"
        task.error = "project not found"
        task.finished_at = datetime.now(UTC)
        await db.commit()
        return {"project_id": pid, "status": "failed", "stages": []}

    stages: list[dict[str, Any]] = []

    def rec(stage: str, status: str, **detail: Any) -> None:
        stages.append({"stage": stage, "status": status, **detail})

    task.status = "running"
    if task.started_at is None:
        task.started_at = datetime.now(UTC)
    project.status = "running"
    project.error = None
    await db.commit()

    root = project.root_path
    root_p = Path(root)
    mode = str(task.input.get("mode", "fast"))
    failed = False
    graphify = shutil.which("graphify")

    if not root_p.exists() or not root_p.is_dir():
        rec("detect", "failed", error=f"root not found: {root}")
        failed = True
    elif graphify is None:
        rec("detect", "failed", error="graphify not found on PATH")
        failed = True
    else:
        # detect — graphify's own change signal (informational; the loop-safe
        # trigger is the content fingerprint set at finalize).
        rc, out, err = await _run([graphify, "check-update", root], cwd=root)
        rec("detect", "ok" if rc == 0 else "warn", rc=rc, out=out[-_OUT_TAIL:])

        # graphify update — refresh structural graph.json (no LLM).
        rc, out, err = await _run([graphify, "update", root], cwd=root)
        if rc == 0:
            rec("graphify", "ok", out=out[-_OUT_TAIL:])
        elif (root_p / "graphify-out" / "graph.json").exists():
            # graphify declined to refresh (e.g. a node-count safety refusal), but the
            # existing graph.json is still usable — continue naming/vault with it.
            rec("graphify", "warn", rc=rc, err=err[-_OUT_TAIL:])
        else:
            rec("graphify", "failed", rc=rc, err=err[-_OUT_TAIL:])
            failed = True

        # semantic naming (AI) — a CONTAINED Gemini call (labels → community names)
        # via the Antigravity SDK; writes .graphify_labels.json for the vault to use.
        # Non-fatal: on failure the vault falls back to "Community N".
        if not failed and mode == "semantic":
            from .semantic_names import name_communities

            try:
                named = await name_communities(str(root_p / "graphify-out" / "graph.json"))
                rec("semantic", "ok" if named else "skipped", named=named)
            except Exception as exc:  # noqa: BLE001 — naming is best-effort
                rec("semantic", "warn", error=str(exc)[:200])

    # vault — rebuild the Obsidian vault from graph.json (both modes; semantic mode
    # has just written real community names into .graphify_labels.json, which the
    # builder picks up). Prefer the project's own build_vault.py (legacy, baked
    # content); else INDRA's generic builder (deterministic, no LLM). Non-fatal.
    if not failed:
        gout = root_p / "graphify-out"
        graph_json = gout / "graph.json"
        builder = gout / "build_vault.py"
        # Semantic mode just wrote fresh community names to .graphify_labels.json —
        # use the generic builder (which reads them) so the names actually land.
        # A legacy build_vault.py has names baked in and would ignore them, so it's
        # only preferred in fast mode.
        if builder.exists() and mode != "semantic":
            rc, out, err = await _run([sys.executable, str(builder)], cwd=str(gout))
            rec("vault", "ok" if rc == 0 else "warn", rc=rc, err=err[-_OUT_TAIL:])
        elif graph_json.exists():
            vault_dir = _vault_out_dir(root, gout)
            generic = str(Path(__file__).parent / "vault_builder.py")
            rc, out, err = await _run(
                [sys.executable, generic, "--graph", str(graph_json), "--out", vault_dir, "--name", root_p.name],
                cwd=None,
            )
            rec("vault", "ok" if rc == 0 else "warn", rc=rc, out=out[-_OUT_TAIL:], err=err[-_OUT_TAIL:])
        else:
            rec("vault", "skipped", reason="no graph.json (run /graphify once)")

    # ingest — push the project's graph knowledge (symbols + named communities) into
    # Smriti, project-scoped and incremental, so the second brain stays fresh on every
    # index. Non-fatal.
    if not failed:
        try:
            from indra.domains.aditya.smriti.ingest import build_project_sources
            from indra.domains.aditya.smriti.service import smriti_service

            srcs = build_project_sources(project.id, str(root_p / "graphify-out"))
            stats = await smriti_service.upsert_sources(db, srcs)
            rec("ingest", "ok", **stats)
        except Exception as exc:  # noqa: BLE001 — best-effort
            rec("ingest", "warn", error=str(exc)[:200])

    # lightrag — rebuild the per-project KG+vector hybrid store from graph.json so
    # graph-aware retrieval stays in sync. Non-fatal; skipped if unavailable/too large.
    if not failed:
        try:
            from indra.domains.aditya.smriti import lightrag_store

            if lightrag_store.available():
                ls = await lightrag_store.seed(str(root_p / "graphify-out"))
                rec(
                    "lightrag",
                    "ok" if ls.get("entities") else "skipped",
                    **{k: v for k, v in ls.items() if k in ("entities", "relationships", "chunks", "skipped")},
                )
            else:
                rec("lightrag", "skipped", reason="unavailable")
        except Exception as exc:  # noqa: BLE001 — best-effort
            rec("lightrag", "warn", error=str(exc)[:200])

    # knowledge graph — refresh so vault/project nodes reflect the update. Non-fatal.
    if not failed:
        try:
            from indra.domains.vasu.naksatrani.service import NaksatraniService

            await NaksatraniService.rebuild_graph(db)
            rec("naksatrani", "ok")
        except Exception as exc:  # noqa: BLE001 — refresh is best-effort
            rec("naksatrani", "warn", error=str(exc))

    # finalize
    project.status = "failed" if failed else "ok"
    project.last_indexed_at = datetime.now(UTC)
    if not failed:
        project.index_version += 1
        # Record the source fingerprint so detect won't re-enqueue until the
        # source changes again. (A failed run leaves it unchanged ⇒ auto-retry.)
        project.last_fingerprint = await fingerprint(root)
    project.stages = stages
    project.error = next((s.get("error") for s in stages if s.get("status") == "failed"), None)
    task.status = "failed" if failed else "succeeded"
    task.output = {"stages": stages}
    task.error = project.error
    task.finished_at = datetime.now(UTC)
    await db.commit()

    logger.info(
        "tvastah.index_run",
        project=str(project.id),
        status=project.status,
        trigger=task.input.get("trigger"),
        stages=len(stages),
    )
    return {"project_id": str(project.id), "status": project.status, "stages": stages}


async def run_index(
    db: AsyncSession, project: Project, trigger: str = "manual", mode: str = "fast"
) -> dict[str, Any]:
    """Synchronous convenience: enqueue + execute immediately (manual/CLI use)."""
    task = await enqueue(db, project, trigger, mode)
    return await execute(db, task)
