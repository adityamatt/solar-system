import { BODIES } from '../constants';
import { MinorMoonSwarm } from '../moons/MinorMoonSwarm';
import { Moon } from '../moons/Moon';
import { SolarPlanet } from './SolarPlanet';

export class Neptune extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.neptune,
      color: 0x3266d3,
      secondaryColor: 0x87a8ff,
      orbitColor: 0x4a72ff,
    });

    this.addMoon(
      new Moon({
        name: 'Triton',
        parentName: 'Neptune',
        radius: 0.21,
        orbitRadius: 3.4,
        orbitalPeriodDays: -5.877,
        color: 0xd3d8cf,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Proteus',
        parentName: 'Neptune',
        radius: 0.09,
        orbitRadius: 2.5,
        orbitalPeriodDays: 1.122,
        color: 0x737e87,
        initialAngle: 1.4,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Nereid',
        parentName: 'Neptune',
        radius: 0.08,
        orbitRadius: 7.5,
        orbitalPeriodDays: 360.14,
        color: 0x8792a0,
        initialAngle: 3.2,
      }),
    );
    this.addMoon(
      new MinorMoonSwarm({
        parentName: 'Neptune',
        count: 13,
        innerRadius: 8.8,
        outerRadius: 14,
        color: 0x8ba2d8,
        seed: 808,
      }),
    );
  }
}
