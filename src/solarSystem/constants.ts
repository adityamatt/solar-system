import * as THREE from 'three';

export const AU = 12;
export const DEFAULT_DAYS_PER_SECOND = 1;
export const EARTH_DISPLAY_RADIUS = 0.64;

export interface BodyConfig {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriodDays: number;
  rotationPeriodDays: number;
  axialTilt: number;
  initialAngle: number;
  massRatioToSun: number;
  ephemerisKey?: 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';
}

// The actual solar-system value GM/(c^2 r) is tiny: about 10^-6 at the Sun's
// surface and about 10^-8 at 1 AU. We preserve the GM mass hierarchy exactly,
// then multiply by this single display factor so the weak-field metric gradient
// is visible in the scene.
export const METRIC_VISUALIZATION_STRENGTH = 12;

export const MASS_RATIO_TO_SUN = {
  sun: 1,
  mercury: 1.6601e-7,
  venus: 2.4478e-6,
  earth: 3.0035e-6,
  moon: 3.694e-8,
  mars: 3.2272e-7,
  jupiter: 9.5458e-4,
  saturn: 2.8581e-4,
  uranus: 4.3662e-5,
  neptune: 5.1514e-5,
} as const;

export function getDisplayGravitationalRadius(massRatioToSun: number): number {
  return massRatioToSun * METRIC_VISUALIZATION_STRENGTH;
}

export function getMetricMaxContraction(massRatioToSun: number): number {
  return THREE.MathUtils.clamp(0.46 * Math.pow(massRatioToSun, 0.22), 0.008, 0.46);
}

export function getMetricSoftening(radius: number): number {
  return Math.max(radius * 1.5, 0.14);
}

export const BODIES: Record<
  'sun' | 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune',
  BodyConfig
> = {
  sun: {
    name: 'Sun',
    radius: 2.15,
    orbitRadius: 0,
    orbitalPeriodDays: 0,
    rotationPeriodDays: 25.38,
    axialTilt: 7.25,
    initialAngle: 0,
    massRatioToSun: MASS_RATIO_TO_SUN.sun,
  },
  mercury: {
    name: 'Mercury',
    radius: EARTH_DISPLAY_RADIUS * 0.383,
    orbitRadius: AU * 0.387,
    orbitalPeriodDays: 87.97,
    rotationPeriodDays: 58.65,
    axialTilt: 0.03,
    initialAngle: 1.15,
    massRatioToSun: MASS_RATIO_TO_SUN.mercury,
    ephemerisKey: 'mercury',
  },
  venus: {
    name: 'Venus',
    radius: EARTH_DISPLAY_RADIUS * 0.949,
    orbitRadius: AU * 0.723,
    orbitalPeriodDays: 224.7,
    rotationPeriodDays: -243.02,
    axialTilt: 177.36,
    initialAngle: 2.55,
    massRatioToSun: MASS_RATIO_TO_SUN.venus,
    ephemerisKey: 'venus',
  },
  earth: {
    name: 'Earth',
    radius: EARTH_DISPLAY_RADIUS,
    orbitRadius: AU,
    orbitalPeriodDays: 365.25,
    rotationPeriodDays: 1,
    axialTilt: 23.44,
    initialAngle: 0.65,
    massRatioToSun: MASS_RATIO_TO_SUN.earth,
    ephemerisKey: 'earth',
  },
  mars: {
    name: 'Mars',
    radius: EARTH_DISPLAY_RADIUS * 0.532,
    orbitRadius: AU * 1.524,
    orbitalPeriodDays: 686.98,
    rotationPeriodDays: 1.03,
    axialTilt: 25.19,
    initialAngle: 3.75,
    massRatioToSun: MASS_RATIO_TO_SUN.mars,
    ephemerisKey: 'mars',
  },
  jupiter: {
    name: 'Jupiter',
    radius: EARTH_DISPLAY_RADIUS * Math.sqrt(11.21),
    orbitRadius: AU * 5.203,
    orbitalPeriodDays: 4332.59,
    rotationPeriodDays: 0.41,
    axialTilt: 3.13,
    initialAngle: 5.15,
    massRatioToSun: MASS_RATIO_TO_SUN.jupiter,
    ephemerisKey: 'jupiter',
  },
  saturn: {
    name: 'Saturn',
    radius: EARTH_DISPLAY_RADIUS * Math.sqrt(9.45),
    orbitRadius: AU * 9.537,
    orbitalPeriodDays: 10759.22,
    rotationPeriodDays: 0.44,
    axialTilt: 26.73,
    initialAngle: 4.4,
    massRatioToSun: MASS_RATIO_TO_SUN.saturn,
    ephemerisKey: 'saturn',
  },
  uranus: {
    name: 'Uranus',
    radius: EARTH_DISPLAY_RADIUS * Math.sqrt(4.01),
    orbitRadius: AU * 19.191,
    orbitalPeriodDays: 30688.5,
    rotationPeriodDays: -0.72,
    axialTilt: 97.77,
    initialAngle: 2.1,
    massRatioToSun: MASS_RATIO_TO_SUN.uranus,
    ephemerisKey: 'uranus',
  },
  neptune: {
    name: 'Neptune',
    radius: EARTH_DISPLAY_RADIUS * Math.sqrt(3.88),
    orbitRadius: AU * 30.07,
    orbitalPeriodDays: 60182,
    rotationPeriodDays: 0.67,
    axialTilt: 28.32,
    initialAngle: 5.85,
    massRatioToSun: MASS_RATIO_TO_SUN.neptune,
    ephemerisKey: 'neptune',
  },
};
