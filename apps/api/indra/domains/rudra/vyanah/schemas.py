from __future__ import annotations

from pydantic import BaseModel


class MessagePublish(BaseModel):
    role: str = "human"
    content: str
    metadata: dict = {}


class AgentMessage(BaseModel):
    id: str
    agent_id: str
    role: str
    content: str
    metadata: dict
    timestamp_ms: int


class MessageListResponse(BaseModel):
    messages: list[AgentMessage]
    agent_id: str
    total: int
