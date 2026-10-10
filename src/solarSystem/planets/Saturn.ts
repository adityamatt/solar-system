import * as THREE from 'three';
import { BODIES } from '../constants';
import { markReceivesSunlight } from '../IlluminationEngine';
import { MinorMoonSwarm } from '../moons/MinorMoonSwarm';
import { Moon } from '../moons/Moon';
import { SolarPlanet } from './SolarPlanet';

export class Saturn extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.saturn,
      color: 0xd8c08a,
      secondaryColor: 0x9d8152,
      orbitColor: 0xd6bd86,
    });

    this.axis.add(createRings(BODIES.saturn.radius));
    this.addMoon(
      new Moon({
        name: 'Mimas',
        parentName: 'Saturn',
        radius: 0.08,
        orbitRadius: 4.4,
        orbitalPeriodDays: 0.942,
        color: 0xbeb7aa,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Enceladus',
        parentName: 'Saturn',
        radius: 0.11,
        orbitRadius: 5.3,
        orbitalPeriodDays: 1.37,
        color: 0xe4e8e6,
        initialAngle: 0.5,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Tethys',
        parentName: 'Saturn',
        radius: 0.13,
        orbitRadius: 6.2,
        orbitalPeriodDays: 1.888,
        color: 0xc9c3b8,
        initialAngle: 1.1,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Dione',
        parentName: 'Saturn',
        radius: 0.14,
        orbitRadius: 7.25,
        orbitalPeriodDays: 2.737,
        color: 0xc7c2b7,
        initialAngle: 1.8,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Rhea',
        parentName: 'Saturn',
        radius: 0.18,
        orbitRadius: 8.5,
        orbitalPeriodDays: 4.518,
        color: 0xbfb8aa,
        initialAngle: 2.6,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Titan',
        parentName: 'Saturn',
        radius: 0.29,
        orbitRadius: 10.5,
        orbitalPeriodDays: 15.945,
        color: 0xd29b4b,
        initialAngle: 3.25,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Iapetus',
        parentName: 'Saturn',
        radius: 0.18,
        orbitRadius: 13.4,
        orbitalPeriodDays: 79.33,
        color: 0x9a8b78,
        initialAngle: 4.3,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Phoebe',
        parentName: 'Saturn',
        radius: 0.065,
        orbitRadius: 17,
        orbitalPeriodDays: 550.5,
        color: 0x6d665f,
        initialAngle: 5.1,
      }),
    );
    this.addMoon(
      new MinorMoonSwarm({
        parentName: 'Saturn',
        count: 285,
        innerRadius: 18.5,
        outerRadius: 34,
        color: 0xc9b894,
        seed: 606,
      }),
    );
  }
}

function createRings(planetRadius: number): THREE.Mesh<THREE.RingGeometry, THREE.MeshStandardMaterial> {
  const geometry = new THREE.RingGeometry(planetRadius * 1.35, planetRadius * 2.35, 160);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const color = new Float32Array(position.count * 3);
  const inner = planetRadius * 1.35;
  const outer = planetRadius * 2.35;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const radius = Math.sqrt(x * x + y * y);
    const ringBand = (radius - inner) / (outer - inner);
    uv.setXY(i, ringBand, 0.5);

    const shade = 0.55 + 0.35 * Math.sin(ringBand * Math.PI * 7);
    color[i * 3] = shade;
    color[i * 3 + 1] = shade * 0.86;
    color[i * 3 + 2] = shade * 0.58;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    roughness: 0.8,
    emissive: 0x000000,
    emissiveIntensity: 0.01,
  });
  const rings = new THREE.Mesh(geometry, material);
  rings.name = 'Saturn rings';
  markReceivesSunlight(rings, 'Saturn rings', material);
  rings.rotation.x = THREE.MathUtils.degToRad(90);
  return rings;
}
