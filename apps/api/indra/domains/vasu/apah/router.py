"""
Apah router — Event Bus endpoints.
VASU domain: Infrastructure layer.
"""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from .schemas import PublishRequest, PublishResponse, StreamEventsResponse, StreamListResponse
from .service import ApahService

router = APIRouter()


@router.get("/events/streams", response_model=StreamListResponse, tags=["events"])
async def list_streams() -> StreamListResponse:
    return await ApahService.list_streams()


@router.get("/events/streams/{stream_name:path}", response_model=StreamEventsResponse, tags=["events"])
async def read_stream(
    stream_name: str,
    limit: int = Query(default=50, ge=1, le=500),
) -> StreamEventsResponse:
    return await ApahService.read_stream(stream_name, limit)


@router.post(
    "/events/publish",
    response_model=PublishResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["events"],
)
async def publish_event(body: PublishRequest) -> PublishResponse:
    return await ApahService.publish(body.stream, body.data)
