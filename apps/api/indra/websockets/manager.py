import asyncio
import json

import structlog
from fastapi import WebSocket

from indra.core.events import PUBSUB_EVENTS, IndraEvent
from indra.redis import get_redis

logger = structlog.get_logger()


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}
        self._pubsub_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        self._connections[client_id] = websocket
        logger.info("WebSocket connected", client_id=client_id, total=len(self._connections))

        if self._pubsub_task is None or self._pubsub_task.done():
            self._pubsub_task = asyncio.create_task(self._listen_pubsub())

    async def disconnect(self, client_id: str) -> None:
        self._connections.pop(client_id, None)
        logger.info("WebSocket disconnected", client_id=client_id, remaining=len(self._connections))

        if not self._connections and self._pubsub_task:
            self._pubsub_task.cancel()
            self._pubsub_task = None

    async def broadcast(self, event: IndraEvent) -> None:
        if not self._connections:
            return
        message = json.dumps(event.to_ws_message())
        dead: list[str] = []
        for client_id, ws in self._connections.items():
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(client_id)
        for client_id in dead:
            await self.disconnect(client_id)

    async def send_to_client(self, client_id: str, event: IndraEvent) -> None:
        ws = self._connections.get(client_id)
        if ws:
            try:
                await ws.send_text(json.dumps(event.to_ws_message()))
            except Exception:
                await self.disconnect(client_id)

    async def publish_event(self, event: IndraEvent) -> None:
        redis = await get_redis()
        await redis.publish(PUBSUB_EVENTS, event.to_json())

    async def _listen_pubsub(self) -> None:
        redis = await get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe(PUBSUB_EVENTS)

        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    data = json.loads(message["data"])
                    event = IndraEvent(
                        event_type=data["event_type"],
                        domain=data["domain"],
                        data=data["data"],
                        timestamp=data["timestamp"],
                    )
                    await self.broadcast(event)
                except Exception as e:
                    logger.warning("Failed to parse pubsub message", error=str(e))
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(PUBSUB_EVENTS)


manager = ConnectionManager()
