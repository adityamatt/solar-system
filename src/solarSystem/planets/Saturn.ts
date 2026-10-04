import * as THREE from 'three';
import { BODIES } from '../constants';
import { SolarPlanet } from './SolarPlanet';

export class Saturn extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.saturn,
      color: 0xd8c08a,
      secondaryColor: 0x9d8152,
      orbitColor: 0xd6bd86,
      compactness: 1.45,
      maxContraction: 0.2,
      flow: 0.035,
    });

    this.axis.add(createRings(BODIES.saturn.radius));
  }
}

function createRings(planetRadius: number): THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> {
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

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const rings = new THREE.Mesh(geometry, material);
  rings.name = 'Saturn rings';
  rings.rotation.x = THREE.MathUtils.degToRad(90);
  return rings;
}
