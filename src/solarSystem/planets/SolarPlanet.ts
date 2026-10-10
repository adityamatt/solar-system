import * as THREE from 'three';
import { Planet } from '../Planet';
import type { MassSource, PlanetContract } from '../PlanetInterface';
import {
  BODIES,
  type BodyConfig,
  getDisplayGravitationalRadius,
  getMetricMaxContraction,
  getMetricSoftening,
} from '../constants';

export interface SolarPlanetOptions {
  body: BodyConfig;
  color: THREE.ColorRepresentation;
  secondaryColor?: THREE.ColorRepresentation;
  orbitColor?: THREE.ColorRepresentation;
  material?: THREE.MeshStandardMaterial;
}

export class SolarPlanet extends Planet implements PlanetContract {
  private readonly gravitationalRadiusScale: number;
  private readonly softening: number;
  private readonly maxContraction: number;

  constructor({
    body,
    color,
    secondaryColor,
    orbitColor = 0x4d7895,
    material,
  }: SolarPlanetOptions) {
    super({
      ...body,
      receivesSunlight: true,
      pathColor: orbitColor,
      material:
        material ??
        new THREE.MeshStandardMaterial({
          map: createProceduralPlanetTexture(color, secondaryColor ?? color),
          roughness: 0.76,
          metalness: 0,
          emissive: 0x000000,
          emissiveIntensity: 0.02,
        }),
    });

    this.gravitationalRadiusScale = getDisplayGravitationalRadius(body.massRatioToSun);
    this.softening = getMetricSoftening(body.radius);
    this.maxContraction = getMetricMaxContraction(body.massRatioToSun);
  }

  updateIllumination(sunPosition: THREE.Vector3): number {
    return this.updateSunlight(sunPosition, BODIES.earth.orbitRadius);
  }

  getMassSource(): MassSource {
    return {
      position: this.position,
      gravitationalRadiusScale: this.gravitationalRadiusScale,
      radius: this.radius,
      softening: this.softening,
      maxContraction: this.maxContraction,
    };
  }

  getMassSources(): MassSource[] {
    return [this.getMassSource(), ...this.moonSystem.getMassSources()];
  }
}

export function createProceduralPlanetTexture(
  color: THREE.ColorRepresentation,
  secondaryColor: THREE.ColorRepresentation,
): THREE.CanvasTexture {
  const size = 512;
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = size;
  canvasTexture.height = size / 2;
  const ctx = canvasTexture.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create 2D context for planet texture');
  }

  const base = new THREE.Color(color);
  const secondary = new THREE.Color(secondaryColor);
  const gradient = ctx.createLinearGradient(0, 0, canvasTexture.width, canvasTexture.height);
  gradient.addColorStop(0, `#${base.clone().offsetHSL(0, 0, 0.13).getHexString()}`);
  gradient.addColorStop(0.55, `#${base.getHexString()}`);
  gradient.addColorStop(1, `#${secondary.clone().offsetHSL(0, 0, -0.08).getHexString()}`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);

  ctx.globalAlpha = 0.28;
  for (let y = 16; y < canvasTexture.height; y += 28) {
    ctx.fillStyle = y % 56 === 0 ? `#${secondary.getHexString()}` : '#ffffff';
    ctx.fillRect(0, y, canvasTexture.width, 4 + (y % 3));
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
