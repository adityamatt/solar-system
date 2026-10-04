import * as THREE from 'three';
import { Planet } from '../Planet';
import type { MassSource, PlanetContract } from '../PlanetInterface';
import { BODIES } from '../constants';
import { Moon } from '../moons/Moon';
import { createOrbitRing } from './SolarPlanet';

export class Earth extends Planet implements PlanetContract {
  constructor() {
    super({
      ...BODIES.earth,
      receivesSunlight: true,
      material: new THREE.MeshStandardMaterial({
        map: createEarthTexture(),
        roughness: 0.7,
        metalness: 0,
        emissive: 0x000000,
        emissiveIntensity: 0.02,
      }),
    });

    this.group.add(createOrbitRing(BODIES.earth.orbitRadius, 0x7ab8ff));
    this.addMoon(
      new Moon({
        name: 'Moon',
        parentName: 'Earth',
        radius: 0.18,
        orbitRadius: 2.9,
        orbitalPeriodDays: 27.32,
        color: 0xb9b7ad,
        compactness: 0.08,
      }),
    );
  }

  updateIllumination(sunPosition: THREE.Vector3): number {
    return this.updateSunlight(sunPosition, BODIES.earth.orbitRadius);
  }

  getMassSource(): MassSource {
    return {
      position: this.position,
      compactness: 1.05,
      radius: BODIES.earth.radius,
      softening: 0.9,
      maxContraction: 0.22,
      flow: 0.08,
    };
  }

  getMassSources(): MassSource[] {
    return [this.getMassSource(), ...this.moonSystem.getMassSources()];
  }
}

function createEarthTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = size;
  canvasTexture.height = size / 2;
  const ctx = canvasTexture.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create 2D context for Earth texture');
  }

  const ocean = ctx.createLinearGradient(0, 0, 0, canvasTexture.height);
  ocean.addColorStop(0, '#10275d');
  ocean.addColorStop(0.5, '#1f72a6');
  ocean.addColorStop(1, '#0c315c');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvasTexture.width, canvasTexture.height);

  drawLand(ctx, '#6ead73', [
    [78, 74],
    [134, 47],
    [174, 72],
    [158, 118],
    [96, 130],
  ]);
  drawLand(ctx, '#4c8f6c', [
    [248, 48],
    [318, 56],
    [355, 93],
    [320, 137],
    [266, 126],
    [224, 92],
  ]);
  drawLand(ctx, '#b59d62', [
    [368, 82],
    [421, 50],
    [480, 78],
    [466, 128],
    [408, 139],
  ]);
  drawLand(ctx, '#d7dbe1', [
    [0, 0],
    [512, 0],
    [512, 18],
    [0, 22],
  ]);
  drawLand(ctx, '#d7dbe1', [
    [0, 238],
    [512, 232],
    [512, 256],
    [0, 256],
  ]);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 62 - 45, 62 + Math.sin(i) * 22);
    ctx.bezierCurveTo(i * 62, 28, i * 62 + 64, 108, i * 62 + 118, 70);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawLand(
  ctx: CanvasRenderingContext2D,
  color: string,
  points: Array<[number, number]>,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fill();
}
