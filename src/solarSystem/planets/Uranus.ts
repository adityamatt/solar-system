import { BODIES } from '../constants';
import { MinorMoonSwarm } from '../moons/MinorMoonSwarm';
import { Moon } from '../moons/Moon';
import { SolarPlanet } from './SolarPlanet';

export class Uranus extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.uranus,
      color: 0x8ed6dc,
      secondaryColor: 0xc3f4f3,
      orbitColor: 0x91dfe5,
    });

    this.addMoon(
      new Moon({
        name: 'Miranda',
        parentName: 'Uranus',
        radius: 0.08,
        orbitRadius: 2.6,
        orbitalPeriodDays: 1.413,
        color: 0xb5c8c8,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Ariel',
        parentName: 'Uranus',
        radius: 0.13,
        orbitRadius: 3.5,
        orbitalPeriodDays: 2.52,
        color: 0xc8d8d6,
        initialAngle: 0.7,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Umbriel',
        parentName: 'Uranus',
        radius: 0.13,
        orbitRadius: 4.4,
        orbitalPeriodDays: 4.144,
        color: 0x7b8586,
        initialAngle: 1.5,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Titania',
        parentName: 'Uranus',
        radius: 0.18,
        orbitRadius: 5.7,
        orbitalPeriodDays: 8.706,
        color: 0xb7c1bf,
        initialAngle: 2.2,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Oberon',
        parentName: 'Uranus',
        radius: 0.17,
        orbitRadius: 7.2,
        orbitalPeriodDays: 13.463,
        color: 0x9ba3a0,
        initialAngle: 3.1,
      }),
    );
    this.addMoon(
      new MinorMoonSwarm({
        parentName: 'Uranus',
        count: 24,
        innerRadius: 8.8,
        outerRadius: 15,
        color: 0xaedadd,
        seed: 707,
      }),
    );
  }
}
