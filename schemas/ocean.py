from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SensorType = Literal["ARGO_Buoy", "Ship_CTD", "Model_Prediction"]


class OceanPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    temperature: float = Field(..., ge=-5, le=45)
    salinity: float = Field(..., ge=0, le=45)
    current_speed: float = Field(..., ge=0)
    current_direction: float = Field(..., ge=0, lt=360)
    depth: float = Field(..., ge=0, le=11000)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    timestamp: datetime
    sensor_type: SensorType
    basin: str | None = None


class DepthProfile(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    points: list[OceanPoint]


class AnomalyReport(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    depth: float = Field(..., ge=0)
    variable: Literal["temperature", "salinity", "thermal"]
    value: float
    score: float
    is_anomaly: bool
    description: str
    timestamp: datetime
    basin: str | None = None


class ModelVsSensorComparison(BaseModel):
    sample_count: int = Field(..., ge=0)
    temperature_rmse: float = Field(..., ge=0)
    temperature_mae: float = Field(..., ge=0)
    salinity_rmse: float = Field(..., ge=0)
    salinity_mae: float = Field(..., ge=0)
    similarity_percent: float = Field(..., ge=0, le=100)


class ChatQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    depth: float | None = Field(default=None, ge=0, le=11000)


class ChatResponse(BaseModel):
    answer: str
    intent: str
    bbox: list[float] | None = None
    data: list[OceanPoint] = Field(default_factory=list)
