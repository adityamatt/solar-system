import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createCoordinateFrame } from './solarSystem/CoordinateFrame';
import { IlluminationEngine } from './solarSystem/IlluminationEngine';
import { Planet } from './solarSystem/Planet';
import { createSolarSystemComposite } from './solarSystem/SolarSystemComposite';
import { SpacetimeLattice } from './solarSystem/SpacetimeLattice';
import { BODIES, DEFAULT_DAYS_PER_SECOND } from './solarSystem/constants';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root element');
}

app.innerHTML = `
  <main class="simulation-shell">
    <canvas id="solar-canvas" aria-label="General relativity inspired solar system animation"></canvas>
    <section class="hud" aria-label="Simulation controls">
      <div>
        <p class="eyebrow">Solar System / GR sketch</p>
        <h1>Mass changes the metric: space contracts around the solar system</h1>
      </div>
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
          <dt>Illumination</dt>
          <dd><span id="illumination-label">1.0</span>x curve</dd>
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
      <label class="control-row" for="speed-control">
        <span>Speed</span>
        <input id="speed-control" type="range" min="1" max="90" value="${DEFAULT_DAYS_PER_SECOND}" />
      </label>
      <label class="control-row" for="illumination-control">
        <span>Light</span>
        <input id="illumination-control" type="range" min="0.2" max="50" step="0.2" value="1" />
      </label>
      <label class="toggle-row" for="orbit-path-control">
        <span>Paths</span>
        <input id="orbit-path-control" type="checkbox" checked />
      </label>
      <label class="color-row" for="grid-color-control">
        <span>Grid</span>
        <input id="grid-color-control" type="color" value="#63d4ff" />
      </label>
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
const illuminationControl = document.querySelector<HTMLInputElement>('#illumination-control');
const orbitPathControl = document.querySelector<HTMLInputElement>('#orbit-path-control');
const gridColorControl = document.querySelector<HTMLInputElement>('#grid-color-control');
const focusControl = document.querySelector<HTMLSelectElement>('#focus-control');
const timeScaleLabel = document.querySelector<HTMLSpanElement>('#time-scale');
const earthFluxLabel = document.querySelector<HTMLSpanElement>('#earth-flux');
const illuminationLabel = document.querySelector<HTMLSpanElement>('#illumination-label');
const focusLabel = document.querySelector<HTMLSpanElement>('#focus-label');
if (
  !speedControl ||
  !illuminationControl ||
  !orbitPathControl ||
  !gridColorControl ||
  !focusControl ||
  !timeScaleLabel ||
  !earthFluxLabel ||
  !illuminationLabel ||
  !focusLabel
) {
  throw new Error('Missing simulation control elements');
}
let simulatedDays = 0;
let daysPerSecond = DEFAULT_DAYS_PER_SECOND;
let focusName = 'Sun';
let elapsedSeconds = 0;
let lastIlluminationUpdate = -Infinity;
let cachedEarthSolarFlux = 1;

focusControl.innerHTML = focusOptions
  .map((name) => `<option value="${name}">${name}</option>`)
  .join('');

speedControl.addEventListener('input', (event: Event) => {
  const target = event.target as HTMLInputElement;
  daysPerSecond = Number(target.value);
  timeScaleLabel.textContent = daysPerSecond.toString();
});

illuminationControl.addEventListener('input', (event: Event) => {
  const target = event.target as HTMLInputElement;
  const multiplier = Number(target.value);
  illuminationEngine.setMultiplier(multiplier);
  illuminationLabel.textContent = multiplier.toFixed(1);
  lastIlluminationUpdate = -Infinity;
});

orbitPathControl.addEventListener('change', () => {
  setOrbitPathsVisible(orbitPathControl.checked);
});

gridColorControl.addEventListener('input', () => {
  lattice.setColor(gridColorControl.value);
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
    cachedEarthSolarFlux = illumination.get('Earth') ?? cachedEarthSolarFlux;
    earthFluxLabel.textContent = Math.round(cachedEarthSolarFlux * 100).toString();
    lastIlluminationUpdate = elapsedSeconds;
  }

  const focusPosition = getFocusPosition(focusName);

  starField.rotation.y += deltaSeconds * 0.006;
  controls.target.copy(focusPosition);
  lattice.fitToCamera(camera, sun.position);
  lattice.update([
    {
      position: sun.position,
      compactness: 7.5,
      radius: BODIES.sun.radius,
      softening: 2.8,
      maxContraction: 0.46,
      flow: 0.03,
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
