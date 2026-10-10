import * as THREE from 'three';
import { CelestialBody } from '../CelestialBody';
import { markReceivesSunlight } from '../IlluminationEngine';
import { getEarthMoonState } from '../LunarEphemeris';
import type { MoonContract } from '../MoonInterface';
import type { MassSource } from '../PlanetInterface';
import {
  MASS_RATIO_TO_SUN,
  getDisplayGravitationalRadius,
  getMetricMaxContraction,
  getMetricSoftening,
} from '../constants';

const FULL_TURN = Math.PI * 2;
const MOON_PATH_SEGMENTS = 180;

export interface MoonOptions {
  name: string;
  parentName: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriodDays: number;
  color: THREE.ColorRepresentation;
  initialAngle?: number;
  massRatioToSun?: number;
  useEarthMoonEphemeris?: boolean;
}

export class Moon extends CelestialBody implements MoonContract {
  parentName: string;
  private readonly orbitalPeriodDays: number;
  private readonly initialAngle: number;
  private readonly orbitRadius: number;
  private readonly gravitationalRadiusScale: number;
  private readonly massRatioToSun: number;
  private readonly useEarthMoonEphemeris: boolean;
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
    massRatioToSun = MASS_RATIO_TO_SUN.moon,
    useEarthMoonEphemeris = false,
  }: MoonOptions) {
    super(name, radius);
    this.parentName = parentName;
    this.orbitalPeriodDays = orbitalPeriodDays;
    this.initialAngle = initialAngle;
    this.orbitRadius = orbitRadius;
    this.gravitationalRadiusScale = getDisplayGravitationalRadius(massRatioToSun);
    this.massRatioToSun = massRatioToSun;
    this.useEarthMoonEphemeris = useEarthMoonEphemeris;

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
    this.update(0);
  }

  update(simulatedDays: number): void {
    if (this.useEarthMoonEphemeris) {
      const lunarState = getEarthMoonState(simulatedDays);
      this.orbitPivot.rotation.y = 0;
      this.mesh.position.set(
        lunarState.positionAu.x * this.orbitRadius,
        lunarState.positionAu.y * this.orbitRadius,
        lunarState.positionAu.z * this.orbitRadius,
      );
      this.mesh.userData.phaseAngleDegrees = lunarState.phaseAngleDegrees;
      this.mesh.userData.illuminatedFraction = lunarState.illuminatedFraction;
    } else {
      this.orbitPivot.rotation.y =
        this.initialAngle + (simulatedDays / this.orbitalPeriodDays) * FULL_TURN;
    }

    this.mesh.rotation.y = this.orbitPivot.rotation.y;
    this.mesh.getWorldPosition(this.position);
  }

  getMassSources(): MassSource[] {
    return [
      {
        position: this.position,
        gravitationalRadiusScale: this.gravitationalRadiusScale,
        radius: this.radius,
        softening: getMetricSoftening(this.radius),
        maxContraction: getMetricMaxContraction(this.massRatioToSun),
      },
    ];
  }

  rebuildTrajectoryPath(simulatedDays: number): void {
    const points = this.useEarthMoonEphemeris
      ? this.sampleEarthMoonPath(simulatedDays)
      : this.sampleCircularPath();

    this.setTrajectoryPath(points, 0xaeb8c5, 0.18);
  }

  private sampleEarthMoonPath(simulatedDays: number): THREE.Vector3[] {
    const startDays = simulatedDays - this.orbitalPeriodDays * 0.5;
    return Array.from({ length: MOON_PATH_SEGMENTS }, (_, index) => {
      const days = startDays + (index / MOON_PATH_SEGMENTS) * this.orbitalPeriodDays;
      const lunarState = getEarthMoonState(days);
      return new THREE.Vector3(
        lunarState.positionAu.x * this.orbitRadius,
        lunarState.positionAu.y * this.orbitRadius,
        lunarState.positionAu.z * this.orbitRadius,
      );
    });
  }

  private sampleCircularPath(): THREE.Vector3[] {
    return Array.from({ length: MOON_PATH_SEGMENTS }, (_, index) => {
      const angle = this.initialAngle + (index / MOON_PATH_SEGMENTS) * FULL_TURN;
      return new THREE.Vector3(
        Math.cos(angle) * this.orbitRadius,
        0,
        Math.sin(angle) * this.orbitRadius,
      );
    });
  }
}
