"""
Vyanah service — Agent-to-agent communication bus via Redis Streams.
RUDRA domain: Runtime layer.

Vyanah (व्यान) = the pervading breath — carries messages between all agents.
"""

from __future__ import annotations

import json
import uuid

import structlog

from indra.redis import get_redis

from .schemas import AgentMessage, MessageListResponse, MessagePublish

logger = structlog.get_logger()


def _stream_key(agent_id: uuid.UUID) -> str:
    return f"agent:{agent_id}:messages"


def _parse_stream_id(stream_id: bytes | str) -> int:
    """Extract millisecond timestamp from Redis Stream ID like '1234567890123-0'."""
    raw = stream_id.decode() if isinstance(stream_id, bytes) else stream_id
    return int(raw.split("-")[0])


def _decode(raw: bytes | str | None) -> str:
    if raw is None:
        return ""
    return raw.decode() if isinstance(raw, bytes) else raw


class VyanahService:
    """Vyanah — the pervading breath. Routes messages between agents via Redis Streams."""

    async def publish(self, agent_id: uuid.UUID, req: MessagePublish) -> str:
        redis = await get_redis()
        key = _stream_key(agent_id)
        result = await redis.xadd(
            key,
            {
                "role": req.role,
                "content": req.content,
                "metadata": json.dumps(req.metadata),
                "agent_id": str(agent_id),
            },
        )
        msg_id = result if isinstance(result, str) else result.decode()
        logger.debug("message_published", agent_id=str(agent_id), role=req.role)
        return msg_id

    async def get_messages(
        self,
        agent_id: uuid.UUID,
        limit: int = 50,
    ) -> MessageListResponse:
        redis = await get_redis()
        key = _stream_key(agent_id)

        try:
            raw = await redis.xrevrange(key, count=limit)
        except Exception:
            return MessageListResponse(messages=[], agent_id=str(agent_id), total=0)

        if not raw:
            return MessageListResponse(messages=[], agent_id=str(agent_id), total=0)

        messages: list[AgentMessage] = []
        for entry in reversed(raw):
            stream_id, fields = entry[0], entry[1]
            if fields is None:
                continue
            messages.append(
                AgentMessage(
                    id=_decode(stream_id),
                    agent_id=_decode(fields.get(b"agent_id")),
                    role=_decode(fields.get(b"role")) or "agent",
                    content=_decode(fields.get(b"content")),
                    metadata=json.loads(_decode(fields.get(b"metadata")) or "{}"),
                    timestamp_ms=_parse_stream_id(stream_id) if stream_id is not None else 0,
                )
            )

        return MessageListResponse(
            messages=messages,
            agent_id=str(agent_id),
            total=len(messages),
        )


vyanah_service = VyanahService()
