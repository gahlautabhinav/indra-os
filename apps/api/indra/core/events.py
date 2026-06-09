import json
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class IndraEvent:
    event_type: str
    domain: str
    data: dict[str, Any]
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    def to_ws_message(self) -> dict:
        return asdict(self)


STREAM_AGENTS = "indra:stream:agents"
STREAM_SESSIONS = "indra:stream:sessions"
STREAM_TRACES = "indra:stream:traces"
STREAM_ALERTS = "indra:stream:alerts"
STREAM_EVENTS = "indra:stream:events"

PUBSUB_EVENTS = "indra:events"


def stream_for(event_type: str) -> str:
    """Route an event_type (e.g. 'session.created') to its Redis stream."""
    head = event_type.split(".", 1)[0]
    return {
        "session": STREAM_SESSIONS,
        "agent": STREAM_AGENTS,
        "trace": STREAM_TRACES,
        "alert": STREAM_ALERTS,
    }.get(head, STREAM_EVENTS)


def stream_fields(event: "IndraEvent") -> dict[str, str]:
    """Flatten an event into string fields for XADD (stream values must be scalar)."""
    fields: dict[str, str] = {
        "event_type": event.event_type,
        "domain": event.domain,
        "timestamp": event.timestamp,
    }
    for k, v in event.data.items():
        fields[k] = v if isinstance(v, str) else json.dumps(v)
    return fields


def make_agent_status_changed(agent_id: str, status: str, domain: str = "rudra") -> IndraEvent:
    return IndraEvent(
        event_type="agent.status_changed",
        domain=domain,
        data={"agent_id": agent_id, "status": status},
    )


def make_session_created(session_id: str, plugin_type: str) -> IndraEvent:
    return IndraEvent(
        event_type="session.created",
        domain="indra",
        data={"session_id": session_id, "plugin_type": plugin_type},
    )


def make_session_ended(session_id: str) -> IndraEvent:
    return IndraEvent(
        event_type="session.ended",
        domain="indra",
        data={"session_id": session_id},
    )


def make_task_created(task_id: str, name: str, priority: int) -> IndraEvent:
    return IndraEvent(
        event_type="task.created",
        domain="rudra",
        data={"task_id": task_id, "name": name, "priority": priority},
    )


def make_task_status_changed(task_id: str, status: str) -> IndraEvent:
    return IndraEvent(
        event_type="task.status_changed",
        domain="rudra",
        data={"task_id": task_id, "status": status},
    )


def make_notification_created(
    notification_id: str, title: str, severity: str, domain: str
) -> IndraEvent:
    return IndraEvent(
        event_type="notification.created",
        domain=domain,
        data={"id": notification_id, "title": title, "severity": severity},
    )
