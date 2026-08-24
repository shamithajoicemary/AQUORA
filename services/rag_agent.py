import re

from schemas.ocean import ChatQuery, ChatResponse
from services.data_engine import BASINS, TelemetryEngine, basin_for


class OceanAgent:
    def __init__(self, telemetry: TelemetryEngine) -> None:
        self.telemetry = telemetry

    def answer(self, request: ChatQuery) -> ChatResponse:
        query = request.query.lower()
        depth = request.depth if request.depth is not None else self._depth(query)
        basin = next((name for name in BASINS if name.lower() in query), None)
        if basin is None and "pacific" in query: basin = "Pacific"
        if basin is None and "atlantic" in query: basin = "Atlantic"
        if basin is None and "indian" in query: basin = "Indian"
        intent = "telemetry"
        if "anomal" in query or "heatwave" in query:
            intent = "anomalies"
            frame = self.telemetry.query(depth=depth, limit=20)
            answer = f"I found {len(frame)} global telemetry points for anomaly review at {depth:.0f}m."
        elif "high salinity" in query:
            intent = "salinity_zones"
            frame = self.telemetry.query(depth=depth, limit=100)
            if basin: frame = frame[frame.basin == basin]
            frame = frame.nlargest(5, "salinity")
            answer = f"The highest salinity zones at {depth:.0f}m are concentrated in {basin or 'the subtropical basins'}."
        elif "temperature" in query or "temp" in query:
            intent = "temperature"
            frame = self.telemetry.query(depth=depth, limit=20)
            answer = f"Global temperature samples at {depth:.0f}m range from {frame.temperature.min():.1f}°C to {frame.temperature.max():.1f}°C."
        else:
            intent = "telemetry"
            frame = self.telemetry.point(request.lat or 0, request.lon or 0, depth)
            answer = f"AQUORA is monitoring {basin or basin_for(request.lat or 0, request.lon or 0)} at {depth:.0f}m."
        bbox = None
        if basin:
            lat_min, lat_max, lon_min, lon_max = BASINS[basin]
            bbox = [lon_min, lat_min, lon_max, lat_max]
        return ChatResponse(answer=answer, intent=intent, bbox=bbox, data=self.telemetry.records(frame))

    @staticmethod
    def _depth(query: str) -> float:
        match = re.search(r"(\d+(?:\.\d+)?)\s*(?:m|meter|meters)", query)
        return float(match.group(1)) if match else 0


ocean_agent = OceanAgent(__import__("services.data_engine", fromlist=["engine"]).engine)
