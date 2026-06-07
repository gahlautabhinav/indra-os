import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from indra.websockets.manager import manager

router = APIRouter()


@router.websocket("/ws/connect")
async def websocket_connect(websocket: WebSocket) -> None:
    client_id = str(uuid.uuid4())
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # heartbeat — client sends "ping", we reply "pong"
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
