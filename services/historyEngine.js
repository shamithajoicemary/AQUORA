/**
 * AQUORA Interactive Time-Travel Engine
 * Generates and interpolates historical (past 30 days) and forecast (+7 days) telemetry time-series.
 */
import { calculateMathFallback } from './hybridDataEngine.js';

export function getHistoricalTelemetry({ region = 'bay_of_bengal', depth = 0, days = 30 }) {
  const daysNum = Math.min(30, Math.max(1, parseInt(days, 10) || 30));
  const depthNum = parseFloat(depth) || 0;
  const historySeries = [];

  const now = new Date();

  for (let i = daysNum; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Base math calculation for seasonal month
    const month = date.getMonth() + 1;
    const base = calculateMathFallback(region, depthNum, month);

    // Apply temporal harmonic wave offset
    const timeHarmonic = Math.sin((i / 30) * Math.PI * 4) * 0.75;
    const noise = (Math.sin(i * 2.3) * 0.15);

    const temp = parseFloat((base.temperature + timeHarmonic + noise).toFixed(2));
    const sal = parseFloat((base.salinity + (timeHarmonic * 0.1) - noise * 0.05).toFixed(2));
    const speed = parseFloat((base.currentSpeed + (timeHarmonic * 0.05)).toFixed(2));

    historySeries.push({
      daysAgo: i,
      dateLabel: dayLabel,
      timestamp: date.toISOString(),
      temperature: temp,
      salinity: sal,
      currentSpeed: speed,
      currentDirection: base.currentDirection,
      pressure: base.pressure,
      density: base.density
    });
  }

  return {
    status: 'success',
    region,
    depth: depthNum,
    daysRequested: daysNum,
    dataPoints: historySeries.length,
    series: historySeries,
    timestamp: new Date().toISOString()
  };
}
