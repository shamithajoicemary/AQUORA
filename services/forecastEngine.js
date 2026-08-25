import { REGIONAL_CONFIGS } from './hybridDataEngine.js';

/**
 * Generate 7-day predictive curves and oceanographic trend arrays
 */
export function get7DayForecast(regionId = 'bay_of_bengal') {
  const config = REGIONAL_CONFIGS[regionId] || REGIONAL_CONFIGS.bay_of_bengal;
  const days = [];
  const tempForecast = [];
  const salinityForecast = [];
  const currentForecast = [];
  const waveHeightForecast = [];
  const confidenceScore = [];

  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    days.push(dayLabel);

    // Predict trend curves using harmonic sine wave + regional drift
    const trendOffset = Math.sin((i / 7) * Math.PI * 2) * 0.8;
    const noise = (Math.sin(i * 3.5) * 0.2);

    const temp = config.baseSst + trendOffset + noise;
    const salinity = config.baseSalinity + (trendOffset * 0.15) - noise * 0.05;
    const current = config.baseCurrentSpeed + (trendOffset * 0.1) + Math.abs(noise * 0.08);
    const waveHeight = 1.2 + Math.abs(Math.sin(i * 1.2) * 1.4);
    const confidence = 98 - (i * 2.5) + (Math.random() * 1.5);

    tempForecast.push(parseFloat(temp.toFixed(2)));
    salinityForecast.push(parseFloat(salinity.toFixed(2)));
    currentForecast.push(parseFloat(current.toFixed(2)));
    waveHeightForecast.push(parseFloat(waveHeight.toFixed(2)));
    confidenceScore.push(parseFloat(confidence.toFixed(1)));
  }

  return {
    status: 'success',
    region: regionId,
    regionName: config.name,
    forecastPeriod: '7-Day Predictive Horizon',
    days,
    tempForecast,
    salinityForecast,
    currentForecast,
    waveHeightForecast,
    confidenceScore,
    summary: {
      avgTemp: parseFloat((tempForecast.reduce((a, b) => a + b, 0) / 7).toFixed(2)),
      avgSalinity: parseFloat((salinityForecast.reduce((a, b) => a + b, 0) / 7).toFixed(2)),
      maxWaveHeight: Math.max(...waveHeightForecast),
      riskAssessment: Math.max(...waveHeightForecast) > 2.2 ? 'MODERATE SWELL / WAVE WARNING' : 'LOW MARITIME RISK'
    },
    generatedAt: new Date().toISOString()
  };
}
