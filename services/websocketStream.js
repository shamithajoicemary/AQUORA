import { WebSocketServer } from 'ws';
import { calculateMathFallback } from './hybridDataEngine.js';

let intervalId = null;
let activeClients = new Set();
let tickCount = 0;

/**
 * Initialize WebSocket Server attached to Express HTTP server
 */
export function setupWebSocketStream(server) {
  const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

  wss.on('connection', (ws, req) => {
    activeClients.add(ws);
    console.log(`[WS] Client connected. Total clients: ${activeClients.size}`);

    // Send immediate initial handshake telemetry
    const initialPayload = generateStreamPayload('bay_of_bengal', 0, 8, tickCount);
    ws.send(JSON.stringify(initialPayload));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe' || msg.action === 'subscribe') {
          ws.region = msg.region || 'bay_of_bengal';
          ws.depth = msg.depth !== undefined ? msg.depth : 0;
          ws.month = msg.month !== undefined ? msg.month : 8;
          // Send customized response immediately
          ws.send(JSON.stringify(generateStreamPayload(ws.region, ws.depth, ws.month, tickCount)));
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err.message);
      }
    });

    ws.on('close', () => {
      activeClients.delete(ws);
      console.log(`[WS] Client disconnected. Remaining: ${activeClients.size}`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
      activeClients.delete(ws);
    });
  });

  // Broadcast interval tick every 3000ms (3 seconds)
  if (!intervalId) {
    intervalId = setInterval(() => {
      tickCount++;
      if (activeClients.size === 0) return;

      const regions = [
        'bay_of_bengal',
        'north_pacific',
        'north_atlantic',
        'south_indian_ocean',
        'arctic_ocean',
        'mediterranean_sea'
      ];

      activeClients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          const region = ws.region || regions[tickCount % regions.length];
          const depth = ws.depth || 0;
          const month = ws.month || 8;

          const payload = generateStreamPayload(region, depth, month, tickCount);
          ws.send(JSON.stringify(payload));
        }
      });
    }, 3000);
  }
}

/**
 * Generate synthetic micro-fluctuations over thermocline baseline for live WS stream
 */
function generateStreamPayload(regionId, depth = 0, month = 8, tick = 0) {
  const base = calculateMathFallback(regionId, depth, month);

  // Apply harmonic wave micro-fluctuations
  const wave1 = Math.sin(tick * 0.4) * 0.18;
  const wave2 = Math.cos(tick * 0.25) * 0.12;
  const jitter = (Math.random() * 0.08 - 0.04);

  const flucTemp = parseFloat((base.temperature + wave1 + jitter).toFixed(2));
  const flucSalinity = parseFloat((base.salinity + (wave2 * 0.1) + (jitter * 0.2)).toFixed(2));
  const flucSpeed = parseFloat((base.currentSpeed + (wave1 * 0.05)).toFixed(2));
  const flucDirection = Math.round((base.currentDirection + (wave2 * 4)) % 360);

  return {
    type: 'TELEMETRY_TICK',
    action: 'TELEMETRY_TICK',
    tick,
    region: regionId,
    depth,
    month,
    dataSourceUsed: 'HYBRID_WEBSOCKET_STREAM',
    metrics: {
      temperature: flucTemp,
      salinity: flucSalinity,
      currentSpeed: flucSpeed,
      currentDirection: flucDirection,
      pressure: base.pressure,
      density: base.density,
      soundVelocity: base.soundVelocity,
      anomalyIndex: parseFloat((base.anomalyIndex + (wave1 * 0.05)).toFixed(3))
    },
    streamStatus: 'LIVE_STREAMING_ACTIVE',
    broadcastIntervalMs: 3000,
    timestamp: new Date().toISOString()
  };
}
