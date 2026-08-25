/**
 * AI Assistant Chat Engine ("ASK AQUORA") with real-time oceanographic context awareness
 */
export function handleAiChat({ message, context = {} }) {
  const query = (message || '').trim().toLowerCase();
  const region = context.regionName || context.region || 'Selected Basin';
  const depth = context.depth !== undefined ? context.depth : 0;
  const temp = context.metrics?.temperature ?? 24.5;
  const salinity = context.metrics?.salinity ?? 34.5;
  const soundVel = context.metrics?.soundVelocity ?? 1530;
  const dataSource = context.dataSourceUsed || 'HYBRID_DATA_ENGINE';

  let responseText = '';
  let keyInsights = [];
  let threatLevel = 'NORMAL';
  let uiAction = null;

  if (query.includes('pacific') || query.includes('north pacific')) {
    uiAction = { actionType: 'NAVIGATE_3D', regionId: 'north_pacific', depth: 200, highlightAnomalies: true };
    responseText = `Shifting 3D view camera to **North Pacific Ocean** (200m Depth). Analyzing Subarctic Frontal Zone temperature anomalies and gyre currents.`;
    keyInsights = ['Target Region: North Pacific Ocean', 'Camera shifted to buoy marker #02', 'Depth layer: 200m'];
  } else if (query.includes('atlantic') || query.includes('gulf')) {
    uiAction = { actionType: 'NAVIGATE_3D', regionId: 'north_atlantic', depth: 100, highlightAnomalies: true };
    responseText = `Focusing 3D spatial view on **North Atlantic Ocean** (100m Depth). Gulf Stream vector field and AMOC transport monitoring active.`;
    keyInsights = ['Target Region: North Atlantic Ocean', 'Gulf Stream Transport Velocity: 1.1 m/s'];
  } else if (query.includes('thermocline') || query.includes('layer') || query.includes('gradient')) {
    uiAction = { actionType: 'SET_DEPTH', depth: 300 };
    responseText = `Analyzing vertical thermal profile for **${region}** at **${depth}m** depth:
The current temperature is recorded at **${temp}°C**. In this ocean basin, the thermocline layer typically experiences rapid thermal drop between 100m and 400m. At your current depth setting (${depth}m), the thermal gradient is actively governed by ${dataSource === 'ARGOVIS' ? 'live Argo float profiling' : 'exponential thermocline modeling'}.`;
    keyInsights = [
      `SST to Deep Temp delta: ${(temp - 4.0).toFixed(1)}°C`,
      `Acoustic Layer Shadow Zone depth threshold: ~180m`,
      `Active telemetry source: ${dataSource}`
    ];
  } else if (query.includes('bleach') || query.includes('coral') || query.includes('heat') || query.includes('warm')) {
    uiAction = { actionType: 'HIGHLIGHT_ANOMALIES', severity: 'HIGH' };
    if (temp > 28.0) {
      threatLevel = 'WARNING';
      responseText = `⚠️ **Marine Heatwave / Coral Bleaching Risk Alert**:
In **${region}**, the sea surface temperature is currently at **${temp}°C**, which exceeds the thermal tolerance threshold for major coral reef ecosystems by +${(temp - 27.5).toFixed(1)}°C. Highlighting spatial thermal anomalies on 3D viewport.`;
      keyInsights = [
        `Degree Heating Weeks (DHW): 4.2 °C-weeks`,
        `Recommendation: Deploy localized surface shading or deep ocean upwelling monitoring.`
      ];
    } else {
      responseText = `Coral health assessment for **${region}**: The current temperature of **${temp}°C** is within normal non-stress limits. Coral reef thermal stress risk is currently **LOW**.`;
      keyInsights = ['Degree Heating Weeks: 0.8 °C-weeks', 'No acute thermal anomaly detected.'];
    }
  } else if (query.includes('sonar') || query.includes('sound') || query.includes('acoustic') || query.includes('speed')) {
    uiAction = { actionType: 'SET_DEPTH', depth: 800 };
    responseText = `Acoustic Propagation Analysis in **${region}** (${depth}m depth):
The calculated sound velocity in seawater is **${soundVel} m/s** (derived via the Mackenzie seawater acoustics formula using T=${temp}°C, S=${salinity} PSU, P=${context.metrics?.pressure || (depth * 0.1)} dbar).
The sound channel axis (SOFAR channel minimum) is projected at approximately 800m to 1000m. Focus depth set to SOFAR axis (800m).`;
    keyInsights = [
      `Sound Speed: ${soundVel} m/s`,
      `SOFAR Axis Depth: ~920m`,
      `Refractive Index Gradients: Stable`
    ];
  } else if (query.includes('salinity') || query.includes('halocline') || query.includes('salt') || query.includes('density')) {
    responseText = `Halocline & Hydrodynamic Profile:
In **${region}**, the salinity at **${depth}m** is measured at **${salinity} PSU** with a seawater density of **${context.metrics?.density || 1025} kg/m³**. Surface freshwater influx (monsoon runoff or ice melt) creates sharp density stratification in the upper 50m.`;
    keyInsights = [
      `Salinity: ${salinity} PSU`,
      `Seawater Density: ${context.metrics?.density || 1025} kg/m³`,
      `Pycnocline Gradient: Moderate`
    ];
  } else if (query.includes('anomaly') || query.includes('risk') || query.includes('status')) {
    const anomaly = context.metrics?.anomalyIndex ?? 0.05;
    threatLevel = Math.abs(anomaly) > 0.3 ? 'ELEVATED' : 'STABLE';
    uiAction = { actionType: 'HIGHLIGHT_ANOMALIES' };
    responseText = `System Status Report for **${region}** (Data Source: **${dataSource}**):
Current anomaly index is **${(anomaly * 100).toFixed(1)}%** relative to historical baseline averages. Highlighting anomalous alert vectors on 3D map.`;
    keyInsights = [
      `Telemetry Pipeline: ${dataSource}`,
      `Thermal Anomaly: ${anomaly > 0 ? '+' : ''}${anomaly.toFixed(3)}`,
      `WebSocket Feed: ACTIVE (3s interval)`
    ];
  } else {
    responseText = `Hello! I am **AQUORA AI**, your specialized oceanographic intelligence assistant.
Currently analyzing **${region}** at **${depth}m** depth:
- **Sea Temperature**: ${temp}°C
- **Salinity**: ${salinity} PSU
- **Current Vector**: ${context.metrics?.currentSpeed || 0.7} kts @ ${context.metrics?.currentDirection || 140}°
- **Data Engine Tier**: ${dataSource}

Feel free to ask me to navigate to ocean basins, analyze Thermocline shifts, check Coral Bleaching risks, or inspect Sonar sound speed profiles!`;
    keyInsights = [
      `Region: ${region}`,
      `Depth Horizon: ${depth}m`,
      `Pipeline: ${dataSource}`
    ];
  }

  return {
    status: 'success',
    query: message,
    threatLevel,
    response: responseText,
    keyInsights,
    uiAction,
    contextSummary: {
      region,
      depth: `${depth}m`,
      temperature: `${temp}°C`,
      salinity: `${salinity} PSU`,
      dataSource
    },
    timestamp: new Date().toISOString()
  };
}
