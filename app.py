from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import random
import uuid

app = FastAPI()

# In a real application, this would be a database or in-memory store
active_connections = {}

@app.get("/")
async def root():
    # Generate a random room ID (replace with a better method for production)
    room_id = str(uuid.uuid4())
    return {"url": f"/chat/{room_id}"}


@app.websocket("/chat/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    try:
        await websocket.accept()
        active_connections[room_id] = active_connections.get(room_id, []) + [websocket]

        while True:
            data = await websocket.receive_text()
            # Broadcast message to all in the room
            for connection in active_connections[room_id]:
                await connection.send_text(data)

    except WebSocketDisconnect:
        active_connections[room_id].remove(websocket)
    except Exception as e:
        print(f"Error: {e}")
