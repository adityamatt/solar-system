import { BODIES } from '../constants';
import { SolarPlanet } from './SolarPlanet';

export class Uranus extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.uranus,
      color: 0x8ed6dc,
      secondaryColor: 0xc3f4f3,
      orbitColor: 0x91dfe5,
      compactness: 1.15,
      maxContraction: 0.18,
      flow: 0.03,
    });
  }
}
