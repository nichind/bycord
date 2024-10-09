from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from slowapi.errors import RateLimitExceeded
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from datetime import datetime
from loguru import logger
from loguru._defaults import LOGURU_FORMAT
from glob import glob
from os.path import dirname, basename, isfile, join
from asyncio import create_task, run
import logging
from random import choice
from string import ascii_letters, digits
import websockets
import json
import sys

    
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(docs_url='/docs')
app.rooms_ws = {}


@app.get('/')
async def index():
    return RedirectResponse('/room/' + ''.join(choice(ascii_letters + digits) for _ in range(10)))


@app.get('/favicon.ico')
async def favicon():
    return FileResponse('./icon.png', media_type='image/png')


@app.get('/room/{room_id}')
async def room(room_id: str):
    return FileResponse(join(dirname(__file__), 'templates', 'index.html'), media_type='text/html')


@app.get('/static/{path:path}')
async def static(path: str):
    return FileResponse(join(dirname(__file__), 'static', path), media_type='text/html')


@app.websocket('/ws/{room_id}')
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in app.rooms_ws:
        app.rooms_ws[room_id] = []
    app.rooms_ws[room_id].append(websocket)

    try:
        while True:
            await websocket.send_json({"type": "users", "data": [str(ws) for ws in app.rooms_ws[room_id]]})
            data = await websocket.receive_text()
            if data:
                message = json.loads(data)
                if message['type'] == 'audio':
                    for ws in app.rooms_ws[room_id]:
                        if ws != websocket:
                            await ws.send_json(message)
    except WebSocketDisconnect:
        app.rooms_ws[room_id].remove(websocket)
        