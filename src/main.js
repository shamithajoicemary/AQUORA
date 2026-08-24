import './style.css';

const API_BASE = 'http://localhost:8000';

const state = {
  region: 'bay_of_bengal',
  depth: 200,
  month: 5,
  regions: [],
  telemetry: null,
  forecast: null,
  liveSocket: null,
  chartInstances: {},
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const regionMeta = {
  bay_of_bengal: { x: -1.2, y: 0.6, z: 0.9 },
  north_pacific: { x: 1.3, y: 0.8, z: -1.2 },
  north_atlantic: { x: -0.5, y: 0.2, z: -1.8 },
  south_indian_ocean: { x: 0.8, y: 0.9, z: 1.4 },
  arctic_ocean: { x: -1.5, y: 1.9, z: -0.5 },
  mediterranean_sea: { x: 0.1, y: 0.4, z: -0.1 },
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-block">
        <button class="brand-button" id="toggle-region-modal" aria-label="Choose region">
          <span class="brand-sigil">◎</span>
        </button>
        <div class="brand-copy">
          <span class="brand-name">AQUORA</span>
          <span class="brand-subtitle">OCEAN COMMAND</span>
        </div>
      </div>

      <div class="topbar-center">
        <div class="status-pill">
          <span class="dot"></span>
          <span>SYSTEM ONLINE</span>
        </div>
        <div class="layer-toggles">
          <button class="toggle active" data-layer="temperature">Temperature Heatmap</button>
          <button class="toggle active" data-layer="salinity">Salinity Density</button>
          <button class="toggle active" data-layer="currents">Current Vectors</button>
          <button class="toggle active" data-layer="buoys">3D Sensor Buoys</button>
        </div>
      </div>

      <div class="stats-ticker">
        <div><span id="sensor-count">0</span><small>Active Sensors</small></div>
        <div><span id="avg-temp">0.0°C</span><small>Global Avg Temp</small></div>
        <div><span id="anomaly-count">0</span><small>Anomaly Alerts</small></div>
      </div>
    </header>

    <main class="dashboard-grid">
      <aside class="left-panel panel">
        <div class="panel-header">
          <p>Telemetry Controls</p>
          <span class="chip" id="status-chip">Normal</span>
        </div>

        <div class="field-block">
          <label for="region-select">Region Selector</label>
          <select id="region-select"></select>
        </div>

        <div class="field-block">
          <label for="depth-range">Depth</label>
          <div class="range-row">
            <span>0m</span>
            <input id="depth-range" type="range" min="0" max="1000" step="10" value="200" />
            <span>1000m</span>
          </div>
          <div class="value-readout" id="depth-value">200 m</div>
        </div>

        <div class="field-block">
          <label for="month-range">Timeline</label>
          <div class="range-row">
            <span>Jan</span>
            <input id="month-range" type="range" min="0" max="11" step="1" value="5" />
            <span>Dec</span>
          </div>
          <div class="value-readout" id="month-value">May</div>
        </div>

        <div class="telemetry-grid">
          <div class="metric-card">
            <span>Water Temperature</span>
            <strong id="metric-temp">0.0</strong>
            <small>°C</small>
          </div>
          <div class="metric-card">
            <span>Salinity</span>
            <strong id="metric-salinity">0.0</strong>
            <small>PSU</small>
          </div>
          <div class="metric-card">
            <span>Current Speed</span>
            <strong id="metric-speed">0.0</strong>
            <small>m/s</small>
          </div>
          <div class="metric-card">
            <span>Direction</span>
            <strong id="metric-direction">0°</strong>
            <small>Vector</small>
          </div>
        </div>
      </aside>

      <section class="center-panel">
        <div class="viewport-wrap">
          <div id="ocean-scene"></div>
          <div class="viewport-labels">
            <div class="coords-panel">
              <span id="coords-label">15.0°N, 89.0°E</span>
              <small>REGION GRID</small>
            </div>
            <div class="depth-badge">
              <small>DEPTH</small>
              <strong id="viewport-depth">200m</strong>
            </div>
            <div class="context-pill">
              <span class="pulse"></span>
              <span id="context-text">monitoring / live field</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="right-panel panel">
        <div class="panel-header analytics-header">
          <p>Analytics</p>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <span>Model vs. Reality</span>
            <strong id="model-fit">96%</strong>
          </div>
          <canvas id="telemetryChart"></canvas>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <span>7-Day Forecast</span>
            <strong>Temp / Salinity</strong>
          </div>
          <canvas id="forecastChart"></canvas>
        </div>

        <div class="chat-panel">
          <div class="chat-header">
            <span>ASK AQUORA</span>
            <small>AI Assistant</small>
          </div>
          <div id="chat-window" class="chat-window">
            <div class="chat-bubble bot">
              Ready to analyze the current basin conditions and forecast signals.
            </div>
          </div>
          <div class="quick-prompts">
            <button class="prompt-btn">Analyze current anomaly</button>
            <button class="prompt-btn">Predict temperature shift</button>
          </div>
          <form id="chat-form" class="chat-form">
            <input id="chat-input" type="text" placeholder="Ask about this region..." />
            <button type="submit">↗</button>
          </form>
        </div>
      </aside>
    </main>
  </div>

  <div id="region-modal" class="modal hidden">
    <div class="modal-card">
      <div class="modal-header">
        <span>SELECT REGION</span>
        <button id="close-modal">×</button>
      </div>
      <h2>Choose an oceanic monitoring region</h2>
      <div id="region-list" class="region-list"></div>
    </div>
  </div>
`;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function setStatusTone(status) {
  const chip = $('#status-chip');
  const label = {
    normal: 'Normal',
    warning: 'Warning',
    critical: 'Critical',
  }[status] || 'Normal';
  chip.textContent = label;
  chip.dataset.status = status;
}

function formatDirection(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
}

function computeGlobalAverage(regions) {
  if (!regions.length) return '0.0°C';
  const average = regions.reduce((sum, region) => sum + region.base_temperature, 0) / regions.length;
  return `${average.toFixed(1)}°C`;
}

function renderRegionOptions(regions) {
  const select = $('#region-select');
  select.innerHTML = regions.map((region) => `
    <option value="${region.id}">${region.name}</option>
  `).join('');
  select.value = state.region;
}

function renderRegionCards(regions) {
  const regionList = $('#region-list');
  regionList.innerHTML = regions.map((region, index) => `
    <button class="region-card" data-region="${region.id}" style="--accent:${region.accent || '#00f2fe'}">
      <span class="region-index">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <strong>${region.name}</strong>
        <small>${region.coordinates[0]}°N, ${region.coordinates[1]}°E · ${region.description}</small>
      </div>
      <em>${region.sensor_count} sensors</em>
    </button>
  `).join('');

  regionList.querySelectorAll('.region-card').forEach((card) => {
    card.addEventListener('click', () => {
      state.region = card.dataset.region;
      syncRegionSelection();
      $('#region-modal').classList.add('hidden');
      refreshAll();
    });
  });
}

function syncRegionSelection() {
  const select = $('#region-select');
  select.value = state.region;
  const region = state.regions.find((item) => item.id === state.region) || state.regions[0];
  if (!region) return;
  const coordText = `${Math.abs(region.coordinates[0]).toFixed(1)}°${region.coordinates[0] >= 0 ? 'N' : 'S'}, ${Math.abs(region.coordinates[1]).toFixed(1)}°${region.coordinates[1] >= 0 ? 'E' : 'W'}`;
  $('#coords-label').textContent = coordText;
  $('#context-text').textContent = region.description;
  $('#sensor-count').textContent = region.sensor_count;
}

function updateTelemetryDisplay(telemetry) {
  const temperature = telemetry.metrics.temperature;
  const salinity = telemetry.metrics.salinity;
  const speed = telemetry.metrics.current_speed;
  const direction = telemetry.metrics.current_direction;

  $('#metric-temp').textContent = temperature.toFixed(1);
  $('#metric-salinity').textContent = salinity.toFixed(1);
  $('#metric-speed').textContent = speed.toFixed(2);
  $('#metric-direction').textContent = `${formatDirection(direction)} · ${direction.toFixed(0)}°`;
  $('#depth-value').textContent = `${Math.round(telemetry.depth)} m`;
  $('#viewport-depth').textContent = `${Math.round(telemetry.depth)}m`;
  $('#month-value').textContent = telemetry.month_name;
  $('#avg-temp').textContent = `${temperature.toFixed(1)}°C`;
  $('#status-chip').textContent = telemetry.anomaly_status.charAt(0).toUpperCase() + telemetry.anomaly_status.slice(1);
  $('#status-chip').dataset.status = telemetry.anomaly_status;
  setStatusTone(telemetry.anomaly_status);
}

function renderBubble(message, type = 'bot') {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = message;
  $('#chat-window').appendChild(bubble);
  $('#chat-window').scrollTop = $('#chat-window').scrollHeight;
}

async function refreshTelemetry() {
  const telemetry = await fetchJson(`${API_BASE}/api/v1/telemetry?region=${state.region}&depth=${state.depth}&month=${state.month}`);
  state.telemetry = telemetry;
  updateTelemetryDisplay(telemetry);
}

async function refreshForecast() {
  const forecast = await fetchJson(`${API_BASE}/api/v1/forecast?region=${state.region}`);
  state.forecast = forecast;

  const temperatureData = forecast.temperature;
  const salinityData = forecast.salinity;

  const forecastCtx = $('#forecastChart').getContext('2d');
  if (state.chartInstances.forecast) {
    state.chartInstances.forecast.destroy();
  }

  state.chartInstances.forecast = new Chart(forecastCtx, {
    type: 'line',
    data: {
      labels: forecast.labels,
      datasets: [
        {
          label: 'Temperature',
          data: temperatureData,
          borderColor: '#00f2fe',
          backgroundColor: 'rgba(0,242,254,0.1)',
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Salinity',
          data: salinityData,
          borderColor: '#00f5a0',
          backgroundColor: 'rgba(0,245,160,0.08)',
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#d7f9ff' } } },
      scales: {
        x: { ticks: { color: '#a9dfe8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#7fe8f5' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y1: { position: 'right', ticks: { color: '#87f0c2' }, grid: { drawOnChartArea: false } },
      }
    }
  });
}

function renderComparisonChart() {
  const canvas = $('#telemetryChart');
  const ctx = canvas.getContext('2d');
  const model = [26, 24.5, 23.1, 22.5, 21.8, 20.9, 20.1];
  const sensor = [25.9, 24.2, 23.9, 22.8, 22.2, 21.4, 20.6];

  if (state.chartInstances.telemetry) {
    state.chartInstances.telemetry.destroy();
  }

  state.chartInstances.telemetry = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['0', '1', '2', '3', '4', '5', '6'],
      datasets: [
        { label: 'Model', data: model, borderColor: '#00f2fe', backgroundColor: 'rgba(0,242,254,0.08)', fill: false, tension: 0.35 },
        { label: 'Reality', data: sensor, borderColor: '#00f5a0', backgroundColor: 'rgba(0,245,160,0.08)', fill: false, tension: 0.35 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#d7f9ff' } } },
      scales: {
        x: { ticks: { color: '#a9dfe8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#a9dfe8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      }
    }
  });

  $('#model-fit').textContent = '96%';
}

async function refreshRegions() {
  const payload = await fetchJson(`${API_BASE}/api/v1/regions`);
  state.regions = payload.regions;
  renderRegionOptions(state.regions);
  renderRegionCards(state.regions);
  syncRegionSelection();
  $('#sensor-count').textContent = state.regions.reduce((sum, region) => sum + region.sensor_count, 0);
  $('#avg-temp').textContent = computeGlobalAverage(state.regions);
  $('#anomaly-count').textContent = String(Math.max(3, state.regions.length - 2));
}

async function askAquora(question) {
  const response = await fetchJson(`${API_BASE}/api/v1/ai/chat`, {
    method: 'POST',
    body: JSON.stringify({ question, region: state.region }),
  });
  renderBubble(response.answer, 'bot');
  return response;
}

function bindEvents() {
  $('#region-select').addEventListener('change', (event) => {
    state.region = event.target.value;
    syncRegionSelection();
    refreshAll();
  });

  $('#depth-range').addEventListener('input', (event) => {
    state.depth = Number(event.target.value);
    $('#depth-value').textContent = `${state.depth} m`;
    refreshTelemetry();
  });

  $('#month-range').addEventListener('input', (event) => {
    state.month = Number(event.target.value);
    $('#month-value').textContent = monthNames[state.month];
    refreshTelemetry();
  });

  $('#toggle-region-modal').addEventListener('click', () => {
    $('#region-modal').classList.toggle('hidden');
  });

  $('#close-modal').addEventListener('click', () => {
    $('#region-modal').classList.add('hidden');
  });

  $('#chat-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $('#chat-input');
    const value = input.value.trim();
    if (!value) return;
    renderBubble(value, 'user');
    input.value = '';
    await askAquora(value);
  });

  $('.prompt-btn').addEventListener('click', async (event) => {
    const prompt = event.target.textContent;
    renderBubble(prompt, 'user');
    await askAquora(prompt);
  });

  document.querySelectorAll('.toggle').forEach((button) => {
    button.addEventListener('click', () => button.classList.toggle('active'));
  });

  $('.prompt-btn:nth-of-type(2)').addEventListener('click', async () => {
    renderBubble('Predict temperature shift', 'user');
    await askAquora('Predict temperature shift');
  });
}

async function refreshAll() {
  await refreshRegions();
  await refreshTelemetry();
  await refreshForecast();
}

function initThreeScene() {
  const container = $('#ocean-scene');
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#050b14', 6, 18);

  const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 2.8, 7.7);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight('#9de8ff', 1.1);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight('#5fddff', 1.8);
  sun.position.set(2, 6, 3);
  scene.add(sun);

  const oceanGeometry = new THREE.CylinderGeometry(3.5, 4.8, 2.2, 80, 28, true, 0, Math.PI * 2);
  const oceanMaterial = new THREE.MeshPhysicalMaterial({
    color: '#0a1d2c',
    transparent: true,
    opacity: 0.88,
    roughness: 0.22,
    metalness: 0.18,
    transmission: 0.2,
    emissive: '#071d2b',
    side: THREE.DoubleSide,
  });
  const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.3;
  scene.add(ocean);

  const waterGlow = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 42, 42),
    new THREE.MeshBasicMaterial({ color: '#00d9ff', transparent: true, opacity: 0.08, wireframe: true })
  );
  waterGlow.position.y = 0.2;
  scene.add(waterGlow);

  const particles = [];
  for (let i = 0; i < 160; i += 1) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 + Math.random() * 0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#7de7ff', transparent: true, opacity: 0.8 })
    );
    particle.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 6);
    scene.add(particle);
    particles.push(particle);
  }

  const buoyGroup = new THREE.Group();
  scene.add(buoyGroup);

  function buildSensorBuoys() {
    buoyGroup.clear();
    Object.entries(regionMeta).forEach(([id, position]) => {
      const buoy = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.7, 18),
        new THREE.MeshStandardMaterial({ color: id === state.region ? '#00f5a0' : '#6fe5ff', emissive: id === state.region ? '#00f5a0' : '#0b4f62', emissiveIntensity: 0.8 })
      );
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 18, 18),
        new THREE.MeshStandardMaterial({ color: '#dffcff', emissive: '#00f2fe', emissiveIntensity: 1.1 })
      );
      orb.position.y = 0.6;
      buoy.add(base);
      buoy.add(orb);
      buoy.position.set(position.x, position.y, position.z);
      buoyGroup.add(buoy);
    });
  }

  buildSensorBuoys();

  let animationFrame = 0;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    ocean.rotation.z += 0.0012;
    waterGlow.rotation.y += 0.004;

    particles.forEach((particle, index) => {
      particle.position.y += Math.sin((performance.now() * 0.001) + index) * 0.002;
      particle.position.x += Math.sin(index + performance.now() * 0.0008) * 0.0008;
    });

    camera.position.x = Math.sin(performance.now() * 0.0004) * 0.8;
    camera.lookAt(0, 0.4, 0);
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    const width = container.clientWidth || 700;
    const height = container.clientHeight || 500;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  return { buildSensorBuoys };
}

(async function init() {
  bindEvents();
  renderComparisonChart();
  renderBubble('System online. Basin telemetry is synchronized and ready for analysis.', 'bot');
  await refreshAll();
  const sceneController = initThreeScene();
  const syncBuoys = () => sceneController.buildSensorBuoys();
  $('#region-select').addEventListener('change', syncBuoys);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshAll();
    }
  });

  const socketUrl = `${API_BASE.replace('http', 'ws')}/ws/telemetry`;
  try {
    state.liveSocket = new WebSocket(socketUrl);
    state.liveSocket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'telemetry' && payload.data?.region_id === state.region) {
        const metrics = payload.data.metrics;
        $('#metric-temp').textContent = metrics.temperature.toFixed(1);
        $('#metric-salinity').textContent = metrics.salinity.toFixed(1);
        $('#metric-speed').textContent = metrics.current_speed.toFixed(2);
        $('#metric-direction').textContent = `${formatDirection(metrics.current_direction)} · ${metrics.current_direction.toFixed(0)}°`;
      }
    };
  } catch (error) {
    console.warn('WebSocket unavailable, continuing with polling.', error);
  }
})();
