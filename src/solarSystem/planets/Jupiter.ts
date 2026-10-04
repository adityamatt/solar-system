import { BODIES } from '../constants';
import { MinorMoonSwarm } from '../moons/MinorMoonSwarm';
import { Moon } from '../moons/Moon';
import { SolarPlanet } from './SolarPlanet';

export class Jupiter extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.jupiter,
      color: 0xc99562,
      secondaryColor: 0xf3dfb8,
      orbitColor: 0xc99562,
      compactness: 2.45,
      maxContraction: 0.24,
      flow: 0.025,
    });

    this.addMoon(
      new Moon({
        name: 'Io',
        parentName: 'Jupiter',
        radius: 0.2,
        orbitRadius: 3.2,
        orbitalPeriodDays: 1.769,
        color: 0xd8b651,
        compactness: 0.08,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Europa',
        parentName: 'Jupiter',
        radius: 0.17,
        orbitRadius: 4.25,
        orbitalPeriodDays: 3.551,
        color: 0xd9d0bd,
        initialAngle: 0.8,
        compactness: 0.07,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Ganymede',
        parentName: 'Jupiter',
        radius: 0.28,
        orbitRadius: 5.75,
        orbitalPeriodDays: 7.155,
        color: 0xa99a86,
        initialAngle: 1.7,
        compactness: 0.1,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Callisto',
        parentName: 'Jupiter',
        radius: 0.26,
        orbitRadius: 8.2,
        orbitalPeriodDays: 16.689,
        color: 0x8a7d6c,
        initialAngle: 2.5,
        compactness: 0.09,
      }),
    );
    this.addMoon(
      new MinorMoonSwarm({
        parentName: 'Jupiter',
        count: 111,
        innerRadius: 10.5,
        outerRadius: 20,
        color: 0xb8b0a8,
        seed: 505,
      }),
    );
  }
}
