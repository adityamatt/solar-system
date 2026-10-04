import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createCoordinateFrame } from './solarSystem/CoordinateFrame';
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
    </section>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#solar-canvas');
if (!canvas) {
  throw new Error('Missing #solar-canvas element');
}
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
  size: 38,
  divisions: 10,
  samples: 90,
  maxSize: 900,
  targetCellSize: 8,
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

const focusOptions = ['Sun', ...solarSystem.getPlanetNames()];

const timer = new THREE.Timer();
timer.connect(document);
const speedControl = document.querySelector<HTMLInputElement>('#speed-control');
const focusControl = document.querySelector<HTMLSelectElement>('#focus-control');
const timeScaleLabel = document.querySelector<HTMLSpanElement>('#time-scale');
const earthFluxLabel = document.querySelector<HTMLSpanElement>('#earth-flux');
const focusLabel = document.querySelector<HTMLSpanElement>('#focus-label');
if (!speedControl || !focusControl || !timeScaleLabel || !earthFluxLabel || !focusLabel) {
  throw new Error('Missing simulation control elements');
}
let simulatedDays = 0;
let daysPerSecond = DEFAULT_DAYS_PER_SECOND;
let focusName = 'Sun';

focusControl.innerHTML = focusOptions
  .map((name) => `<option value="${name}">${name}</option>`)
  .join('');

speedControl.addEventListener('input', (event: Event) => {
  const target = event.target as HTMLInputElement;
  daysPerSecond = Number(target.value);
  timeScaleLabel.textContent = daysPerSecond.toString();
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
  simulatedDays += deltaSeconds * daysPerSecond;

  sun.update(simulatedDays);
  solarSystem.update(simulatedDays);
  const illumination = solarSystem.updateIllumination(sun.position);
  const earthSolarFlux = illumination.get('Earth') ?? 1;
  earthFluxLabel.textContent = Math.round(earthSolarFlux * 100).toString();
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
  ], timer.getElapsed());

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
