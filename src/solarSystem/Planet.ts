import * as THREE from 'three';
import { CelestialBody, CelestialComposite } from './CelestialBody';
import { markReceivesSunlight } from './IlluminationEngine';
import type { MoonContract } from './MoonInterface';

const FULL_TURN = Math.PI * 2;

interface PlanetOptions {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriodDays: number;
  rotationPeriodDays: number;
  axialTilt?: number;
  initialAngle?: number;
  material: THREE.MeshStandardMaterial;
  receivesSunlight?: boolean;
}

export class Planet extends CelestialBody {
  orbitRadius: number;
  orbitalPeriodDays: number;
  rotationPeriodDays: number;
  initialAngle: number;
  receivesSunlight: boolean;
  orbitPivot: THREE.Group;
  orbitOffset: THREE.Group;
  axis: THREE.Group;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  protected readonly moonSystem: CelestialComposite;

  constructor({
    name,
    radius,
    orbitRadius,
    orbitalPeriodDays,
    rotationPeriodDays,
    axialTilt = 0,
    initialAngle = 0,
    material,
    receivesSunlight = false,
  }: PlanetOptions) {
    super(name, radius);
    this.orbitRadius = orbitRadius;
    this.orbitalPeriodDays = orbitalPeriodDays;
    this.rotationPeriodDays = rotationPeriodDays;
    this.initialAngle = initialAngle;
    this.receivesSunlight = receivesSunlight;

    this.group.name = `${name} system`;

    this.orbitPivot = new THREE.Group();
    this.group.add(this.orbitPivot);

    this.orbitOffset = new THREE.Group();
    this.orbitOffset.position.x = orbitRadius;
    this.orbitPivot.add(this.orbitOffset);

    this.axis = new THREE.Group();
    this.axis.rotation.z = THREE.MathUtils.degToRad(axialTilt);
    this.orbitOffset.add(this.axis);

    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = name;
    this.mesh.userData.baseEmissive = material.emissive.clone();
    if (receivesSunlight) {
      markReceivesSunlight(this.mesh, name, material);
    }
    this.axis.add(this.mesh);

    this.moonSystem = new CelestialComposite(`${name} moons`);
    this.orbitOffset.add(this.moonSystem.group);
    this.update(0);
  }

  addMoon(moon: MoonContract): void {
    this.moonSystem.add(moon);
  }

  update(simulatedDays: number): void {
    if (this.orbitalPeriodDays > 0) {
      this.orbitPivot.rotation.y =
        this.initialAngle + (simulatedDays / this.orbitalPeriodDays) * FULL_TURN;
    }

    if (this.rotationPeriodDays > 0) {
      this.mesh.rotation.y = (simulatedDays / this.rotationPeriodDays) * FULL_TURN;
    }

    this.moonSystem.update(simulatedDays);
    this.mesh.getWorldPosition(this.position);
  }

  updateSunlight(_sunPosition: THREE.Vector3, _referenceDistance: number): number {
    return 1;
  }
}
