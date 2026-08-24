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


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "aquora-api"}


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
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
