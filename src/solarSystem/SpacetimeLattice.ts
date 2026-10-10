import * as THREE from 'three';
import type { MassSource } from './PlanetInterface';

const AXES = ['x', 'y', 'z'] as const;
type Axis = (typeof AXES)[number];
const MAX_SHADER_MASS_SOURCES = 16;
const MAX_GRAVITY_WAVEFRONTS = 16;

export interface GravityWavefront {
  origin: THREE.Vector3;
  startSeconds: number;
  amplitude: number;
  speed: number;
  width: number;
}

interface SpacetimeLatticeOptions {
  color?: THREE.ColorRepresentation;
  opacity?: number;
}

interface LatticeLevelConfig {
  name: string;
  size: number;
  divisions: number;
  samples: number;
  minDistance: number;
  maxDistance: number;
  opacity: number;
  spacingBias: number;
}

interface LatticeLevel {
  config: LatticeLevelConfig;
  group: THREE.Group;
  material: THREE.ShaderMaterial;
}

interface LatticeUniforms extends Record<string, THREE.IUniform> {
  uBaseColor: { value: THREE.Color };
  uStrainColor: { value: THREE.Color };
  uOpacity: { value: number };
  uElapsedSeconds: { value: number };
  uMassCount: { value: number };
  uMassPositions: { value: THREE.Vector3[] };
  uMassParams: { value: THREE.Vector4[] };
  uWaveCount: { value: number };
  uWaveEnabled: { value: number };
  uWaveIntensity: { value: number };
  uWaveOrigins: { value: THREE.Vector4[] };
  uWaveParams: { value: THREE.Vector4[] };
}

const LATTICE_LEVELS: LatticeLevelConfig[] = [
  {
    name: 'fine local lattice',
    size: 72,
    divisions: 16,
    samples: 72,
    minDistance: 0,
    maxDistance: 95,
    opacity: 1,
    spacingBias: 1,
  },
  {
    name: 'medium planetary lattice',
    size: 260,
    divisions: 14,
    samples: 84,
    minDistance: 55,
    maxDistance: 310,
    opacity: 0.74,
    spacingBias: 1,
  },
  {
    name: 'coarse solar lattice',
    size: 920,
    divisions: 12,
    samples: 90,
    minDistance: 210,
    maxDistance: Infinity,
    opacity: 0.52,
    spacingBias: 1,
  },
];

export class SpacetimeLattice {
  group: THREE.Group;
  baseColor: THREE.Color;
  strainColor = new THREE.Color(0xffffff);

  private readonly levels: LatticeLevel[] = [];
  private readonly baseOpacity: number;
  private lineThickness = 1;
  private waveEnabled = true;
  private waveIntensity = 1;
  private readonly massPositions = Array.from(
    { length: MAX_SHADER_MASS_SOURCES },
    () => new THREE.Vector3(9999, 9999, 9999),
  );
  private readonly massParams = Array.from(
    { length: MAX_SHADER_MASS_SOURCES },
    () => new THREE.Vector4(0, 1, 1, 0),
  );
  private readonly waveOrigins = Array.from(
    { length: MAX_GRAVITY_WAVEFRONTS },
    () => new THREE.Vector4(9999, 9999, 9999, -9999),
  );
  private readonly waveParams = Array.from(
    { length: MAX_GRAVITY_WAVEFRONTS },
    () => new THREE.Vector4(0, 1, 1, 0),
  );
  private readonly wavefronts: GravityWavefront[] = [];

  constructor({ color = 0x74d7ff, opacity = 0.22 }: SpacetimeLatticeOptions = {}) {
    this.group = new THREE.Group();
    this.group.name = 'GPU LOD contracting 3D spacetime lattice';
    this.baseColor = new THREE.Color(color);
    this.baseOpacity = opacity;

    LATTICE_LEVELS.forEach((config) => {
      const level = this.createLevel(config);
      this.levels.push(level);
      this.group.add(level.group);
    });
  }

  fitToCamera(camera: THREE.Camera, center = new THREE.Vector3()): void {
    const distanceFromCenter = camera.position.distanceTo(center);

    this.levels.forEach((level) => {
      const { minDistance, maxDistance, opacity } = level.config;
      const fadeIn = THREE.MathUtils.smoothstep(distanceFromCenter, minDistance, minDistance + 35);
      const fadeOut =
        Number.isFinite(maxDistance)
          ? 1 - THREE.MathUtils.smoothstep(distanceFromCenter, maxDistance - 45, maxDistance)
          : 1;
      const visibility = Math.min(fadeIn, fadeOut);

      level.group.visible = visibility > 0.02;
      this.getUniforms(level.material).uOpacity.value =
        this.baseOpacity * opacity * visibility * this.getOpacityThicknessScale();
    });
  }

  setColor(color: THREE.ColorRepresentation): void {
    this.baseColor.set(color);
    this.levels.forEach((level) => {
      this.getUniforms(level.material).uBaseColor.value.copy(this.baseColor);
    });
  }

  setLineThickness(thickness: number): void {
    this.lineThickness = Math.max(thickness, 0.01);
    this.levels.forEach((level) => {
      const material = level.material as THREE.ShaderMaterial & { linewidth?: number };
      material.linewidth = this.lineThickness;
      this.getUniforms(level.material).uOpacity.value =
        this.baseOpacity * level.config.opacity * this.getOpacityThicknessScale();
    });
  }

  setGravityWavesEnabled(enabled: boolean): void {
    this.waveEnabled = enabled;
    this.levels.forEach((level) => {
      this.getUniforms(level.material).uWaveEnabled.value = enabled ? 1 : 0;
    });
  }

  setGravityWaveIntensity(intensity: number): void {
    this.waveIntensity = Math.max(intensity, 0);
    this.levels.forEach((level) => {
      this.getUniforms(level.material).uWaveIntensity.value = this.waveIntensity;
    });
  }

  addGravityWavefront(wavefront: GravityWavefront): void {
    if (!this.waveEnabled || wavefront.amplitude <= 0) return;

    this.wavefronts.push({
      origin: wavefront.origin.clone(),
      startSeconds: wavefront.startSeconds,
      amplitude: wavefront.amplitude,
      speed: wavefront.speed,
      width: wavefront.width,
    });

    if (this.wavefronts.length > MAX_GRAVITY_WAVEFRONTS) {
      this.wavefronts.splice(0, this.wavefronts.length - MAX_GRAVITY_WAVEFRONTS);
    }
  }

  update(massSources: MassSource[], elapsedSeconds = 0): void {
    const shaderSources = massSources.slice(0, MAX_SHADER_MASS_SOURCES);
    const visibleWavefronts = this.wavefronts
      .filter((wavefront) => {
        const age = elapsedSeconds - wavefront.startSeconds;
        return age >= 0 && age * wavefront.speed < 1400;
      })
      .slice(-MAX_GRAVITY_WAVEFRONTS);

    if (visibleWavefronts.length !== this.wavefronts.length) {
      this.wavefronts.splice(0, this.wavefronts.length, ...visibleWavefronts);
    }

    shaderSources.forEach((source, index) => {
      const {
        gravitationalRadiusScale,
        radius,
        softening,
        maxContraction = 0.55,
      } = source;
      this.massPositions[index].copy(source.position);
      this.massParams[index].set(gravitationalRadiusScale, radius, softening, maxContraction);
    });

    for (let i = shaderSources.length; i < MAX_SHADER_MASS_SOURCES; i += 1) {
      this.massPositions[i].set(9999, 9999, 9999);
      this.massParams[i].set(0, 1, 1, 0);
    }

    visibleWavefronts.forEach((wavefront, index) => {
      this.waveOrigins[index].set(
        wavefront.origin.x,
        wavefront.origin.y,
        wavefront.origin.z,
        wavefront.startSeconds,
      );
      this.waveParams[index].set(
        wavefront.amplitude,
        wavefront.speed,
        wavefront.width,
        0,
      );
    });

    for (let i = visibleWavefronts.length; i < MAX_GRAVITY_WAVEFRONTS; i += 1) {
      this.waveOrigins[i].set(9999, 9999, 9999, -9999);
      this.waveParams[i].set(0, 1, 1, 0);
    }

    this.levels.forEach((level) => {
      if (!level.group.visible) return;

      const uniforms = this.getUniforms(level.material);
      uniforms.uElapsedSeconds.value = elapsedSeconds;
      uniforms.uMassCount.value = shaderSources.length;
      uniforms.uWaveCount.value = visibleWavefronts.length;
    });
  }

  private createLevel(config: LatticeLevelConfig): LatticeLevel {
    const group = new THREE.Group();
    group.name = config.name;
    const material = this.createMaterial(config.opacity);
    const half = config.size / 2;

    AXES.forEach((axis) => {
      for (let a = 0; a <= config.divisions; a += 1) {
        for (let b = 0; b <= config.divisions; b += 1) {
          const first = this.getMetricCoordinate(a, config.divisions, half, config.spacingBias);
          const second = this.getMetricCoordinate(b, config.divisions, half, config.spacingBias);
          group.add(this.createLine(material, config, axis, first, second));
        }
      }
    });

    return { config, group, material };
  }

  private createLine(
    material: THREE.ShaderMaterial,
    config: LatticeLevelConfig,
    axis: Axis,
    first: number,
    second: number,
  ): THREE.Line<THREE.BufferGeometry, THREE.ShaderMaterial> {
    const half = config.size / 2;
    const positions = new Float32Array((config.samples + 1) * 3);

    for (let i = 0; i <= config.samples; i += 1) {
      const run = this.getMetricCoordinate(i, config.samples, half, config.spacingBias * 0.82);
      const offset = i * 3;

      if (axis === 'x') {
        positions[offset] = run;
        positions[offset + 1] = first;
        positions[offset + 2] = second;
      }

      if (axis === 'y') {
        positions[offset] = first;
        positions[offset + 1] = run;
        positions[offset + 2] = second;
      }

      if (axis === 'z') {
        positions[offset] = first;
        positions[offset + 1] = second;
        positions[offset + 2] = run;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    return new THREE.Line(geometry, material);
  }

  private createMaterial(opacityScale: number): THREE.ShaderMaterial {
    const uniforms: LatticeUniforms = {
      uBaseColor: { value: this.baseColor.clone() },
      uStrainColor: { value: this.strainColor.clone() },
      uOpacity: { value: this.baseOpacity * opacityScale },
      uElapsedSeconds: { value: 0 },
      uMassCount: { value: 0 },
      uMassPositions: { value: this.massPositions },
      uMassParams: { value: this.massParams },
      uWaveCount: { value: 0 },
      uWaveEnabled: { value: this.waveEnabled ? 1 : 0 },
      uWaveIntensity: { value: this.waveIntensity },
      uWaveOrigins: { value: this.waveOrigins },
      uWaveParams: { value: this.waveParams },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        #define MAX_MASS_SOURCES ${MAX_SHADER_MASS_SOURCES}
        #define MAX_GRAVITY_WAVEFRONTS ${MAX_GRAVITY_WAVEFRONTS}

        uniform float uElapsedSeconds;
        uniform int uMassCount;
        uniform vec3 uMassPositions[MAX_MASS_SOURCES];
        uniform vec4 uMassParams[MAX_MASS_SOURCES];
        uniform int uWaveCount;
        uniform float uWaveEnabled;
        uniform float uWaveIntensity;
        uniform vec4 uWaveOrigins[MAX_GRAVITY_WAVEFRONTS];
        uniform vec4 uWaveParams[MAX_GRAVITY_WAVEFRONTS];

        varying float vStrain;

        void main() {
          vec3 warped = position;
          float totalStrain = 0.0;

          for (int i = 0; i < MAX_MASS_SOURCES; i++) {
            if (i >= uMassCount) {
              break;
            }

            vec3 relative = position - uMassPositions[i];
            float distanceToMass = max(length(relative), 0.001);
            vec4 params = uMassParams[i];
            float gravitationalRadius = params.x;
            float radius = params.y;
            float softening = params.z;
            float maxContraction = params.w;
            float metricRadius = sqrt(distanceToMass * distanceToMass + softening * softening);
            // Weak-field GR ordering: metric deviation scales with GM/(c^2 r).
            // gravitationalRadius is the display-scaled GM/c^2 for this body.
            float gravitationalPotential = gravitationalRadius / metricRadius;
            float weakFieldScale = inversesqrt(1.0 + gravitationalPotential);
            float radialContraction = clamp(1.0 - weakFieldScale, 0.0, maxContraction);
            float surfaceLimit = max(distanceToMass - radius * 1.04, 0.0);

            if (surfaceLimit > 0.0) {
              vec3 displacement = normalize(relative) * -min(
                distanceToMass * radialContraction,
                surfaceLimit
              );

              warped += displacement;
              totalStrain += radialContraction;
            }
          }

          float waveStrain = 0.0;

          if (uWaveEnabled > 0.5) {
            for (int i = 0; i < MAX_GRAVITY_WAVEFRONTS; i++) {
              if (i >= uWaveCount) {
                break;
              }

              vec4 originAndStart = uWaveOrigins[i];
              vec4 wave = uWaveParams[i];
              float age = uElapsedSeconds - originAndStart.w;

              if (age > 0.0) {
                vec3 fromWave = position - originAndStart.xyz;
                float distanceToWave = max(length(fromWave), 0.001);
                float waveRadius = age * wave.y;
                float shell = exp(-pow((distanceToWave - waveRadius) / wave.z, 2.0));
                float falloff = 1.0 / (1.0 + waveRadius * 0.028);
                float phase = sin((distanceToWave - waveRadius) * 4.4);
                float pulse = wave.x * uWaveIntensity * shell * falloff * phase;

                warped += normalize(fromWave) * pulse;
                waveStrain += abs(wave.x) * uWaveIntensity * shell * falloff;
              }
            }
          }

          vStrain = clamp(totalStrain * 3.8 + waveStrain * 14.0, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(warped, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        uniform vec3 uStrainColor;
        uniform float uOpacity;

        varying float vStrain;

        void main() {
          vec3 color = mix(uBaseColor, uStrainColor, vStrain);
          gl_FragColor = vec4(color, uOpacity);
        }
      `,
    });
    (material as THREE.ShaderMaterial & { linewidth?: number }).linewidth = this.lineThickness;
    return material;
  }

  private getUniforms(material: THREE.ShaderMaterial): LatticeUniforms {
    return material.uniforms as unknown as LatticeUniforms;
  }

  private getOpacityThicknessScale(): number {
    return Math.max(0.05, this.lineThickness * 0.32);
  }

  private getMetricCoordinate(
    index: number,
    segments: number,
    halfSize: number,
    spacingBias: number,
  ): number {
    const normalized = (index / segments) * 2 - 1;
    const sign = Math.sign(normalized);
    return sign * halfSize * Math.pow(Math.abs(normalized), spacingBias);
  }
}
