import { BODIES } from '../constants';
import { SolarPlanet } from './SolarPlanet';

export class Venus extends SolarPlanet {
  constructor() {
    super({
      body: BODIES.venus,
      color: 0xd9a45f,
      secondaryColor: 0xf3d19a,
      orbitColor: 0xd9a45f,
    });
  }
}
