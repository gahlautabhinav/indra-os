"""Unit tests for Pranah task orchestration service."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from indra.domains.rudra.pranah.schemas import (
    AgentSpawnRequest,
    AgentStatusUpdate,
    TaskCreate,
    TaskUpdate,
)
from indra.domains.rudra.pranah.service import (
    TERMINAL_STATUSES,
    VALID_TASK_STATUSES,
    PranahService,
    _task_to_read,
)
from indra.models.task import Task


def _blank_task(status: str = "pending") -> Task:
    task_id = uuid.uuid4()
    t = Task(
        name="test-task",
        description=None,
        status=status,
        priority=0,
        agent_id=None,
        workflow_id=None,
        input={},
        output=None,
        error=None,
        started_at=None,
        finished_at=None,
    )
    # set id and created_at after construction
    t.id = task_id
    t.created_at = datetime(2026, 6, 7, tzinfo=timezone.utc)
    return t


@pytest.fixture()
def service() -> PranahService:
    return PranahService()


# ── _task_to_read ─────────────────────────────────────────────────────────────

def test_task_to_read_maps_all_fields() -> None:
    t = _blank_task()
    r = _task_to_read(t)
    assert r.id == t.id
    assert r.name == "test-task"
    assert r.status == "pending"
    assert r.priority == 0
    assert r.output is None


# ── constants ─────────────────────────────────────────────────────────────────

def test_valid_statuses_covers_lifecycle() -> None:
    assert "pending" in VALID_TASK_STATUSES
    assert "running" in VALID_TASK_STATUSES
    assert "completed" in VALID_TASK_STATUSES
    assert "failed" in VALID_TASK_STATUSES
    assert "cancelled" in VALID_TASK_STATUSES


def test_terminal_statuses_are_subset_of_valid() -> None:
    assert TERMINAL_STATUSES.issubset(VALID_TASK_STATUSES)


# ── create_task ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_task_sets_pending_status(service: PranahService) -> None:
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    task_id = uuid.uuid4()

    def mock_refresh(obj: object) -> None:
        if isinstance(obj, Task):
            obj.id = task_id
            obj.created_at = datetime(2026, 6, 7, tzinfo=timezone.utc)

    db.refresh.side_effect = mock_refresh

    req = TaskCreate(name="Run embeddings", priority=1)

    with patch("indra.domains.rudra.pranah.service.manager") as mock_mgr:
        mock_mgr.publish_event = AsyncMock()
        result = await service.create_task(db, req)

    assert result.status == "pending"
    assert result.name == "Run embeddings"
    assert result.priority == 1
    mock_mgr.publish_event.assert_called_once()


# ── update_task ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_task_sets_started_at_on_running(service: PranahService) -> None:
    task = _blank_task("pending")
    db = AsyncMock()
    db.get = AsyncMock(return_value=task)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    req = TaskUpdate(status="running")

    with patch("indra.domains.rudra.pranah.service.manager") as mock_mgr:
        mock_mgr.publish_event = AsyncMock()
        result = await service.update_task(db, task.id, req)

    assert result is not None
    assert result.status == "running"
    assert task.started_at is not None


@pytest.mark.asyncio
async def test_update_task_sets_finished_at_on_completed(service: PranahService) -> None:
    task = _blank_task("running")
    task.started_at = datetime(2026, 6, 7, tzinfo=timezone.utc)
    db = AsyncMock()
    db.get = AsyncMock(return_value=task)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    req = TaskUpdate(status="completed", output={"result": "ok"})

    with patch("indra.domains.rudra.pranah.service.manager") as mock_mgr:
        mock_mgr.publish_event = AsyncMock()
        await service.update_task(db, task.id, req)

    assert task.finished_at is not None
    assert task.output == {"result": "ok"}


@pytest.mark.asyncio
async def test_update_task_rejects_invalid_status(service: PranahService) -> None:
    task = _blank_task()
    db = AsyncMock()
    db.get = AsyncMock(return_value=task)

    req = TaskUpdate(status="flying")

    with pytest.raises(ValueError, match="Invalid status"):
        await service.update_task(db, task.id, req)


@pytest.mark.asyncio
async def test_update_task_returns_none_for_missing(service: PranahService) -> None:
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)
    result = await service.update_task(db, uuid.uuid4(), TaskUpdate(status="running"))
    assert result is None


# ── cancel_task ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cancel_task_pending(service: PranahService) -> None:
    task = _blank_task("pending")
    db = AsyncMock()
    db.get = AsyncMock(return_value=task)
    db.commit = AsyncMock()

    result = await service.cancel_task(db, task.id)
    assert result is True
    assert task.status == "cancelled"
    assert task.finished_at is not None


@pytest.mark.asyncio
async def test_cancel_task_already_completed(service: PranahService) -> None:
    task = _blank_task("completed")
    db = AsyncMock()
    db.get = AsyncMock(return_value=task)

    result = await service.cancel_task(db, task.id)
    assert result is False


@pytest.mark.asyncio
async def test_cancel_task_not_found(service: PranahService) -> None:
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)
    result = await service.cancel_task(db, uuid.uuid4())
    assert result is False


# ── spawn_agent ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_spawn_agent_creates_idle_agent(service: PranahService) -> None:
    from indra.models.agent import Agent

    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    agent_id = uuid.uuid4()
    now = datetime(2026, 6, 7, tzinfo=timezone.utc)

    def mock_refresh(obj: object) -> None:
        if isinstance(obj, Agent):
            obj.id = agent_id
            obj.created_at = now

    db.refresh.side_effect = mock_refresh

    req = AgentSpawnRequest(name="worker-1", type="claude_code", domain="rudra")

    with patch("indra.domains.rudra.pranah.service.manager") as mock_mgr:
        mock_mgr.publish_event = AsyncMock()
        result = await service.spawn_agent(db, req)

    assert result.id == agent_id
    assert result.status == "idle"
    assert result.name == "worker-1"
    mock_mgr.publish_event.assert_called_once()


@pytest.mark.asyncio
async def test_spawn_agent_with_parent(service: PranahService) -> None:
    from indra.models.agent import Agent

    parent_id = uuid.uuid4()
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    captured_agent: list[Agent] = []

    def mock_add(obj: object) -> None:
        if isinstance(obj, Agent):
            captured_agent.append(obj)

    db.add.side_effect = mock_add

    def mock_refresh(obj: object) -> None:
        if isinstance(obj, Agent):
            obj.id = uuid.uuid4()
            obj.created_at = datetime(2026, 6, 7, tzinfo=timezone.utc)

    db.refresh.side_effect = mock_refresh

    req = AgentSpawnRequest(name="child", domain="rudra", parent_id=parent_id)

    with patch("indra.domains.rudra.pranah.service.manager") as mock_mgr:
        mock_mgr.publish_event = AsyncMock()
        result = await service.spawn_agent(db, req)

    assert len(captured_agent) == 1
    assert captured_agent[0].parent_id == parent_id
    assert result.parent_id == parent_id
