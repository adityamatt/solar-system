import * as THREE from 'three';
import { Planet } from '../Planet';
import type { MassSource, PlanetContract } from '../PlanetInterface';
import { BODIES, type BodyConfig, EARTH_DISPLAY_RADIUS } from '../constants';

export interface SolarPlanetOptions {
  body: BodyConfig;
  color: THREE.ColorRepresentation;
  secondaryColor?: THREE.ColorRepresentation;
  orbitColor?: THREE.ColorRepresentation;
  material?: THREE.MeshStandardMaterial;
  compactness?: number;
  softening?: number;
  maxContraction?: number;
  flow?: number;
}

export class SolarPlanet extends Planet implements PlanetContract {
  private readonly compactness: number;
  private readonly softening: number;
  private readonly maxContraction: number;
  private readonly flow: number;

  constructor({
    body,
    color,
    secondaryColor,
    orbitColor = 0x4d7895,
    material,
    compactness,
    softening,
    maxContraction,
    flow = 0.03,
  }: SolarPlanetOptions) {
    super({
      ...body,
      receivesSunlight: true,
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

    this.compactness = compactness ?? Math.max(0.18, (body.radius / EARTH_DISPLAY_RADIUS) * 0.34);
    this.softening = softening ?? Math.max(0.55, body.radius * 1.35);
    this.maxContraction = maxContraction ?? Math.min(0.2, 0.08 + body.radius * 0.025);
    this.flow = flow;

    this.group.add(createOrbitRing(body.orbitRadius, orbitColor));
  }

  updateIllumination(sunPosition: THREE.Vector3): number {
    return this.updateSunlight(sunPosition, BODIES.earth.orbitRadius);
  }

  getMassSource(): MassSource {
    return {
      position: this.position,
      compactness: this.compactness,
      radius: this.radius,
      softening: this.softening,
      maxContraction: this.maxContraction,
      flow: this.flow,
    };
  }

  getMassSources(): MassSource[] {
    return [this.getMassSource(), ...this.moonSystem.getMassSources()];
  }
}

export function createOrbitRing(
  radius: number,
  color: THREE.ColorRepresentation,
): THREE.LineLoop {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
  const points = curve.getPoints(320).map((point) => new THREE.Vector3(point.x, 0, point.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.34,
  });

  return new THREE.LineLoop(geometry, material);
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
