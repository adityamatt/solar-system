import { BODIES } from '../constants';
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
  }
}
