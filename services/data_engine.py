from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd

DEPTHS = [0, 50, 100, 200, 500, 1000, 2000]
BASINS = {
    "Pacific": (-60, 60, 120, -70),
    "Atlantic": (-60, 70, -70, 20),
    "Indian": (-60, 30, 20, 120),
    "Arctic": (66, 90, -180, 180),
    "Southern": (-90, -50, -180, 180),
    "Bay of Bengal": (5, 23, 80, 100),
}


def basin_for(lat: float, lon: float) -> str:
    if lat >= 66:
        return "Arctic"
    if lat <= -50:
        return "Southern"
    if 5 <= lat <= 23 and 80 <= lon <= 100:
        return "Bay of Bengal"
    if -60 <= lat <= 60 and (lon >= 120 or lon <= -70):
        return "Pacific"
    if -60 <= lat <= 70 and -70 <= lon <= 20:
        return "Atlantic"
    return "Indian"


class TelemetryEngine:
    def __init__(self, seed: int = 42) -> None:
        self.rng = np.random.default_rng(seed)
        self.data = self._generate()

    def _generate(self) -> pd.DataFrame:
        now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        rows: list[dict[str, Any]] = []
        for basin, (lat_min, lat_max, lon_min, lon_max) in BASINS.items():
            lats = np.linspace(lat_min + 2, lat_max - 2, 6) if lat_max - lat_min > 8 else [lat_min]
            lons = np.linspace(lon_min + 5, lon_max - 5, 8) if lon_max - lon_min > 10 else [lon_min]
            for lat in lats:
                for lon in lons:
                    for depth in DEPTHS:
                        base_temp = 28 * np.cos(np.radians(lat)) - 3.5 - depth * .012
                        if lat >= 66:
                            base_temp = -1.5 - depth * .001
                        if lat <= -50:
                            base_temp = 1.5 - depth * .003
                        base_sal = 34.7 + .018 * abs(lat) / 10 + depth * .0015
                        current = max(.02, .75 * np.cos(np.radians(lat)) * np.exp(-depth / 1200))
                        direction = (180 + lat * 1.4 + lon * .2) % 360
                        for sensor_type in ("ARGO_Buoy", "Ship_CTD", "Model_Prediction"):
                            noise = 0 if sensor_type == "Model_Prediction" else float(self.rng.normal(0, .18))
                            sal_noise = 0 if sensor_type == "Model_Prediction" else float(self.rng.normal(0, .035))
                            rows.append({
                                "temperature": round(base_temp + noise, 3),
                                "salinity": round(base_sal + sal_noise, 3),
                                "current_speed": round(current + abs(noise) * .1, 3),
                                "current_direction": round(direction, 2),
                                "depth": depth, "lat": round(float(lat), 4), "lon": round(float(lon), 4),
                                "timestamp": now - timedelta(days=int(self.rng.integers(0, 7))),
                                "sensor_type": sensor_type, "basin": basin,
                            })
        return pd.DataFrame(rows)

    def query(self, lat_min: float = -90, lat_max: float = 90, lon_min: float = -180, lon_max: float = 180,
              depth: float | None = None, sensor_type: str | None = None, limit: int = 500) -> pd.DataFrame:
        frame = self.data[(self.data.lat >= lat_min) & (self.data.lat <= lat_max) &
                          (self.data.lon >= lon_min) & (self.data.lon <= lon_max)]
        if depth is not None:
            frame = frame[frame.depth == min(DEPTHS, key=lambda value: abs(value - depth))]
        if sensor_type:
            frame = frame[frame.sensor_type == sensor_type]
        return frame.head(limit).copy()

    def point(self, lat: float, lon: float, depth: float = 0) -> pd.DataFrame:
        nearest_depth = min(DEPTHS, key=lambda value: abs(value - depth))
        frame = self.data[(self.data.depth == nearest_depth) & (self.data.sensor_type == "Model_Prediction")].copy()
        frame["distance"] = (frame.lat - lat) ** 2 + (frame.lon - lon) ** 2
        return frame.nsmallest(1, "distance").drop(columns="distance")

    def records(self, frame: pd.DataFrame) -> list[dict[str, Any]]:
        return frame.to_dict(orient="records")


engine = TelemetryEngine()
