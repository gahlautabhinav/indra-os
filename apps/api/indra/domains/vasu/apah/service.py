"""
Apah service — Event Bus via Redis Streams.
VASU domain: Infrastructure layer.

Apah (अप:) = Water — flows between all devas, the universal data channel.
"""

from __future__ import annotations

import structlog

from indra.redis import get_redis

from .schemas import PublishResponse, StreamEventsResponse, StreamInfo, StreamListResponse

logger = structlog.get_logger()

_SCAN_PATTERNS = ["indra:stream:*", "agent:*:messages"]
_MAX_STREAMS = 100


def _decode(val: bytes | str | None) -> str:
    if val is None:
        return ""
    return val.decode() if isinstance(val, bytes) else val


class ApahService:
    @staticmethod
    async def list_streams() -> StreamListResponse:
        redis = await get_redis()
        seen: set[str] = set()
        stream_keys: list[str] = []
        for pattern in _SCAN_PATTERNS:
            async for raw_key in redis.scan_iter(pattern, count=200):
                k = _decode(raw_key)
                if k and k not in seen and len(stream_keys) < _MAX_STREAMS:
                    seen.add(k)
                    stream_keys.append(k)

        streams: list[StreamInfo] = []
        for key in stream_keys:
            try:
                length = await redis.xlen(key)
                streams.append(StreamInfo(name=key, length=length))
            except Exception:
                streams.append(StreamInfo(name=key, length=0))

        return StreamListResponse(streams=streams, total=len(streams))

    @staticmethod
    async def read_stream(stream_name: str, limit: int = 50) -> StreamEventsResponse:
        from .schemas import StreamEvent

        redis = await get_redis()
        try:
            raw = await redis.xrevrange(stream_name, count=limit)
        except Exception:
            return StreamEventsResponse(stream=stream_name, events=[], total=0)

        if not raw:
            return StreamEventsResponse(stream=stream_name, events=[], total=0)

        events: list[StreamEvent] = []
        for entry in reversed(raw):
            if entry is None:
                continue
            stream_id = entry[0]
            fields = entry[1]
            if stream_id is None:
                continue
            sid = _decode(stream_id)
            ts_ms = int(sid.split("-")[0]) if "-" in sid else 0
            decoded: dict[str, str] = {}
            if fields:
                for k, v in fields.items():
                    decoded[_decode(k)] = _decode(v)
            events.append(StreamEvent(id=sid, stream=stream_name, data=decoded, timestamp_ms=ts_ms))

        return StreamEventsResponse(stream=stream_name, events=events, total=len(events))

    @staticmethod
    async def publish(stream_name: str, data: dict[str, str]) -> PublishResponse:
        redis = await get_redis()
        msg_id = await redis.xadd(stream_name, data)  # type: ignore[arg-type]
        entry_id = _decode(msg_id) if msg_id else "0-0"
        logger.info("apah.publish", stream=stream_name, id=entry_id)
        return PublishResponse(id=entry_id, stream=stream_name)
