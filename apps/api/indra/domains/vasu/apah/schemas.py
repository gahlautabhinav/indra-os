from __future__ import annotations

from pydantic import BaseModel


class StreamEvent(BaseModel):
    id: str
    stream: str
    data: dict[str, str]
    timestamp_ms: int


class StreamInfo(BaseModel):
    name: str
    length: int


class StreamListResponse(BaseModel):
    streams: list[StreamInfo]
    total: int


class PublishRequest(BaseModel):
    stream: str
    data: dict[str, str]


class PublishResponse(BaseModel):
    id: str
    stream: str


class StreamEventsResponse(BaseModel):
    stream: str
    events: list[StreamEvent]
    total: int
