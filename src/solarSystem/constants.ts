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
  },
  mercury: {
    name: 'Mercury',
    radius: EARTH_DISPLAY_RADIUS * 0.383,
    orbitRadius: AU * 0.387,
    orbitalPeriodDays: 87.97,
    rotationPeriodDays: 58.65,
    axialTilt: 0.03,
    initialAngle: 1.15,
  },
  venus: {
    name: 'Venus',
    radius: EARTH_DISPLAY_RADIUS * 0.949,
    orbitRadius: AU * 0.723,
    orbitalPeriodDays: 224.7,
    rotationPeriodDays: -243.02,
    axialTilt: 177.36,
    initialAngle: 2.55,
  },
  earth: {
    name: 'Earth',
    radius: EARTH_DISPLAY_RADIUS,
    orbitRadius: AU,
    orbitalPeriodDays: 365.25,
    rotationPeriodDays: 1,
    axialTilt: 23.44,
    initialAngle: 0.65,
  },
  mars: {
    name: 'Mars',
    radius: EARTH_DISPLAY_RADIUS * 0.532,
    orbitRadius: AU * 1.524,
    orbitalPeriodDays: 686.98,
    rotationPeriodDays: 1.03,
    axialTilt: 25.19,
    initialAngle: 3.75,
  },
  jupiter: {
    name: 'Jupiter',
    radius: EARTH_DISPLAY_RADIUS * Math.sqrt(11.21),
    orbitRadius: AU * 5.203,
    orbitalPeriodDays: 4332.59,
    rotationPeriodDays: 0.41,
    axialTilt: 3.13,
    initialAngle: 5.15,
  },
  saturn: {
    name: 'Saturn',
    radius: EARTH_DISPLAY_RADIUS * Math.sqrt(9.45),
    orbitRadius: AU * 9.537,
    orbitalPeriodDays: 10759.22,
    rotationPeriodDays: 0.44,
    axialTilt: 26.73,
    initialAngle: 4.4,
  },
  uranus: {
    name: 'Uranus',
    radius: EARTH_DISPLAY_RADIUS * Math.sqrt(4.01),
    orbitRadius: AU * 19.191,
    orbitalPeriodDays: 30688.5,
    rotationPeriodDays: -0.72,
    axialTilt: 97.77,
    initialAngle: 2.1,
  },
  neptune: {
    name: 'Neptune',
    radius: EARTH_DISPLAY_RADIUS * Math.sqrt(3.88),
    orbitRadius: AU * 30.07,
    orbitalPeriodDays: 60182,
    rotationPeriodDays: 0.67,
    axialTilt: 28.32,
    initialAngle: 5.85,
  },
};
