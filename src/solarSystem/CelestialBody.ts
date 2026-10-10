import * as THREE from 'three';
import type { MassSource } from './PlanetInterface';
import { createTrajectoryLine, replaceTrajectoryPath } from './TrajectoryPath';

export interface CelestialBodyContract {
  name: string;
  group: THREE.Group;
  position: THREE.Vector3;
  radius: number;
  update(simulatedDays: number): void;
  getMassSources(): MassSource[];
  rebuildTrajectoryPath(simulatedDays: number): void;
}

export abstract class CelestialBody implements CelestialBodyContract {
  name: string;
  radius: number;
  group: THREE.Group;
  position = new THREE.Vector3();
  protected trajectoryPath: THREE.Object3D | null = null;

  protected constructor(name: string, radius: number) {
    this.name = name;
    this.radius = radius;
    this.group = new THREE.Group();
    this.group.name = name;
  }

  abstract update(simulatedDays: number): void;

  getMassSources(): MassSource[] {
    return [];
  }

  rebuildTrajectoryPath(_simulatedDays: number): void {}

  protected setTrajectoryPath(
    points: THREE.Vector3[],
    color: THREE.ColorRepresentation,
    opacity: number,
  ): void {
    this.trajectoryPath = replaceTrajectoryPath(
      this.group,
      this.trajectoryPath,
      createTrajectoryLine(`${this.name} trajectory`, points, color, opacity),
    );
  }
}

export class CelestialComposite implements CelestialBodyContract {
  name: string;
  radius = 0;
  group = new THREE.Group();
  position = new THREE.Vector3();
  private readonly children: CelestialBodyContract[] = [];

  constructor(name: string) {
    this.name = name;
    this.group.name = name;
  }

  add(body: CelestialBodyContract): void {
    this.children.push(body);
    this.group.add(body.group);
  }

  update(simulatedDays: number): void {
    this.children.forEach((body) => body.update(simulatedDays));
    this.group.getWorldPosition(this.position);
  }

  getMassSources(): MassSource[] {
    return this.children.flatMap((body) => body.getMassSources());
  }

  rebuildTrajectoryPath(simulatedDays: number): void {
    this.children.forEach((body) => body.rebuildTrajectoryPath(simulatedDays));
  }
}
