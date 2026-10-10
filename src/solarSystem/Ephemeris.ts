import * as THREE from 'three';

export type PlanetEphemerisKey =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

interface ElementSet {
  a: number;
  e: number;
  inclination: number;
  meanLongitude: number;
  longitudeOfPerihelion: number;
  longitudeOfAscendingNode: number;
}

interface PlanetElements {
  epoch: ElementSet;
  rate: ElementSet;
}

const JULIAN_DATE_UNIX_EPOCH = 2440587.5;
const JULIAN_DATE_J2000 = 2451545.0;
const DAYS_PER_CENTURY = 36525;
const MILLISECONDS_PER_DAY = 86_400_000;
const KEPLER_TOLERANCE = 1e-8;

// JPL SSD approximate planet positions, Table 1, valid for 1800 AD - 2050 AD.
const PLANET_ELEMENTS: Record<PlanetEphemerisKey, PlanetElements> = {
  mercury: {
    epoch: {
      a: 0.38709927,
      e: 0.20563593,
      inclination: 7.00497902,
      meanLongitude: 252.2503235,
      longitudeOfPerihelion: 77.45779628,
      longitudeOfAscendingNode: 48.33076593,
    },
    rate: {
      a: 0.00000037,
      e: 0.00001906,
      inclination: -0.00594749,
      meanLongitude: 149472.67411175,
      longitudeOfPerihelion: 0.16047689,
      longitudeOfAscendingNode: -0.12534081,
    },
  },
  venus: {
    epoch: {
      a: 0.72333566,
      e: 0.00677672,
      inclination: 3.39467605,
      meanLongitude: 181.9790995,
      longitudeOfPerihelion: 131.60246718,
      longitudeOfAscendingNode: 76.67984255,
    },
    rate: {
      a: 0.0000039,
      e: -0.00004107,
      inclination: -0.0007889,
      meanLongitude: 58517.81538729,
      longitudeOfPerihelion: 0.00268329,
      longitudeOfAscendingNode: -0.27769418,
    },
  },
  earth: {
    epoch: {
      a: 1.00000261,
      e: 0.01671123,
      inclination: -0.00001531,
      meanLongitude: 100.46457166,
      longitudeOfPerihelion: 102.93768193,
      longitudeOfAscendingNode: 0,
    },
    rate: {
      a: 0.00000562,
      e: -0.00004392,
      inclination: -0.01294668,
      meanLongitude: 35999.37244981,
      longitudeOfPerihelion: 0.32327364,
      longitudeOfAscendingNode: 0,
    },
  },
  mars: {
    epoch: {
      a: 1.52371034,
      e: 0.0933941,
      inclination: 1.84969142,
      meanLongitude: -4.55343205,
      longitudeOfPerihelion: -23.94362959,
      longitudeOfAscendingNode: 49.55953891,
    },
    rate: {
      a: 0.00001847,
      e: 0.00007882,
      inclination: -0.00813131,
      meanLongitude: 19140.30268499,
      longitudeOfPerihelion: 0.44441088,
      longitudeOfAscendingNode: -0.29257343,
    },
  },
  jupiter: {
    epoch: {
      a: 5.202887,
      e: 0.04838624,
      inclination: 1.30439695,
      meanLongitude: 34.39644051,
      longitudeOfPerihelion: 14.72847983,
      longitudeOfAscendingNode: 100.47390909,
    },
    rate: {
      a: -0.00011607,
      e: -0.00013253,
      inclination: -0.00183714,
      meanLongitude: 3034.74612775,
      longitudeOfPerihelion: 0.21252668,
      longitudeOfAscendingNode: 0.20469106,
    },
  },
  saturn: {
    epoch: {
      a: 9.53667594,
      e: 0.05386179,
      inclination: 2.48599187,
      meanLongitude: 49.95424423,
      longitudeOfPerihelion: 92.59887831,
      longitudeOfAscendingNode: 113.66242448,
    },
    rate: {
      a: -0.0012506,
      e: -0.00050991,
      inclination: 0.00193609,
      meanLongitude: 1222.49362201,
      longitudeOfPerihelion: -0.41897216,
      longitudeOfAscendingNode: -0.28867794,
    },
  },
  uranus: {
    epoch: {
      a: 19.18916464,
      e: 0.04725744,
      inclination: 0.77263783,
      meanLongitude: 313.23810451,
      longitudeOfPerihelion: 170.9542763,
      longitudeOfAscendingNode: 74.01692503,
    },
    rate: {
      a: -0.00196176,
      e: -0.00004397,
      inclination: -0.00242939,
      meanLongitude: 428.48202785,
      longitudeOfPerihelion: 0.40805281,
      longitudeOfAscendingNode: 0.04240589,
    },
  },
  neptune: {
    epoch: {
      a: 30.06992276,
      e: 0.00859048,
      inclination: 1.77004347,
      meanLongitude: -55.12002969,
      longitudeOfPerihelion: 44.96476227,
      longitudeOfAscendingNode: 131.78422574,
    },
    rate: {
      a: 0.00026291,
      e: 0.00005105,
      inclination: 0.00035372,
      meanLongitude: 218.45945325,
      longitudeOfPerihelion: -0.32241464,
      longitudeOfAscendingNode: -0.00508664,
    },
  },
};

export function getDaysSinceJ2000(date: Date): number {
  return date.getTime() / MILLISECONDS_PER_DAY + JULIAN_DATE_UNIX_EPOCH - JULIAN_DATE_J2000;
}

export function getDateFromDaysSinceJ2000(daysSinceJ2000: number): Date {
  return new Date((daysSinceJ2000 + JULIAN_DATE_J2000 - JULIAN_DATE_UNIX_EPOCH) * MILLISECONDS_PER_DAY);
}

export function getPlanetHeliocentricPositionAu(
  planet: PlanetEphemerisKey,
  daysSinceJ2000: number,
): THREE.Vector3 {
  const T = daysSinceJ2000 / DAYS_PER_CENTURY;
  const elements = getElementsAtCentury(PLANET_ELEMENTS[planet], T);
  const meanAnomaly = normalizeRadians(
    THREE.MathUtils.degToRad(elements.meanLongitude - elements.longitudeOfPerihelion),
  );
  return getPositionFromElements(elements, meanAnomaly);
}

export function getPlanetHeliocentricPathAu(
  planet: PlanetEphemerisKey,
  daysSinceJ2000: number,
  segments: number,
): THREE.Vector3[] {
  const T = daysSinceJ2000 / DAYS_PER_CENTURY;
  const elements = getElementsAtCentury(PLANET_ELEMENTS[planet], T);
  const currentMeanAnomaly = normalizeRadians(
    THREE.MathUtils.degToRad(elements.meanLongitude - elements.longitudeOfPerihelion),
  );

  return Array.from({ length: segments }, (_, index) => {
    const meanAnomaly = currentMeanAnomaly + (index / segments) * Math.PI * 2;
    return getPositionFromElements(elements, meanAnomaly);
  });
}

function getPositionFromElements(elements: ElementSet, meanAnomaly: number): THREE.Vector3 {
  const argumentOfPerihelion = elements.longitudeOfPerihelion - elements.longitudeOfAscendingNode;
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, elements.e);
  const xPrime = elements.a * (Math.cos(eccentricAnomaly) - elements.e);
  const yPrime =
    elements.a * Math.sqrt(1 - elements.e * elements.e) * Math.sin(eccentricAnomaly);

  const omega = THREE.MathUtils.degToRad(argumentOfPerihelion);
  const node = THREE.MathUtils.degToRad(elements.longitudeOfAscendingNode);
  const inclination = THREE.MathUtils.degToRad(elements.inclination);

  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);

  const x =
    (cosOmega * cosNode - sinOmega * sinNode * cosInclination) * xPrime +
    (-sinOmega * cosNode - cosOmega * sinNode * cosInclination) * yPrime;
  const y =
    (cosOmega * sinNode + sinOmega * cosNode * cosInclination) * xPrime +
    (-sinOmega * sinNode + cosOmega * cosNode * cosInclination) * yPrime;
  const z = sinOmega * sinInclination * xPrime + cosOmega * sinInclination * yPrime;

  return new THREE.Vector3(x, y, z);
}

function getElementsAtCentury({ epoch, rate }: PlanetElements, T: number): ElementSet {
  return {
    a: epoch.a + rate.a * T,
    e: epoch.e + rate.e * T,
    inclination: epoch.inclination + rate.inclination * T,
    meanLongitude: epoch.meanLongitude + rate.meanLongitude * T,
    longitudeOfPerihelion: epoch.longitudeOfPerihelion + rate.longitudeOfPerihelion * T,
    longitudeOfAscendingNode:
      epoch.longitudeOfAscendingNode + rate.longitudeOfAscendingNode * T,
  };
}

function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number): number {
  let eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly);

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const delta =
      (meanAnomaly -
        (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly))) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly += delta;

    if (Math.abs(delta) < KEPLER_TOLERANCE) {
      break;
    }
  }

  return eccentricAnomaly;
}

function normalizeRadians(angle: number): number {
  return THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}
