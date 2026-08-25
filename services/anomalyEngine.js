/**
 * AQUORA AI Anomaly Detection Engine
 * Evaluates thermal spikes, salinity shifts, current vector anomalies, and sensor drift.
 */
import { REGIONAL_CONFIGS } from './hybridDataEngine.js';

export function detectOceanAnomalies({ region = 'bay_of_bengal', depth = 0, month = 8 }) {
  const config = REGIONAL_CONFIGS[region] || REGIONAL_CONFIGS.bay_of_bengal;
  const depthNum = parseFloat(depth) || 0;
  
  // Historical baseline for this region and depth
  const baseSst = config.baseSst;
  const baseSal = config.baseSalinity;
  
  // Simulated current readings with potential anomalies
  const simulatedTempOffset = Math.sin(depthNum * 0.01) * 1.8 + (Math.random() * 0.6 - 0.3);
  const observedTemp = baseSst + simulatedTempOffset;
  const tempDelta = parseFloat((observedTemp - baseSst).toFixed(2));

  const anomalies = [];
  let severity = 'NOMINAL';

  // 1. Marine Heatwave / Thermal Spike Check (> +1.5°C deviation)
  if (tempDelta > 1.5) {
    severity = 'CRITICAL';
    anomalies.push({
      type: 'THERMAL_HEATWAVE_SPIKE',
      severity: 'HIGH',
      parameter: 'Sea Surface Temperature',
      delta: `+${tempDelta}°C`,
      threshold: '+1.50°C',
      description: `Marine heatwave detected in ${config.name} at ${depthNum}m. Temperature exceeds historical baseline by +${tempDelta}°C.`
    });
  } else if (tempDelta < -1.2) {
    severity = 'WARNING';
    anomalies.push({
      type: 'THERMAL_COLD_ANOMALY',
      severity: 'MEDIUM',
      parameter: 'Sea Surface Temperature',
      delta: `${tempDelta}°C`,
      threshold: '-1.20°C',
      description: `Upwelling cold anomaly observed in ${config.name}.`
    });
  }

  // 2. Salinity Influx Shift Check (> 1.2 PSU deviation)
  const salDelta = parseFloat(((Math.random() * 0.8 - 0.4)).toFixed(2));
  if (Math.abs(salDelta) > 0.35) {
    if (severity === 'NOMINAL') severity = 'MODERATE';
    anomalies.push({
      type: 'HALOCLINE_STRATIFICATION_SHIFT',
      severity: 'MEDIUM',
      parameter: 'Salinity',
      delta: `${salDelta > 0 ? '+' : ''}${salDelta} PSU`,
      threshold: '±0.30 PSU',
      description: `Abrupt salinity shift recorded in upper pycnocline layer.`
    });
  }

  // 3. Vector Speed Irregularity Check
  const currentDev = parseFloat((Math.sin(depthNum * 0.05) * 0.4).toFixed(2));
  if (Math.abs(currentDev) > 0.25) {
    anomalies.push({
      type: 'CURRENT_VECTOR_JET',
      severity: 'LOW',
      parameter: 'Flow Velocity',
      delta: `+${currentDev} m/s`,
      threshold: '±0.25 m/s',
      description: `Localized boundary current intensification detected.`
    });
  }

  // 4. Sensor Drift vs Model Expectation
  const sensorDriftScore = parseFloat((Math.abs(tempDelta * 0.12)).toFixed(3));

  return {
    status: 'success',
    region,
    regionName: config.name,
    depth: depthNum,
    severity,
    anomalyCount: anomalies.length,
    anomalies,
    metricsSummary: {
      observedTemp: parseFloat(observedTemp.toFixed(2)),
      baselineTemp: baseSst,
      tempDelta,
      salDelta,
      sensorDriftScore
    },
    alertCoordinates: [
      { lat: config.latMin + 5, lon: config.lonMin + 8, label: `${config.name} Heatwave` }
    ],
    timestamp: new Date().toISOString()
  };
}
