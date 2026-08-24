from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

REGION_MAP: dict[str, dict[str, Any]] = {
    "bay_of_bengal": {
        "id": "bay_of_bengal",
        "name": "Bay of Bengal",
        "coordinates": [15.0, 89.0],
        "base_temperature": 28.5,
        "base_salinity": 33.2,
        "base_speed": 1.2,
        "base_direction": 45,
        "description": "monsoon-driven / river discharge",
        "sensor": "ARGO-4902",
        "sensor_count": 14,
        "accent": "#5ce0b5",
    },
    "north_pacific": {
        "id": "north_pacific",
        "name": "North Pacific",
        "coordinates": [35.0, -160.0],
        "base_temperature": 18.2,
        "base_salinity": 34.0,
        "base_speed": 0.4,
        "base_direction": 150,
        "description": "Kuroshio influence / deep basin",
        "sensor": "ARGO-7102",
        "sensor_count": 22,
        "accent": "#6fc8f0",
    },
    "north_atlantic": {
        "id": "north_atlantic",
        "name": "North Atlantic",
        "coordinates": [40.0, -40.0],
        "base_temperature": 16.8,
        "base_salinity": 35.5,
        "base_speed": 0.8,
        "base_direction": 110,
        "description": "AMOC zone / Gulf Stream / deep convection",
        "sensor": "ARGO-3201",
        "sensor_count": 18,
        "accent": "#f2bf6b",
    },
    "south_indian_ocean": {
        "id": "south_indian_ocean",
        "name": "South Indian Ocean",
        "coordinates": [-20.0, 80.0],
        "base_temperature": 22.1,
        "base_salinity": 35.1,
        "base_speed": 1.1,
        "base_direction": 205,
        "description": "Southern trade winds / eddy field",
        "sensor": "ARGO-2614",
        "sensor_count": 16,
        "accent": "#8cf0d1",
    },
    "arctic_ocean": {
        "id": "arctic_ocean",
        "name": "Arctic Ocean",
        "coordinates": [80.0, 10.0],
        "base_temperature": -1.2,
        "base_salinity": 30.5,
        "base_speed": 0.08,
        "base_direction": 260,
        "description": "polar / ice-covered / rapid change",
        "sensor": "ARGO-9901",
        "sensor_count": 8,
        "accent": "#9bd9e8",
    },
    "mediterranean_sea": {
        "id": "mediterranean_sea",
        "name": "Mediterranean Sea",
        "coordinates": [36.0, 18.0],
        "base_temperature": 19.1,
        "base_salinity": 38.4,
        "base_speed": 0.9,
        "base_direction": 90,
        "description": "warm basin / strong stratification",
        "sensor": "ARGO-1837",
        "sensor_count": 11,
        "accent": "#7cd7ff",
    },
}

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _seasonal_factor(month: int) -> float:
    phase = (month / 12.0) * 2.0 * math.pi
    return math.sin(phase)


def get_region(region_id: str) -> dict[str, Any]:
    slug = (region_id or "").strip().lower().replace(" ", "_")
    region = REGION_MAP.get(slug)
    if region is None:
        raise KeyError(f"Unknown region: {region_id}")
    return region


def compute_telemetry(region_id: str, depth: float, month: int) -> dict[str, Any]:
    region = get_region(region_id)
    month = max(0, min(11, month))
    depth = max(0.0, min(1000.0, float(depth)))
    seasonal = _seasonal_factor(month)
    thermocline = math.exp(-depth / 220.0)

    temperature = region["base_temperature"] * thermocline + seasonal * 2.7 - (depth / 1000.0) * 4.8
    salinity = region["base_salinity"] + (depth / 1000.0) * 1.8 + seasonal * 0.45
    current_speed = region["base_speed"] * (1.0 - (depth / 1000.0) * 0.72) * (1.0 + seasonal * 0.28)
    current_direction = (region["base_direction"] + (month * 12.0) + (depth * 0.04)) % 360.0

    metrics = {
        "temperature": round(_clamp(temperature, -5.0, 36.0), 2),
        "salinity": round(_clamp(salinity, 0.0, 45.0), 2),
        "current_speed": round(_clamp(current_speed, 0.0, 4.0), 2),
        "current_direction": round(current_direction, 1),
    }

    anomaly_score = abs(metrics["temperature"] - region["base_temperature"]) + abs(metrics["salinity"] - region["base_salinity"]) * 0.8
    if anomaly_score >= 7.0:
        status = "critical"
    elif anomaly_score >= 3.5:
        status = "warning"
    else:
        status = "normal"

    alerts = []
    if status != "normal":
        alerts.append(
            f"{region['name']} shows a {status} signal at {depth:.0f}m during {MONTH_NAMES[month]}"
        )
    else:
        alerts.append(f"{region['name']} remains within expected seasonal ranges at {depth:.0f}m")

    return {
        "region_id": region["id"],
        "region_name": region["name"],
        "month": month,
        "month_name": MONTH_NAMES[month],
        "depth": round(depth, 1),
        "metrics": metrics,
        "anomaly_status": status,
        "sensor_id": region["sensor"],
        "alerts": alerts,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "coordinates": region["coordinates"],
    }


def calculate_forecast(region_id: str) -> dict[str, Any]:
    region = get_region(region_id)
    base_temp = region["base_temperature"]
    base_sal = region["base_salinity"]
    temperature = []
    salinity = []
    for day in range(7):
        phase = day / 7.0 * math.pi
        temperature.append(round(base_temp + math.sin(phase) * 2.2 - day * 0.12, 2))
        salinity.append(round(base_sal + math.cos(phase) * 0.7 + day * 0.04, 2))
    return {
        "region_id": region["id"],
        "region_name": region["name"],
        "temperature": temperature,
        "salinity": salinity,
        "labels": [
            (datetime.now(timezone.utc) + timedelta(days=offset)).strftime("%a %d")
            for offset in range(1, 8)
        ],
    }


def build_regions_payload() -> dict[str, Any]:
    regions = []
    for key in REGION_MAP:
        region = REGION_MAP[key]
        regions.append(
            {
                "id": region["id"],
                "name": region["name"],
                "coordinates": region["coordinates"],
                "base_temperature": region["base_temperature"],
                "base_salinity": region["base_salinity"],
                "sensor": region["sensor"],
                "sensor_count": region["sensor_count"],
                "description": region["description"],
                "accent": region["accent"],
            }
        )
    return {"regions": sorted(regions, key=lambda item: item["name"])}


def build_ai_response(question: str, region_id: str | None = None) -> dict[str, Any]:
    region = get_region(region_id) if region_id else next(iter(REGION_MAP.values()))
    telemetry = compute_telemetry(region["id"], 200.0, 5)
    normalized_question = question.lower()
    answer = (
        f"AQUORA indicates that {region['name']} is tracking near its seasonal baseline. "
        f"Temperature is {telemetry['metrics']['temperature']}°C and salinity is {telemetry['metrics']['salinity']} PSU. "
        f"Current speed is {telemetry['metrics']['current_speed']} m/s with a heading of {telemetry['metrics']['current_direction']}° ."
    )

    if "anomaly" in normalized_question:
        answer = (
            f"I detected a {telemetry['anomaly_status']} anomaly pattern in {region['name']}. "
            f"Telemetry shows a temperature deviation around {telemetry['metrics']['temperature']}°C and salinity of {telemetry['metrics']['salinity']} PSU."
        )
    elif "temperature" in normalized_question:
        answer = (
            f"Projected temperature in {region['name']} at 200m remains {telemetry['metrics']['temperature']}°C, "
            f"which sits {('above' if telemetry['metrics']['temperature'] > region['base_temperature'] else 'below')} the regional baseline."
        )
    elif "salinity" in normalized_question:
        answer = (
            f"Salinity is presently {telemetry['metrics']['salinity']} PSU in {region['name']}. "
            f"This remains consistent with the expected halocline and seasonal salt balance for the basin."
        )
    elif "forecast" in normalized_question or "predict" in normalized_question:
        forecast = calculate_forecast(region["id"])
        answer = (
            f"The seven-day forecast for {region['name']} shows temperature trending between {min(forecast['temperature'])}°C and {max(forecast['temperature'])}°C, "
            f"with salinity ranging from {min(forecast['salinity'])} to {max(forecast['salinity'])} PSU."
        )

    return {
        "answer": answer,
        "region_id": region["id"],
        "status": telemetry["anomaly_status"],
        "context": telemetry,
    }
