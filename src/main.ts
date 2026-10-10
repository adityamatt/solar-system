import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createCoordinateFrame } from './solarSystem/CoordinateFrame';
import { getDateFromDaysSinceJ2000, getDaysSinceJ2000 } from './solarSystem/Ephemeris';
import { IlluminationEngine } from './solarSystem/IlluminationEngine';
import { getEarthMoonState } from './solarSystem/LunarEphemeris';
import { Planet } from './solarSystem/Planet';
import { createSolarSystemComposite } from './solarSystem/SolarSystemComposite';
import { SpacetimeLattice } from './solarSystem/SpacetimeLattice';
import {
  BODIES,
  DEFAULT_DAYS_PER_SECOND,
  getDisplayGravitationalRadius,
  getMetricMaxContraction,
  getMetricSoftening,
} from './solarSystem/constants';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root element');
}

app.innerHTML = `
  <main class="simulation-shell">
    <canvas id="solar-canvas" aria-label="General relativity inspired solar system animation"></canvas>
    <aside class="telemetry" aria-label="Simulation telemetry">
      <div>
        <p class="telemetry-label">Simulation time</p>
        <time id="simulation-time" datetime="">--</time>
      </div>
      <div class="body-locations">
        <p class="telemetry-label">Heliocentric body locations</p>
        <div class="location-table" aria-label="Body positions in astronomical units">
          <div class="location-heading" aria-hidden="true">
            <span>Body</span>
            <span>X</span>
            <span>Y</span>
            <span>Z</span>
          </div>
          <div id="body-location-list"></div>
        </div>
      </div>
    </aside>
    <section class="hud" aria-label="Simulation controls">
      <div class="hud-header">
        <div>
          <p class="eyebrow">Solar System / GR sketch</p>
          <h1>Mass changes the metric: space contracts around the solar system</h1>
        </div>
        <button id="hud-toggle" class="hud-toggle" type="button" aria-expanded="true" aria-controls="hud-body">
          Hide
        </button>
      </div>
      <div id="hud-body" class="hud-body" aria-hidden="false">
        <dl class="metrics">
          <div>
            <dt>Time scale</dt>
            <dd><span id="time-scale">${DEFAULT_DAYS_PER_SECOND}</span> days / sec</dd>
          </div>
          <div>
            <dt>Earth orbit</dt>
            <dd>365.25 : 1 day spin</dd>
          </div>
          <div>
            <dt>Earth flux</dt>
            <dd><span id="earth-flux">100</span>% of 1 AU</dd>
          </div>
          <div>
            <dt>Moon phase</dt>
            <dd><span id="moon-phase">--</span></dd>
          </div>
          <div>
            <dt>Illumination</dt>
            <dd><span id="illumination-label">1.0</span>x curve</dd>
          </div>
          <div>
            <dt>Grid thickness</dt>
            <dd><span id="grid-thickness-label">1.0</span>x</dd>
          </div>
          <div>
            <dt>Camera focus</dt>
            <dd><span id="focus-label">Sun</span></dd>
          </div>
        </dl>
        <label class="select-row" for="focus-control">
          <span>Focus</span>
          <select id="focus-control"></select>
        </label>
        <div class="control-row slider-row">
          <label for="speed-control">Speed</label>
          <input id="speed-control" type="range" min="1" max="90" step="1" value="${DEFAULT_DAYS_PER_SECOND}" />
          <div class="slider-bounds" aria-label="Speed range settings">
            <label>Min <input id="speed-min-control" type="number" step="1" value="1" /></label>
            <label>Value <input id="speed-value-control" type="number" step="1" value="${DEFAULT_DAYS_PER_SECOND}" /></label>
            <label>Max <input id="speed-max-control" type="number" step="1" value="90" /></label>
          </div>
        </div>
        <div class="control-row slider-row">
          <label for="illumination-control">Light</label>
          <input id="illumination-control" type="range" min="0.2" max="50" step="0.2" value="1" />
          <div class="slider-bounds" aria-label="Light range settings">
            <label>Min <input id="illumination-min-control" type="number" step="0.1" value="0.2" /></label>
            <label>Value <input id="illumination-value-control" type="number" step="0.1" value="1" /></label>
            <label>Max <input id="illumination-max-control" type="number" step="1" value="50" /></label>
          </div>
        </div>
        <label class="toggle-row" for="orbit-path-control">
          <span>Paths</span>
          <input id="orbit-path-control" type="checkbox" checked />
        </label>
        <label class="color-row" for="grid-color-control">
          <span>Grid</span>
          <input id="grid-color-control" type="color" value="#63d4ff" />
        </label>
        <div class="control-row slider-row">
          <label for="grid-thickness-control">Lines</label>
          <input id="grid-thickness-control" type="range" min="0.25" max="10" step="0.05" value="1" />
          <div class="slider-bounds" aria-label="Grid line thickness range settings">
            <label>Min <input id="grid-thickness-min-control" type="number" step="0.05" value="0.25" /></label>
            <label>Value <input id="grid-thickness-value-control" type="number" step="0.05" value="1" /></label>
            <label>Max <input id="grid-thickness-max-control" type="number" step="0.5" value="10" /></label>
          </div>
        </div>
        <label class="toggle-row" for="grid-visibility-control">
          <span>Grid</span>
          <input id="grid-visibility-control" type="checkbox" checked />
        </label>
      </div>
    </section>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#solar-canvas');
if (!canvas) {
  throw new Error('Missing #solar-canvas element');
}
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);
scene.fog = new THREE.Fog(0x02040a, 480, 1150);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 34, 76);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 9;
controls.maxDistance = 720;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0x667799, 0.35);
scene.add(ambientLight);

const solarLight = new THREE.PointLight(0xffd6a0, 110, 0, 2);
scene.add(solarLight);

const starField = createStarField();
scene.add(starField);

const coordinateFrame = createCoordinateFrame({ size: 18 });
scene.add(coordinateFrame);

const lattice = new SpacetimeLattice({
  color: 0x63d4ff,
  opacity: 0.16,
});
scene.add(lattice.group);

const sun = new Planet({
  ...BODIES.sun,
  material: new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff8a1c,
    emissiveIntensity: 2.8,
    roughness: 0.55,
    transparent: false,
    opacity: 1,
    fog: false,
  }),
});
scene.add(sun.group);

const solarSystem = createSolarSystemComposite();
scene.add(solarSystem.group);
const illuminationEngine = new IlluminationEngine({
  sunPosition: sun.position,
  root: solarSystem.group,
  referenceDistance: BODIES.earth.orbitRadius,
});

const focusOptions = ['Sun', ...solarSystem.getPlanetNames()];

const timer = new THREE.Timer();
timer.connect(document);
const speedControl = document.querySelector<HTMLInputElement>('#speed-control');
const speedMinControl = document.querySelector<HTMLInputElement>('#speed-min-control');
const speedValueControl = document.querySelector<HTMLInputElement>('#speed-value-control');
const speedMaxControl = document.querySelector<HTMLInputElement>('#speed-max-control');
const illuminationControl = document.querySelector<HTMLInputElement>('#illumination-control');
const illuminationMinControl = document.querySelector<HTMLInputElement>('#illumination-min-control');
const illuminationValueControl = document.querySelector<HTMLInputElement>('#illumination-value-control');
const illuminationMaxControl = document.querySelector<HTMLInputElement>('#illumination-max-control');
const orbitPathControl = document.querySelector<HTMLInputElement>('#orbit-path-control');
const gridColorControl = document.querySelector<HTMLInputElement>('#grid-color-control');
const gridThicknessControl = document.querySelector<HTMLInputElement>('#grid-thickness-control');
const gridThicknessMinControl = document.querySelector<HTMLInputElement>('#grid-thickness-min-control');
const gridThicknessValueControl = document.querySelector<HTMLInputElement>('#grid-thickness-value-control');
const gridThicknessMaxControl = document.querySelector<HTMLInputElement>('#grid-thickness-max-control');
const gridVisibilityControl = document.querySelector<HTMLInputElement>('#grid-visibility-control');
const focusControl = document.querySelector<HTMLSelectElement>('#focus-control');
const hud = document.querySelector<HTMLElement>('.hud');
const hudBody = document.querySelector<HTMLElement>('#hud-body');
const hudToggle = document.querySelector<HTMLButtonElement>('#hud-toggle');
const simulationTimeLabel = document.querySelector<HTMLTimeElement>('#simulation-time');
const bodyLocationList = document.querySelector<HTMLDivElement>('#body-location-list');
const timeScaleLabel = document.querySelector<HTMLSpanElement>('#time-scale');
const earthFluxLabel = document.querySelector<HTMLSpanElement>('#earth-flux');
const moonPhaseLabel = document.querySelector<HTMLSpanElement>('#moon-phase');
const illuminationLabel = document.querySelector<HTMLSpanElement>('#illumination-label');
const gridThicknessLabel = document.querySelector<HTMLSpanElement>('#grid-thickness-label');
const focusLabel = document.querySelector<HTMLSpanElement>('#focus-label');
if (
  !speedControl ||
  !speedMinControl ||
  !speedValueControl ||
  !speedMaxControl ||
  !illuminationControl ||
  !illuminationMinControl ||
  !illuminationValueControl ||
  !illuminationMaxControl ||
  !orbitPathControl ||
  !gridColorControl ||
  !gridThicknessControl ||
  !gridThicknessMinControl ||
  !gridThicknessValueControl ||
  !gridThicknessMaxControl ||
  !gridVisibilityControl ||
  !focusControl ||
  !hud ||
  !hudBody ||
  !hudToggle ||
  !simulationTimeLabel ||
  !bodyLocationList ||
  !timeScaleLabel ||
  !earthFluxLabel ||
  !moonPhaseLabel ||
  !illuminationLabel ||
  !gridThicknessLabel ||
  !focusLabel
) {
  throw new Error('Missing simulation control elements');
}
const simulationTimeOutput = simulationTimeLabel;
const bodyLocationOutput = bodyLocationList;
let simulatedDays = getDaysSinceJ2000(new Date());
let daysPerSecond = DEFAULT_DAYS_PER_SECOND;
let focusName = 'Sun';
let elapsedSeconds = 0;
let lastIlluminationUpdate = -Infinity;
let lastTelemetryUpdate = -Infinity;
let cachedEarthSolarFlux = 1;

focusControl.innerHTML = focusOptions
  .map((name) => `<option value="${name}">${name}</option>`)
  .join('');

sun.update(simulatedDays);
solarSystem.update(simulatedDays);
solarSystem.rebuildTrajectoryPath(simulatedDays);
updateTelemetry();

bindEditableSlider({
  range: speedControl,
  minInput: speedMinControl,
  valueInput: speedValueControl,
  maxInput: speedMaxControl,
  minGap: 1,
  fallbackMin: 1,
  fallbackMax: 90,
  onValueChange: (value) => {
    daysPerSecond = value;
    timeScaleLabel.textContent = Math.round(value).toString();
  },
});

bindEditableSlider({
  range: illuminationControl,
  minInput: illuminationMinControl,
  valueInput: illuminationValueControl,
  maxInput: illuminationMaxControl,
  minGap: 0.1,
  fallbackMin: 0.2,
  fallbackMax: 50,
  onValueChange: (value) => {
    illuminationEngine.setMultiplier(value);
    illuminationLabel.textContent = value.toFixed(1);
    lastIlluminationUpdate = -Infinity;
  },
});

orbitPathControl.addEventListener('change', () => {
  setOrbitPathsVisible(orbitPathControl.checked);
});

gridColorControl.addEventListener('input', () => {
  lattice.setColor(gridColorControl.value);
});

bindEditableSlider({
  range: gridThicknessControl,
  minInput: gridThicknessMinControl,
  valueInput: gridThicknessValueControl,
  maxInput: gridThicknessMaxControl,
  minGap: 0.05,
  fallbackMin: 0.25,
  fallbackMax: 10,
  onValueChange: (value) => {
    lattice.setLineThickness(value);
    gridThicknessLabel.textContent = value.toFixed(1);
  },
});

gridVisibilityControl.addEventListener('change', () => {
  lattice.group.visible = gridVisibilityControl.checked;
});

hudToggle.addEventListener('click', () => {
  const collapsed = hud.classList.toggle('is-collapsed');
  hudBody.setAttribute('aria-hidden', String(collapsed));
  hudToggle.setAttribute('aria-expanded', String(!collapsed));
  hudToggle.textContent = collapsed ? 'Controls' : 'Hide';
});

focusControl.addEventListener('change', () => {
  const previousFocus = getFocusPosition(focusName);
  const nextFocusName = focusControl.value;
  const nextFocus = getFocusPosition(nextFocusName);
  const cameraOffset = camera.position.clone().sub(previousFocus);

  focusName = nextFocusName;
  focusLabel.textContent = focusName;
  camera.position.copy(nextFocus).add(cameraOffset);
  controls.target.copy(nextFocus);
});

window.addEventListener('resize', resizeRenderer);

renderer.setAnimationLoop((timestamp: number) => {
  timer.update(timestamp);
  const deltaSeconds = Math.min(timer.getDelta(), 0.05);
  elapsedSeconds += deltaSeconds;
  simulatedDays += deltaSeconds * daysPerSecond;

  sun.update(simulatedDays);
  solarSystem.update(simulatedDays);
  solarLight.position.copy(sun.position);

  if (elapsedSeconds - lastIlluminationUpdate > 0.1) {
    const illumination = illuminationEngine.update();
    const moonState = getEarthMoonState(simulatedDays);
    cachedEarthSolarFlux = illumination.get('Earth') ?? cachedEarthSolarFlux;
    earthFluxLabel.textContent = Math.round(cachedEarthSolarFlux * 100).toString();
    moonPhaseLabel.textContent = `${moonState.phaseName} ${Math.round(
      moonState.illuminatedFraction * 100,
    )}%`;
    lastIlluminationUpdate = elapsedSeconds;
  }

  if (elapsedSeconds - lastTelemetryUpdate > 0.25) {
    updateTelemetry();
    lastTelemetryUpdate = elapsedSeconds;
  }

  const focusPosition = getFocusPosition(focusName);

  starField.rotation.y += deltaSeconds * 0.006;
  controls.target.copy(focusPosition);
  lattice.fitToCamera(camera, sun.position);
  lattice.update([
    {
      position: sun.position,
      gravitationalRadiusScale: getDisplayGravitationalRadius(BODIES.sun.massRatioToSun),
      radius: BODIES.sun.radius,
      softening: getMetricSoftening(BODIES.sun.radius),
      maxContraction: getMetricMaxContraction(BODIES.sun.massRatioToSun),
    },
    ...solarSystem.getMassSources(),
  ], elapsedSeconds);

  controls.update();
  renderer.render(scene, camera);
});

function getFocusPosition(name: string): THREE.Vector3 {
  if (name === 'Sun') {
    return sun.position.clone();
  }

  return solarSystem.findPlanet(name).position.clone();
}

function resizeRenderer(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setOrbitPathsVisible(visible: boolean): void {
  solarSystem.group.traverse((object) => {
    if (object.userData.isOrbitPath === true) {
      object.visible = visible;
    }
  });
}

interface EditableSliderOptions {
  range: HTMLInputElement;
  minInput: HTMLInputElement;
  valueInput: HTMLInputElement;
  maxInput: HTMLInputElement;
  minGap: number;
  fallbackMin: number;
  fallbackMax: number;
  onValueChange(value: number): void;
}

function bindEditableSlider({
  range,
  minInput,
  valueInput,
  maxInput,
  minGap,
  fallbackMin,
  fallbackMax,
  onValueChange,
}: EditableSliderOptions): void {
  const sanitizeBounds = (): { min: number; max: number } => {
    let min = Number(minInput.value);
    let max = Number(maxInput.value);

    if (!Number.isFinite(min)) min = fallbackMin;
    if (!Number.isFinite(max)) max = fallbackMax;
    if (max <= min) max = min + minGap;

    minInput.value = formatControlNumber(min);
    maxInput.value = formatControlNumber(max);
    range.min = min.toString();
    range.max = max.toString();

    return { min, max };
  };

  const setValue = (nextValue: number): void => {
    const { min, max } = sanitizeBounds();
    const value = THREE.MathUtils.clamp(
      Number.isFinite(nextValue) ? nextValue : Number(range.value),
      min,
      max,
    );

    range.value = value.toString();
    valueInput.value = formatControlNumber(value);
    onValueChange(value);
  };

  range.addEventListener('input', () => {
    setValue(Number(range.value));
  });

  valueInput.addEventListener('change', () => {
    setValue(Number(valueInput.value));
  });

  minInput.addEventListener('change', () => {
    setValue(Number(valueInput.value));
  });

  maxInput.addEventListener('change', () => {
    setValue(Number(valueInput.value));
  });

  setValue(Number(range.value));
}

function updateTelemetry(): void {
  const simulationDate = getDateFromDaysSinceJ2000(simulatedDays);
  simulationTimeOutput.dateTime = simulationDate.toISOString();
  simulationTimeOutput.textContent = formatSimulationDate(simulationDate);

  bodyLocationOutput.innerHTML = getBodyLocations()
    .map(
      ({ name, position }) => `
        <div class="location-row">
          <span>${name}</span>
          <span>${formatAu(position.x)}</span>
          <span>${formatAu(position.y)}</span>
          <span>${formatAu(position.z)}</span>
        </div>
      `,
    )
    .join('');
}

function getBodyLocations(): Array<{ name: string; position: THREE.Vector3 }> {
  return [
    { name: 'Sun', position: scenePositionToAu(sun.position) },
    ...solarSystem.getPlanetNames().map((name) => ({
      name,
      position: scenePositionToAu(solarSystem.findPlanet(name).position),
    })),
  ];
}

function scenePositionToAu(position: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    position.x / BODIES.earth.orbitRadius,
    position.z / BODIES.earth.orbitRadius,
    position.y / BODIES.earth.orbitRadius,
  );
}

function formatSimulationDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function formatAu(value: number): string {
  return Math.abs(value) < 0.0005 ? '0.000' : value.toFixed(3);
}

function formatControlNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : Number(value.toFixed(3)).toString();
}

function createStarField(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const starCount = 1300;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    const radius = THREE.MathUtils.randFloat(420, 1000);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xd7ecff,
      size: 0.05,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
}
