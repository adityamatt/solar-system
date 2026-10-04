import * as THREE from 'three';
import { CelestialBody } from '../CelestialBody';
import { markReceivesSunlight } from '../IlluminationEngine';
import type { MoonContract } from '../MoonInterface';

export interface MinorMoonSwarmOptions {
  parentName: string;
  count: number;
  innerRadius: number;
  outerRadius: number;
  color?: THREE.ColorRepresentation;
  seed?: number;
}

export class MinorMoonSwarm extends CelestialBody implements MoonContract {
  parentName: string;
  private readonly count: number;
  private readonly angularSpeeds: number[] = [];
  private readonly baseAngles: number[] = [];
  private readonly radii: number[] = [];
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;

  constructor({
    parentName,
    count,
    innerRadius,
    outerRadius,
    color = 0xb8c6d8,
    seed = 1,
  }: MinorMoonSwarmOptions) {
    super(`${parentName} minor moon swarm`, 0);
    this.parentName = parentName;
    this.count = count;

    const positions = new Float32Array(count * 3);
    let state = seed;
    const random = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };

    for (let i = 0; i < count; i += 1) {
      this.radii.push(THREE.MathUtils.lerp(innerRadius, outerRadius, random()));
      this.baseAngles.push(random() * Math.PI * 2);
      this.angularSpeeds.push(THREE.MathUtils.lerp(0.00008, 0.0012, random()));
      positions[i * 3 + 1] = (random() - 0.5) * 0.16;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color,
        size: 0.045,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    markReceivesSunlight(this.points, this.name, this.points.material);
    this.group.add(this.points);
    this.update(0);
  }

  update(simulatedDays: number): void {
    const positions = this.points.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i += 1) {
      const angle = this.baseAngles[i] + simulatedDays * this.angularSpeeds[i];
      positions.setXYZ(
        i,
        Math.cos(angle) * this.radii[i],
        positions.getY(i),
        Math.sin(angle) * this.radii[i],
      );
    }

    positions.needsUpdate = true;
    this.group.getWorldPosition(this.position);
  }
}
