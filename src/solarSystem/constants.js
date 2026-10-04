export const AU = 12;
export const DEFAULT_DAYS_PER_SECOND = 24;

export const BODIES = {
  sun: {
    name: 'Sun',
    radius: 2.15,
    orbitRadius: 0,
    orbitalPeriodDays: 0,
    rotationPeriodDays: 25.38,
    axialTilt: 7.25,
    initialAngle: 0,
  },
  earth: {
    name: 'Earth',
    radius: 0.64,
    orbitRadius: AU,
    orbitalPeriodDays: 365.25,
    rotationPeriodDays: 1,
    axialTilt: 23.44,
    initialAngle: 0.65,
  },
};
