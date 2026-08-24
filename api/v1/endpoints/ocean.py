from fastapi import APIRouter, Query

from schemas.ocean import ChatQuery, ChatResponse, DepthProfile, OceanPoint
from services.anomaly_engine import anomaly_engine
from services.data_engine import BASINS, DEPTHS, engine
from services.forecast_engine import forecast_engine
from services.rag_agent import ocean_agent

router = APIRouter(prefix="/api/v1", tags=["ocean"])


def points(frame) -> list[OceanPoint]:
    return [OceanPoint.model_validate(row) for row in engine.records(frame)]


@router.get("/ocean/telemetry", response_model=list[OceanPoint])
def telemetry(lat_min: float = Query(-90, ge=-90, le=90), lat_max: float = Query(90, ge=-90, le=90),
              lon_min: float = Query(-180, ge=-180, le=180), lon_max: float = Query(180, ge=-180, le=180),
              depth: float | None = Query(None, ge=0, le=11000), sensor_type: str | None = None,
              limit: int = Query(500, ge=1, le=5000)):
    return points(engine.query(lat_min, lat_max, lon_min, lon_max, depth, sensor_type, limit))


@router.get("/ocean/regions")
def regions():
    return [{"name": name, "bbox": [bounds[2], bounds[0], bounds[3], bounds[1]], "lat_min": bounds[0], "lat_max": bounds[1], "lon_min": bounds[2], "lon_max": bounds[3], "depths": DEPTHS} for name, bounds in BASINS.items()]


@router.get("/ocean/depth-profile", response_model=DepthProfile)
def depth_profile(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    frame = engine.data[(engine.data.lat == engine.point(lat, lon).iloc[0].lat) & (engine.data.lon == engine.point(lat, lon).iloc[0].lon) & (engine.data.sensor_type == "Model_Prediction")]
    return DepthProfile(lat=lat, lon=lon, points=points(frame.sort_values("depth")))


@router.get("/ocean/anomalies")
def anomalies(limit: int = Query(50, ge=1, le=200)):
    return anomaly_engine.detect(limit)


@router.get("/ocean/compare")
def compare():
    return anomaly_engine.compare()


@router.post("/ocean/predict")
def predict(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180), depth: float = Query(0, ge=0, le=11000), days: int = Query(7, ge=1, le=7)):
    return forecast_engine.predict(lat, lon, depth, days)


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatQuery):
    return ocean_agent.answer(request)
