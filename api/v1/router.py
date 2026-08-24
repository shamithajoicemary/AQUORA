from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.ocean_service import (
    build_ai_response,
    build_regions_payload,
    calculate_forecast,
    compute_telemetry,
    get_region,
)

router = APIRouter(prefix="/api/v1", tags=["aquora"])


@router.get("/regions")
def get_regions() -> dict[str, object]:
    return build_regions_payload()


@router.get("/telemetry")
def get_telemetry(region: str = "bay_of_bengal", depth: float = 200.0, month: int = 5) -> dict[str, object]:
    return compute_telemetry(region, depth, month)


@router.get("/forecast")
def get_forecast(region: str = "bay_of_bengal") -> dict[str, object]:
    return calculate_forecast(region)


@router.post("/ai/chat")
def chat(payload: dict[str, str]) -> dict[str, object]:
    question = (payload.get("question") or payload.get("query") or "").strip()
    if not question:
        return {"answer": "Please ask a valid question about ocean telemetry.", "region_id": "bay_of_bengal", "status": "normal", "context": {}}
    return build_ai_response(question, payload.get("region"))


@router.websocket("/ws/telemetry")
async def telemetry_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            for region_id in ["bay_of_bengal", "north_pacific", "north_atlantic", "south_indian_ocean", "arctic_ocean", "mediterranean_sea"]:
                payload = compute_telemetry(region_id, 200.0, 5)
                await websocket.send_json({"type": "telemetry", "data": payload})
                await websocket.send_json({"type": "status", "data": {"status": "SYSTEM ONLINE", "region_id": region_id}})
            await websocket.send_json({"type": "heartbeat", "data": {"message": "live stream stable"}})
    except WebSocketDisconnect:
        await websocket.close()
