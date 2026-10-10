import { Body, EclipticGeoMoon, Illumination, MoonPhase } from 'astronomy-engine';
import * as THREE from 'three';
import { getDateFromDaysSinceJ2000 } from './Ephemeris';

const MEAN_MOON_DISTANCE_AU = 0.00256955529;

export interface LunarState {
  positionAu: THREE.Vector3;
  phaseAngleDegrees: number;
  illuminatedFraction: number;
  phaseName: string;
}

export function getEarthMoonState(daysSinceJ2000: number): LunarState {
  const date = getDateFromDaysSinceJ2000(daysSinceJ2000);
  const moon = EclipticGeoMoon(date);
  const latitude = THREE.MathUtils.degToRad(moon.lat);
  const longitude = THREE.MathUtils.degToRad(moon.lon);
  const distanceInMeanMoonUnits = moon.dist / MEAN_MOON_DISTANCE_AU;
  const distanceCosLatitude = distanceInMeanMoonUnits * Math.cos(latitude);
  const illumination = Illumination(Body.Moon, date);
  const phaseAngleDegrees = MoonPhase(date);

  return {
    positionAu: new THREE.Vector3(
      distanceCosLatitude * Math.cos(longitude),
      distanceInMeanMoonUnits * Math.sin(latitude),
      distanceCosLatitude * Math.sin(longitude),
    ),
    phaseAngleDegrees,
    illuminatedFraction: illumination.phase_fraction,
    phaseName: getMoonPhaseName(phaseAngleDegrees),
  };
}

function getMoonPhaseName(phaseAngleDegrees: number): string {
  const phase = THREE.MathUtils.euclideanModulo(phaseAngleDegrees, 360);

  if (phase < 22.5 || phase >= 337.5) return 'New';
  if (phase < 67.5) return 'Waxing crescent';
  if (phase < 112.5) return 'First quarter';
  if (phase < 157.5) return 'Waxing gibbous';
  if (phase < 202.5) return 'Full';
  if (phase < 247.5) return 'Waning gibbous';
  if (phase < 292.5) return 'Third quarter';
  return 'Waning crescent';
}
