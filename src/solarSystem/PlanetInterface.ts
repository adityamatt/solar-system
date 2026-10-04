import type * as THREE from 'three';

export interface MassSource {
  position: THREE.Vector3;
  compactness: number;
  radius: number;
  softening: number;
  maxContraction?: number;
  flow?: number;
}

export interface PlanetContract {
  group: THREE.Group;
  position: THREE.Vector3;
  radius: number;
  update(simulatedDays: number): void;
  updateIllumination(sunPosition: THREE.Vector3): number;
  getMassSource(): MassSource;
}

export const PLANET_INTERFACE = Object.freeze({
  properties: ['group', 'position', 'radius'],
  methods: ['update', 'updateIllumination', 'getMassSource'],
} satisfies {
  properties: Array<keyof PlanetContract>;
  methods: Array<keyof PlanetContract>;
});

export class PlanetInterface {
  update(): never {
    throw new Error('PlanetInterface.update must be implemented');
  }

  updateIllumination(): never {
    throw new Error('PlanetInterface.updateIllumination must be implemented');
  }

  getMassSource(): never {
    throw new Error('PlanetInterface.getMassSource must be implemented');
  }
}

export function assertPlanetInterface<T extends PlanetContract>(
  candidate: T,
  label = 'Planet',
): T {
  const missingProperties = PLANET_INTERFACE.properties.filter((property) => !(property in candidate));
  const missingMethods = PLANET_INTERFACE.methods.filter(
    (method) => typeof candidate[method] !== 'function',
  );

  if (missingProperties.length > 0 || missingMethods.length > 0) {
    throw new TypeError(
      `${label} does not implement PlanetInterface: missing ${[
        ...missingProperties,
        ...missingMethods,
      ].join(', ')}`,
    );
  }

  return candidate;
}
