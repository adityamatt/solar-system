import type * as THREE from 'three';
import type { CelestialBodyContract } from './CelestialBody';
import type { MassSource } from './PlanetInterface';

export interface MoonContract extends CelestialBodyContract {
  parentName: string;
  update(simulatedDays: number): void;
  getMassSources(): MassSource[];
}

export const MOON_INTERFACE = Object.freeze({
  properties: ['name', 'parentName', 'group', 'position', 'radius'],
  methods: ['update', 'getMassSources'],
} satisfies {
  properties: Array<keyof MoonContract>;
  methods: Array<keyof MoonContract>;
});

export function assertMoonInterface<T extends MoonContract>(candidate: T, label = 'Moon'): T {
  const missingProperties = MOON_INTERFACE.properties.filter((property) => !(property in candidate));
  const missingMethods = MOON_INTERFACE.methods.filter(
    (method) => typeof candidate[method] !== 'function',
  );

  if (missingProperties.length > 0 || missingMethods.length > 0) {
    throw new TypeError(
      `${label} does not implement MoonInterface: missing ${[
        ...missingProperties,
        ...missingMethods,
      ].join(', ')}`,
    );
  }

  return candidate;
}

export function getWorldPosition(body: MoonContract): THREE.Vector3 {
  return body.position.clone();
}
