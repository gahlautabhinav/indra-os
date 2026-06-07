import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class IndraEvent:
    event_type: str
    domain: str
    data: dict[str, Any]
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    def to_ws_message(self) -> dict:
        return asdict(self)


STREAM_AGENTS = "indra:stream:agents"
STREAM_SESSIONS = "indra:stream:sessions"
STREAM_TRACES = "indra:stream:traces"
STREAM_ALERTS = "indra:stream:alerts"

PUBSUB_EVENTS = "indra:events"


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
