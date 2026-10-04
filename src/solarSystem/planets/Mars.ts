import { BODIES } from '../constants';
import { SolarPlanet } from './SolarPlanet';

export class Mars extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.mars,
      color: 0xb85c3c,
      secondaryColor: 0xe0a06e,
      orbitColor: 0xd96d4a,
      compactness: 0.42,
      maxContraction: 0.13,
      flow: 0.04,
    });
  }
}
