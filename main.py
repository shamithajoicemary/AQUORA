from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from api.v1.router import router as aquora_router

app = FastAPI(
    title="AQUORA Oceanographic Intelligence API",
    version="1.0.0",
    description="Realtime ocean telemetry and environmental analytics services.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(aquora_router)


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve static files from public directory if exists
public_dir = os.path.join(os.path.dirname(__file__), "public")
if os.path.exists(public_dir):
    app.mount("/static", StaticFiles(directory=public_dir), name="static")

@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "AQUORA Hybrid Ocean Intelligence Backend"}


@app.get("/", tags=["system"])
def root():
    index_path = os.path.join(public_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"service": "AQUORA", "status": "online"}


@app.websocket("/ws/telemetry")
async def telemetry_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            for region_id in [
                "bay_of_bengal",
                "north_pacific",
                "north_atlantic",
                "south_indian_ocean",
                "arctic_ocean",
                "mediterranean_sea",
            ]:
                payload = {
                    "type": "telemetry",
                    "data": {
                        "region_id": region_id,
                        "metrics": {
                            "temperature": 18.4 + (len(region_id) % 4),
                            "salinity": 33.2 + (len(region_id) % 5) * 0.6,
                            "current_speed": 0.8 + (len(region_id) % 3) * 0.3,
                            "current_direction": 45 + (len(region_id) * 17),
                        },
                    },
                }
                await websocket.send_json(payload)
            await websocket.send_json({"type": "heartbeat", "data": {"status": "SYSTEM ONLINE"}})
    except WebSocketDisconnect:
        await websocket.close()
