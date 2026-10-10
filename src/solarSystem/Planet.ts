import * as THREE from 'three';
import { CelestialBody, CelestialComposite } from './CelestialBody';
import {
  getPlanetHeliocentricPathAu,
  getPlanetHeliocentricPositionAu,
  type PlanetEphemerisKey,
} from './Ephemeris';
import { markReceivesSunlight } from './IlluminationEngine';
import type { MoonContract } from './MoonInterface';
import { AU } from './constants';

const FULL_TURN = Math.PI * 2;
const DEFAULT_PATH_SEGMENTS = 384;

interface PlanetOptions {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriodDays: number;
  rotationPeriodDays: number;
  axialTilt?: number;
  initialAngle?: number;
  ephemerisKey?: PlanetEphemerisKey;
  pathColor?: THREE.ColorRepresentation;
  material: THREE.MeshStandardMaterial;
  receivesSunlight?: boolean;
}

export class Planet extends CelestialBody {
  orbitRadius: number;
  orbitalPeriodDays: number;
  rotationPeriodDays: number;
  initialAngle: number;
  ephemerisKey?: PlanetEphemerisKey;
  pathColor: THREE.ColorRepresentation;
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
    ephemerisKey,
    pathColor = 0x4d7895,
    material,
    receivesSunlight = false,
  }: PlanetOptions) {
    super(name, radius);
    this.orbitRadius = orbitRadius;
    this.orbitalPeriodDays = orbitalPeriodDays;
    this.rotationPeriodDays = rotationPeriodDays;
    this.initialAngle = initialAngle;
    this.ephemerisKey = ephemerisKey;
    this.pathColor = pathColor;
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
    if (this.ephemerisKey) {
      const positionAu = getPlanetHeliocentricPositionAu(this.ephemerisKey, simulatedDays);
      this.orbitPivot.rotation.y = 0;
      this.orbitOffset.position.set(positionAu.x * AU, positionAu.z * AU, positionAu.y * AU);
    } else if (this.orbitalPeriodDays > 0) {
      this.orbitPivot.rotation.y =
        this.initialAngle + (simulatedDays / this.orbitalPeriodDays) * FULL_TURN;
    }

    if (this.rotationPeriodDays !== 0) {
      this.mesh.rotation.y = (simulatedDays / this.rotationPeriodDays) * FULL_TURN;
    }

    this.moonSystem.update(simulatedDays);
    this.mesh.getWorldPosition(this.position);
  }

  rebuildTrajectoryPath(simulatedDays: number): void {
    const points = this.ephemerisKey
      ? this.sampleEphemerisPath(simulatedDays)
      : this.sampleCircularPath();

    this.setTrajectoryPath(points, this.pathColor, 0.34);
    this.moonSystem.rebuildTrajectoryPath(simulatedDays);
  }

  updateSunlight(_sunPosition: THREE.Vector3, _referenceDistance: number): number {
    return 1;
  }

  private sampleEphemerisPath(simulatedDays: number): THREE.Vector3[] {
    if (!this.ephemerisKey || this.orbitalPeriodDays <= 0) return this.sampleCircularPath();

    return getPlanetHeliocentricPathAu(this.ephemerisKey, simulatedDays, DEFAULT_PATH_SEGMENTS).map(
      (positionAu) => new THREE.Vector3(positionAu.x * AU, positionAu.z * AU, positionAu.y * AU),
    );
  }

  private sampleCircularPath(): THREE.Vector3[] {
    return Array.from({ length: DEFAULT_PATH_SEGMENTS }, (_, index) => {
      const angle = this.initialAngle + (index / DEFAULT_PATH_SEGMENTS) * FULL_TURN;
      return new THREE.Vector3(
        Math.cos(angle) * this.orbitRadius,
        0,
        Math.sin(angle) * this.orbitRadius,
      );
    });
  }
}
