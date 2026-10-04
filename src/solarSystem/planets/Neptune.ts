import { BODIES } from '../constants';
import { SolarPlanet } from './SolarPlanet';

export class Neptune extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.neptune,
      color: 0x3266d3,
      secondaryColor: 0x87a8ff,
      orbitColor: 0x4a72ff,
      compactness: 1.18,
      maxContraction: 0.18,
      flow: 0.03,
    });
  }
}
