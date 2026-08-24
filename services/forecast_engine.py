from datetime import datetime, timedelta, timezone

import numpy as np

from services.data_engine import TelemetryEngine


class ForecastEngine:
    def __init__(self, telemetry: TelemetryEngine) -> None:
        self.telemetry = telemetry

    def predict(self, lat: float, lon: float, depth: float = 0, days: int = 7) -> list[dict]:
        point = self.telemetry.point(lat, lon, depth)
        if point.empty:
            return []
        row = point.iloc[0]
        now = datetime.now(timezone.utc)
        predictions = []
        for day in range(1, days + 1):
            seasonal = np.sin(day * .8) * .12
            predictions.append({"temperature": round(float(row.temperature + seasonal), 3),
                "salinity": round(float(row.salinity + np.cos(day * .6) * .025), 3),
                "current_speed": float(row.current_speed), "current_direction": float(row.current_direction),
                "depth": float(row.depth), "lat": float(row.lat), "lon": float(row.lon),
                "timestamp": now + timedelta(days=day), "sensor_type": "Model_Prediction", "basin": row.basin})
        return predictions


forecast_engine = ForecastEngine(__import__("services.data_engine", fromlist=["engine"]).engine)
