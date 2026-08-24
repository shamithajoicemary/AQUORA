from datetime import datetime, timezone

import numpy as np
from sklearn.ensemble import IsolationForest

from schemas.ocean import AnomalyReport, ModelVsSensorComparison
from services.data_engine import TelemetryEngine


class AnomalyEngine:
    def __init__(self, telemetry: TelemetryEngine) -> None:
        self.telemetry = telemetry

    def detect(self, limit: int = 50) -> list[AnomalyReport]:
        frame = self.telemetry.data[self.telemetry.data.sensor_type == "ARGO_Buoy"].copy()
        features = frame[["temperature", "salinity"]].to_numpy()
        detector = IsolationForest(contamination=0.025, random_state=42, n_estimators=100)
        labels = detector.fit_predict(features)
        scores = -detector.score_samples(features)
        candidates = frame.assign(label=labels, score=scores).query("label == -1").sort_values("score", ascending=False).head(limit)
        reports = []
        for row in candidates.itertuples():
            variable = "temperature" if abs(row.temperature - frame.temperature.median()) > abs(row.salinity - frame.salinity.median()) else "salinity"
            value = row.temperature if variable == "temperature" else row.salinity
            reports.append(AnomalyReport(lat=row.lat, lon=row.lon, depth=row.depth, variable=variable, value=value,
                score=float(row.score), is_anomaly=True, description=f"Isolation Forest flagged {variable} anomaly in {row.basin}",
                timestamp=row.timestamp, basin=row.basin))
        return reports

    def compare(self) -> ModelVsSensorComparison:
        model = self.telemetry.data[self.telemetry.data.sensor_type == "Model_Prediction"].set_index(["lat", "lon", "depth"])
        sensor = self.telemetry.data[self.telemetry.data.sensor_type == "ARGO_Buoy"].set_index(["lat", "lon", "depth"])
        joined = model.join(sensor, lsuffix="_model", rsuffix="_sensor").dropna()
        temp_delta = joined.temperature_model - joined.temperature_sensor
        sal_delta = joined.salinity_model - joined.salinity_sensor
        rmse_temp = float(np.sqrt(np.mean(temp_delta ** 2)))
        rmse_sal = float(np.sqrt(np.mean(sal_delta ** 2)))
        mae_temp = float(np.mean(np.abs(temp_delta)))
        mae_sal = float(np.mean(np.abs(sal_delta)))
        similarity = max(0.0, min(100.0, 100.0 - (mae_temp / 2 + mae_sal * 10) * 10))
        return ModelVsSensorComparison(sample_count=len(joined), temperature_rmse=rmse_temp, temperature_mae=mae_temp,
            salinity_rmse=rmse_sal, salinity_mae=mae_sal, similarity_percent=similarity)


anomaly_engine = AnomalyEngine(__import__("services.data_engine", fromlist=["engine"]).engine)
