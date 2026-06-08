import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from indra.config import settings
from indra.websockets.manager import manager

router = APIRouter()


@router.websocket("/ws/connect")
async def websocket_connect(websocket: WebSocket) -> None:
    # WebSockets bypass the HTTP auth-gate middleware, so authenticate the
    # handshake here. Browsers can't set headers on a WS, so the token is
    # passed as a query param: ws://…/ws/connect?token=<jwt>.
    token = websocket.query_params.get("token", "")
    try:
        if not token:
            raise JWTError("missing token")
        jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        # 1008 = policy violation. Reject before accepting the connection.
        await websocket.close(code=1008)
        return

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
