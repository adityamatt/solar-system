import { BODIES } from '../constants';
import { SolarPlanet } from './SolarPlanet';

export class Mercury extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.mercury,
      color: 0x8f8a80,
      secondaryColor: 0xc0b7a6,
      orbitColor: 0x9f9685,
    });
  }
}
