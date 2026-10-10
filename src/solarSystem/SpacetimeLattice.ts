import * as THREE from 'three';
import type { MassSource } from './PlanetInterface';

const AXES = ['x', 'y', 'z'] as const;
type Axis = (typeof AXES)[number];
const MAX_SHADER_MASS_SOURCES = 16;

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
  uMassFlow: { value: number[] };
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
  },
  {
    name: 'medium planetary lattice',
    size: 260,
    divisions: 14,
    samples: 84,
    minDistance: 55,
    maxDistance: 310,
    opacity: 0.74,
  },
  {
    name: 'coarse solar lattice',
    size: 920,
    divisions: 12,
    samples: 90,
    minDistance: 210,
    maxDistance: Infinity,
    opacity: 0.52,
  },
];

export class SpacetimeLattice {
  group: THREE.Group;
  baseColor: THREE.Color;
  strainColor = new THREE.Color(0xffffff);

  private readonly levels: LatticeLevel[] = [];
  private readonly baseOpacity: number;
  private readonly massPositions = Array.from(
    { length: MAX_SHADER_MASS_SOURCES },
    () => new THREE.Vector3(9999, 9999, 9999),
  );
  private readonly massParams = Array.from(
    { length: MAX_SHADER_MASS_SOURCES },
    () => new THREE.Vector4(0, 1, 1, 0),
  );
  private readonly massFlow = Array.from({ length: MAX_SHADER_MASS_SOURCES }, () => 0);

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
      this.getUniforms(level.material).uOpacity.value = this.baseOpacity * opacity * visibility;
    });
  }

  setColor(color: THREE.ColorRepresentation): void {
    this.baseColor.set(color);
    this.levels.forEach((level) => {
      this.getUniforms(level.material).uBaseColor.value.copy(this.baseColor);
    });
  }

  update(massSources: MassSource[], elapsedSeconds = 0): void {
    const shaderSources = massSources.slice(0, MAX_SHADER_MASS_SOURCES);

    shaderSources.forEach((source, index) => {
      const { compactness, radius, softening, maxContraction = 0.55, flow = 0 } = source;
      this.massPositions[index].copy(source.position);
      this.massParams[index].set(compactness, radius, softening, maxContraction);
      this.massFlow[index] = flow;
    });

    for (let i = shaderSources.length; i < MAX_SHADER_MASS_SOURCES; i += 1) {
      this.massPositions[i].set(9999, 9999, 9999);
      this.massParams[i].set(0, 1, 1, 0);
      this.massFlow[i] = 0;
    }

    this.levels.forEach((level) => {
      if (!level.group.visible) return;

      const uniforms = this.getUniforms(level.material);
      uniforms.uElapsedSeconds.value = elapsedSeconds;
      uniforms.uMassCount.value = shaderSources.length;
    });
  }

  private createLevel(config: LatticeLevelConfig): LatticeLevel {
    const group = new THREE.Group();
    group.name = config.name;
    const material = this.createMaterial(config.opacity);
    const half = config.size / 2;
    const step = config.size / config.divisions;

    AXES.forEach((axis) => {
      for (let a = 0; a <= config.divisions; a += 1) {
        for (let b = 0; b <= config.divisions; b += 1) {
          const first = -half + a * step;
          const second = -half + b * step;
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
      const run = -half + (i / config.samples) * config.size;
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
      uMassFlow: { value: this.massFlow },
    };

    return new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        #define MAX_MASS_SOURCES ${MAX_SHADER_MASS_SOURCES}

        uniform float uElapsedSeconds;
        uniform int uMassCount;
        uniform vec3 uMassPositions[MAX_MASS_SOURCES];
        uniform vec4 uMassParams[MAX_MASS_SOURCES];
        uniform float uMassFlow[MAX_MASS_SOURCES];

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
            float compactness = params.x;
            float radius = params.y;
            float softening = params.z;
            float maxContraction = params.w;
            float flow = uMassFlow[i];
            float metricRadius = sqrt(distanceToMass * distanceToMass + softening * softening);
            float weakFieldScale = inversesqrt(1.0 + compactness / metricRadius);
            float radialContraction = clamp(1.0 - weakFieldScale, 0.0, maxContraction);
            float surfaceLimit = max(distanceToMass - radius * 1.04, 0.0);

            if (surfaceLimit > 0.0) {
              float flowRipple = 1.0 + flow * sin(uElapsedSeconds * 2.2 - distanceToMass * 0.85);
              vec3 displacement = normalize(relative) * -min(
                distanceToMass * radialContraction * flowRipple,
                surfaceLimit
              );

              warped += displacement;
              totalStrain += radialContraction;
            }
          }

          vStrain = clamp(totalStrain * 3.8, 0.0, 1.0);
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
  }

  private getUniforms(material: THREE.ShaderMaterial): LatticeUniforms {
    return material.uniforms as unknown as LatticeUniforms;
  }
}
