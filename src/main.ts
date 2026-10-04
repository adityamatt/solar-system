import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createCoordinateFrame } from './solarSystem/CoordinateFrame';
import { Planet } from './solarSystem/Planet';
import { assertPlanetInterface } from './solarSystem/PlanetInterface';
import { SpacetimeLattice } from './solarSystem/SpacetimeLattice';
import { BODIES, DEFAULT_DAYS_PER_SECOND } from './solarSystem/constants';
import { Earth } from './solarSystem/planets/Earth';

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
        <h1>Mass changes the metric: space contracts around Sun and Earth</h1>
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
      </dl>
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
scene.fog = new THREE.Fog(0x02040a, 35, 95);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(0, 13, 29);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 9;
controls.maxDistance = 150;
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
  maxSize: 210,
  targetCellSize: 3.8,
  color: 0x63d4ff,
  opacity: 0.2,
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

const sunGlow = createSunGlow(BODIES.sun.radius);
sun.group.add(sunGlow);

const sunMarker = createSunMarker();
sun.group.add(sunMarker);

const earth = assertPlanetInterface(new Earth(), 'Earth');
scene.add(earth.group);

const timer = new THREE.Timer();
timer.connect(document);
const speedControl = document.querySelector<HTMLInputElement>('#speed-control');
const timeScaleLabel = document.querySelector<HTMLSpanElement>('#time-scale');
const earthFluxLabel = document.querySelector<HTMLSpanElement>('#earth-flux');
if (!speedControl || !timeScaleLabel || !earthFluxLabel) {
  throw new Error('Missing simulation control elements');
}
let simulatedDays = 0;
let daysPerSecond = DEFAULT_DAYS_PER_SECOND;

speedControl.addEventListener('input', (event: Event) => {
  const target = event.target as HTMLInputElement;
  daysPerSecond = Number(target.value);
  timeScaleLabel.textContent = daysPerSecond.toString();
});

window.addEventListener('resize', resizeRenderer);

renderer.setAnimationLoop((timestamp: number) => {
  timer.update(timestamp);
  const deltaSeconds = Math.min(timer.getDelta(), 0.05);
  simulatedDays += deltaSeconds * daysPerSecond;

  sun.update(simulatedDays);
  earth.update(simulatedDays);
  const earthSolarFlux = earth.updateIllumination(sun.position);
  earthFluxLabel.textContent = Math.round(earthSolarFlux * 100).toString();

  starField.rotation.y += deltaSeconds * 0.006;
  updateSunReadability(camera, sun, sunGlow, sunMarker);
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
    earth.getMassSource(),
  ], timer.getElapsed());

  controls.update();
  renderer.render(scene, camera);
});

function resizeRenderer(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createStarField(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const starCount = 1300;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    const radius = THREE.MathUtils.randFloat(48, 105);
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

function createSunGlow(radius: number): THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> {
  const geometry = new THREE.SphereGeometry(radius * 1.45, 48, 48);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff9d42,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });

  return new THREE.Mesh(geometry, material);
}

function createSunMarker(): THREE.Sprite {
  const size = 128;
  const markerCanvas = document.createElement('canvas');
  markerCanvas.width = size;
  markerCanvas.height = size;
  const ctx = markerCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create 2D context for Sun marker');
  }
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 58);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.24, 'rgba(255, 232, 128, 0.95)');
  gradient.addColorStop(0.58, 'rgba(255, 151, 52, 0.34)');
  gradient.addColorStop(1, 'rgba(255, 151, 52, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(markerCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const marker = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    }),
  );
  marker.name = 'Sun distant visibility marker';
  return marker;
}

function updateSunReadability(
  camera: THREE.PerspectiveCamera,
  sunBody: Planet,
  glow: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>,
  marker: THREE.Sprite,
): void {
  sunBody.mesh.material.opacity = 1;
  sunBody.mesh.material.transparent = false;

  const distance = camera.position.distanceTo(sunBody.position);
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
  const worldUnitsPerPixel = visibleHeight / window.innerHeight;
  const sunDiameterPixels = (sunBody.radius * 2) / worldUnitsPerPixel;
  const markerSize = THREE.MathUtils.clamp(worldUnitsPerPixel * 22, 0.9, 4.8);
  const markerOpacity = THREE.MathUtils.smoothstep(18 - sunDiameterPixels, 0, 18) * 0.85;

  marker.scale.setScalar(markerSize);
  marker.material.opacity = markerOpacity;

  glow.material.opacity = THREE.MathUtils.lerp(
    0.1,
    0.24,
    THREE.MathUtils.smoothstep(distance, 18, 110),
  );
}
