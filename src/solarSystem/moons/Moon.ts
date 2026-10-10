import * as THREE from 'three';
import { CelestialBody } from '../CelestialBody';
import { markReceivesSunlight } from '../IlluminationEngine';
import type { MoonContract } from '../MoonInterface';
import type { MassSource } from '../PlanetInterface';

const FULL_TURN = Math.PI * 2;

export interface MoonOptions {
  name: string;
  parentName: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriodDays: number;
  color: THREE.ColorRepresentation;
  initialAngle?: number;
  compactness?: number;
}

export class Moon extends CelestialBody implements MoonContract {
  parentName: string;
  private readonly orbitalPeriodDays: number;
  private readonly initialAngle: number;
  private readonly compactness: number;
  private readonly orbitPivot = new THREE.Group();
  private readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;

  constructor({
    name,
    parentName,
    radius,
    orbitRadius,
    orbitalPeriodDays,
    color,
    initialAngle = 0,
    compactness = 0.04,
  }: MoonOptions) {
    super(name, radius);
    this.parentName = parentName;
    this.orbitalPeriodDays = orbitalPeriodDays;
    this.initialAngle = initialAngle;
    this.compactness = compactness;

    this.group.add(this.orbitPivot);
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 24),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.82,
        emissive: 0x000000,
        emissiveIntensity: 0.025,
      }),
    );
    this.mesh.position.x = orbitRadius;
    this.mesh.name = name;
    markReceivesSunlight(this.mesh, name, this.mesh.material);
    this.orbitPivot.add(this.mesh);
    this.group.add(createMoonOrbitRing(orbitRadius));
    this.update(0);
  }

  update(simulatedDays: number): void {
    this.orbitPivot.rotation.y =
      this.initialAngle + (simulatedDays / this.orbitalPeriodDays) * FULL_TURN;
    this.mesh.rotation.y = this.orbitPivot.rotation.y;
    this.mesh.getWorldPosition(this.position);
  }

  getMassSources(): MassSource[] {
    return [
      {
        position: this.position,
        compactness: this.compactness,
        radius: this.radius,
        softening: Math.max(this.radius * 1.4, 0.12),
        maxContraction: 0.04,
        flow: 0.02,
      },
    ];
  }
}

function createMoonOrbitRing(radius: number): THREE.LineLoop {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
  const points = curve.getPoints(120).map((point) => new THREE.Vector3(point.x, 0, point.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xaeb8c5,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });

  const orbitRing = new THREE.LineLoop(geometry, material);
  orbitRing.name = 'Moon orbit path';
  orbitRing.userData.isOrbitPath = true;
  return orbitRing;
}
