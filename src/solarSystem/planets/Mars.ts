import { BODIES } from '../constants';
import { Moon } from '../moons/Moon';
import { SolarPlanet } from './SolarPlanet';

export class Mars extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.mars,
      color: 0xb85c3c,
      secondaryColor: 0xe0a06e,
      orbitColor: 0xd96d4a,
    });

    this.addMoon(
      new Moon({
        name: 'Phobos',
        parentName: 'Mars',
        radius: 0.055,
        orbitRadius: 0.78,
        orbitalPeriodDays: 0.319,
        color: 0x8c7a6a,
      }),
    );
    this.addMoon(
      new Moon({
        name: 'Deimos',
        parentName: 'Mars',
        radius: 0.04,
        orbitRadius: 1.15,
        orbitalPeriodDays: 1.264,
        color: 0x9b8a78,
        initialAngle: 1.7,
      }),
    );
  }
}
