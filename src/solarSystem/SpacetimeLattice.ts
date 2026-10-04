import * as THREE from 'three';
import type { MassSource } from './PlanetInterface';

const AXES = ['x', 'y', 'z'] as const;
type Axis = (typeof AXES)[number];

interface SpacetimeLatticeOptions {
  size?: number;
  divisions?: number;
  samples?: number;
  minSize?: number;
  maxSize?: number;
  targetCellSize?: number;
  maxDivisions?: number;
  color?: THREE.ColorRepresentation;
  opacity?: number;
}

export class SpacetimeLattice {
  size: number;
  divisions: number;
  samples: number;
  minSize: number;
  maxSize: number;
  targetCellSize: number;
  maxDivisions: number;
  basePositions: THREE.Vector3[][];
  lineColors: Float32Array[];
  group: THREE.Group;
  baseColor: THREE.Color;
  strainColor: THREE.Color;
  material: THREE.LineBasicMaterial;

  constructor({
    size = 36,
    divisions = 12,
    samples = 96,
    minSize = size,
    maxSize = 180,
    targetCellSize = 3.8,
    maxDivisions = 18,
    color = 0x74d7ff,
    opacity = 0.22,
  }: SpacetimeLatticeOptions = {}) {
    this.size = size;
    this.divisions = divisions;
    this.samples = samples;
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.targetCellSize = targetCellSize;
    this.maxDivisions = maxDivisions;
    this.basePositions = [];
    this.lineColors = [];
    this.group = new THREE.Group();
    this.group.name = 'Contracting 3D spacetime lattice';

    this.baseColor = new THREE.Color(color);
    this.strainColor = new THREE.Color(0xffffff);
    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.createVolumetricLines(this.material);
  }

  fitToCamera(camera: THREE.Camera, center = new THREE.Vector3()): void {
    const distanceFromCenter = camera.position.distanceTo(center);
    const targetSize = THREE.MathUtils.clamp(distanceFromCenter * 2.7, this.minSize, this.maxSize);
    const quantizedSize = Math.ceil(targetSize / this.targetCellSize) * this.targetCellSize;

    if (Math.abs(quantizedSize - this.size) < this.targetCellSize * 1.5) {
      return;
    }

    this.size = quantizedSize;
    this.divisions = THREE.MathUtils.clamp(
      Math.round(this.size / this.targetCellSize),
      10,
      this.maxDivisions,
    );
    this.samples = THREE.MathUtils.clamp(Math.round(this.size * 2.25), 90, 180);
    this.rebuild();
  }

  rebuild(): void {
    this.group.children.forEach((line) => {
      const latticeLine = line as THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      latticeLine.geometry.dispose();
    });
    this.group.clear();
    this.basePositions = [];
    this.lineColors = [];
    this.createVolumetricLines(this.material);
  }

  createVolumetricLines(material: THREE.LineBasicMaterial): void {
    const half = this.size / 2;
    const step = this.size / this.divisions;

    AXES.forEach((axis) => {
      for (let a = 0; a <= this.divisions; a += 1) {
        for (let b = 0; b <= this.divisions; b += 1) {
          const first = -half + a * step;
          const second = -half + b * step;
          this.addLine(material, axis, first, second);
        }
      }
    });
  }

  addLine(
    material: THREE.LineBasicMaterial,
    axis: Axis,
    first: number,
    second: number,
  ): void {
    const half = this.size / 2;
    const points = [];

    for (let i = 0; i <= this.samples; i += 1) {
      const run = -half + (i / this.samples) * this.size;
      const point = new THREE.Vector3();

      if (axis === 'x') point.set(run, first, second);
      if (axis === 'y') point.set(first, run, second);
      if (axis === 'z') point.set(first, second, run);

      points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors = new Float32Array(points.length * 3);

    for (let i = 0; i < points.length; i += 1) {
      this.baseColor.toArray(colors, i * 3);
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.basePositions.push(points);
    this.lineColors.push(colors);
    this.group.add(new THREE.Line(geometry, material));
  }

  update(massSources: MassSource[], elapsedSeconds = 0): void {
    this.group.children.forEach((line, lineIndex) => {
      const latticeLine = line as THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      const baseLine = this.basePositions[lineIndex];
      const positions = latticeLine.geometry.attributes.position as THREE.BufferAttribute;
      const colors = latticeLine.geometry.attributes.color as THREE.BufferAttribute;

      baseLine.forEach((point, pointIndex) => {
        const warped = point.clone();
        let totalStrain = 0;

        massSources.forEach((source) => {
          const {
            position,
            compactness,
            radius,
            softening,
            maxContraction = 0.55,
            flow = 0,
          } = source;
          const relative = point.clone().sub(position);
          const distance = Math.max(relative.length(), 0.001);
          const metricRadius = Math.sqrt(distance * distance + softening * softening);
          const weakFieldScale = 1 / Math.sqrt(1 + compactness / metricRadius);
          const radialContraction = THREE.MathUtils.clamp(
            1 - weakFieldScale,
            0,
            maxContraction,
          );
          const surfaceLimit = Math.max(distance - radius * 1.04, 0);

          if (surfaceLimit > 0) {
            const flowRipple = 1 + flow * Math.sin(elapsedSeconds * 2.2 - distance * 0.85);
            const displacement = relative
              .normalize()
              .multiplyScalar(-Math.min(distance * radialContraction * flowRipple, surfaceLimit));

            warped.add(displacement);
            totalStrain += radialContraction;
          }
        });

        positions.setXYZ(pointIndex, warped.x, warped.y, warped.z);

        const strain = THREE.MathUtils.clamp(totalStrain * 3.8, 0, 1);
        const color = this.baseColor.clone().lerp(this.strainColor, strain);
        colors.setXYZ(pointIndex, color.r, color.g, color.b);
      });

      positions.needsUpdate = true;
      colors.needsUpdate = true;
      latticeLine.geometry.computeBoundingSphere();
    });
  }
}
