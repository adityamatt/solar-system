import * as THREE from 'three';
import type { MassSource, PlanetContract } from './PlanetInterface';
import { assertPlanetInterface } from './PlanetInterface';
import { Earth } from './planets/Earth';
import { Jupiter } from './planets/Jupiter';
import { Mars } from './planets/Mars';
import { Mercury } from './planets/Mercury';
import { Neptune } from './planets/Neptune';
import { Saturn } from './planets/Saturn';
import { Uranus } from './planets/Uranus';
import { Venus } from './planets/Venus';

export class SolarSystemComposite {
  readonly name = 'Solar system';
  readonly group = new THREE.Group();
  private readonly children: PlanetContract[] = [];

  constructor() {
    this.group.name = this.name;
  }

  add(planet: PlanetContract): void {
    this.children.push(assertPlanetInterface(planet, planet.name));
    this.group.add(planet.group);
  }

  update(simulatedDays: number): void {
    this.children.forEach((planet) => planet.update(simulatedDays));
  }

  updateIllumination(sunPosition: THREE.Vector3): Map<string, number> {
    const fluxByPlanet = new Map<string, number>();

    this.children.forEach((planet) => {
      fluxByPlanet.set(planet.name, planet.updateIllumination(sunPosition));
    });

    return fluxByPlanet;
  }

  getMassSources(): MassSource[] {
    return this.children.flatMap((planet) => planet.getMassSources());
  }

  findPlanet(name: string): PlanetContract {
    const planet = this.children.find((candidate) => candidate.name === name);
    if (!planet) {
      throw new Error(`Missing planet: ${name}`);
    }

    return planet;
  }
}

export function createSolarSystemComposite(): SolarSystemComposite {
  const solarSystem = new SolarSystemComposite();
  solarSystem.add(new Mercury());
  solarSystem.add(new Venus());
  solarSystem.add(new Earth());
  solarSystem.add(new Mars());
  solarSystem.add(new Jupiter());
  solarSystem.add(new Saturn());
  solarSystem.add(new Uranus());
  solarSystem.add(new Neptune());
  return solarSystem;
}
