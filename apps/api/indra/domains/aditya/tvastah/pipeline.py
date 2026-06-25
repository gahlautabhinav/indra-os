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
import shutil
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from indra.models.project import Project
from indra.models.task import Task

logger = structlog.get_logger()

# graphify on a large repo can take a while; a hard ceiling per stage.
_STAGE_TIMEOUT_S = 900
# Keep captured subprocess output bounded in the run ledger.
_OUT_TAIL = 600


async def _run(cmd: list[str], cwd: str | None) -> tuple[int, str, str]:
    """Run a subprocess with a timeout. Returns (returncode, stdout, stderr).

    Never uses a shell; `cmd` is an argv list. On timeout the process is killed
    and (-1, "", "timeout…") is returned.
    """
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        # ponytail: communicate() buffers full stdout/stderr in memory before we
        # tail-slice. Bounded by graphify's own (trusted, local) output; cap the
        # read here only if it's ever pointed at an untrusted/unbounded producer.
        out, err = await asyncio.wait_for(proc.communicate(), timeout=_STAGE_TIMEOUT_S)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        return -1, "", f"timeout after {_STAGE_TIMEOUT_S}s"
    return (
        proc.returncode or 0,
        out.decode("utf-8", "replace"),
        err.decode("utf-8", "replace"),
    )


async def enqueue(db: AsyncSession, project: Project, trigger: str = "manual") -> Task:
    """Queue an index run for a project. Returns the created Task (status=queued)."""
    task = Task(
        name=f"index:{project.name or project.root_path}",
        status="queued",
        input={
            "kind": "index",
            "project_id": str(project.id),
            "trigger": trigger,
            "root": project.root_path,
        },
    )
    db.add(task)
    project.status = "queued"
    await db.commit()
    await db.refresh(task)
    return task


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
    failed = False
    graphify = shutil.which("graphify")

    if not root_p.exists() or not root_p.is_dir():
        rec("detect", "failed", error=f"root not found: {root}")
        failed = True
    elif graphify is None:
        rec("detect", "failed", error="graphify not found on PATH")
        failed = True
    else:
        # detect — graphify's own cron-safe change signal (informational here).
        rc, out, err = await _run([graphify, "check-update", root], cwd=root)
        project.last_fingerprint = (out or err).strip()[:200] or None
        rec("detect", "ok" if rc == 0 else "warn", rc=rc, out=out[-_OUT_TAIL:])

        # graphify update — refresh structural graph.json (no LLM).
        rc, out, err = await _run([graphify, "update", root], cwd=root)
        if rc == 0:
            rec("graphify", "ok", out=out[-_OUT_TAIL:])
        else:
            rec("graphify", "failed", rc=rc, err=err[-_OUT_TAIL:])
            failed = True

    # vault — rebuild the Obsidian vault from graph.json via the project's
    # generated build_vault.py. Non-fatal; absent ⇒ needs one-time bootstrap.
    if not failed:
        builder = root_p / "graphify-out" / "build_vault.py"
        if builder.exists():
            rc, out, err = await _run([sys.executable, str(builder)], cwd=str(builder.parent))
            rec("vault", "ok" if rc == 0 else "warn", rc=rc, err=err[-_OUT_TAIL:])
        else:
            rec("vault", "skipped", reason="needs_bootstrap: no graphify-out/build_vault.py")

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


async def run_index(db: AsyncSession, project: Project, trigger: str = "manual") -> dict[str, Any]:
    """Synchronous convenience: enqueue + execute immediately (manual/CLI use)."""
    task = await enqueue(db, project, trigger)
    return await execute(db, task)
