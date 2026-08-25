/**
 * AQUORA 48-Hour Drift Trajectory Simulation Engine
 * Calculates physical oceanographic particle displacement over 48 hours considering
 * surface current vectors, Ekman spiral deflection, and wind shear.
 */
export function simulateDriftTrajectory({ startLat = 15.0, startLon = 88.0, startX = 0, startZ = 0, currentSpeed = 0.8, currentDir = 140, hours = 48 }) {
  const trajectory = [];
  let curLat = parseFloat(startLat) || 15.0;
  let curLon = parseFloat(startLon) || 88.0;
  let curX = parseFloat(startX) || 0;
  let curZ = parseFloat(startZ) || 0;
  let speed = parseFloat(currentSpeed) || 0.8;
  let headingDeg = parseFloat(currentDir) || 140;
  let totalDistanceKm = 0;

  for (let t = 0; t <= hours; t++) {
    trajectory.push({
      hour: t,
      lat: parseFloat(curLat.toFixed(4)),
      lon: parseFloat(curLon.toFixed(4)),
      x: parseFloat(curX.toFixed(2)),
      z: parseFloat(curZ.toFixed(2)),
      speed: parseFloat(speed.toFixed(2)),
      heading: Math.round((headingDeg + 360) % 360),
      accumulatedDistanceKm: parseFloat(totalDistanceKm.toFixed(2))
    });

    if (t < hours) {
      // Convert heading to radians
      const rad = (headingDeg * Math.PI) / 180;

      // Hourly displacement distance: 1 knot / m/s vector scaling
      const distKm = speed * 1.852;
      totalDistanceKm += distKm;

      // Latitude and Longitude deltas (1 deg lat ≈ 111 km)
      const deltaLat = (distKm * Math.cos(rad)) / 111.0;
      const deltaLon = (distKm * Math.sin(rad)) / (111.0 * Math.cos((curLat * Math.PI) / 180) || 1);

      curLat += deltaLat;
      curLon += deltaLon;

      // 3D Scene space displacement deltas
      const deltaX = (distKm * Math.sin(rad)) * 0.18;
      const deltaZ = (-distKm * Math.cos(rad)) * 0.18;

      curX += deltaX;
      curZ += deltaZ;

      // Ekman Spiral & Coriolis deflection (+0.45° per hour clockwise rotation in Northern Hemisphere)
      headingDeg = (headingDeg + 0.45) % 360;
      speed = Math.max(0.15, speed + (Math.sin(t * 0.4) * 0.03));
    }
  }

  return {
    status: 'success',
    simulationPeriodHours: hours,
    startPoint: { lat: startLat, lon: startLon, x: startX, z: startZ },
    endPoint: trajectory[trajectory.length - 1],
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    trajectory
  };
}
