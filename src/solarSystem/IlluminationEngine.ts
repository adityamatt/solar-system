import * as THREE from 'three';

interface IlluminatedUserData {
  baseEmissive?: THREE.Color;
  baseOpacity?: number;
  illuminationName?: string;
  receivesSunlight?: boolean;
}

export interface IlluminationEngineOptions {
  sunPosition: THREE.Vector3;
  root: THREE.Object3D;
  referenceDistance: number;
}

export class IlluminationEngine {
  private readonly sunPosition: THREE.Vector3;
  private readonly root: THREE.Object3D;
  private readonly referenceDistance: number;
  private readonly workingPosition = new THREE.Vector3();
  private readonly fillColor = new THREE.Color(0x8fc8ff);
  private readonly fluxByBody = new Map<string, number>();
  private multiplier = 1;

  constructor({ sunPosition, root, referenceDistance }: IlluminationEngineOptions) {
    this.sunPosition = sunPosition;
    this.root = root;
    this.referenceDistance = referenceDistance;
  }

  update(): Map<string, number> {
    this.fluxByBody.clear();

    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;

      const userData = object.userData as IlluminatedUserData;
      if (!userData.receivesSunlight) return;

      const material = object.material;
      object.getWorldPosition(this.workingPosition);
      const solarFlux = this.getSolarFlux(this.workingPosition);
      const displayFlux = this.getDisplayFlux(solarFlux);

      if (isStandardMaterial(material)) {
        const baseEmissive = userData.baseEmissive ?? new THREE.Color(0x000000);

        material.emissive.copy(baseEmissive).lerp(this.fillColor, 0.13);
        material.emissiveIntensity = THREE.MathUtils.mapLinear(displayFlux, 0.035, 8, 0.006, 0.42);
        material.needsUpdate = true;
      }

      if (isPointsMaterial(material)) {
        const baseOpacity = userData.baseOpacity ?? material.opacity;
        material.opacity = baseOpacity * THREE.MathUtils.mapLinear(displayFlux, 0.035, 8, 0.32, 1.35);
        material.needsUpdate = true;
      }

      if (userData.illuminationName) {
        this.fluxByBody.set(userData.illuminationName, solarFlux);
      }
    });

    return this.fluxByBody;
  }

  private getSolarFlux(position: THREE.Vector3): number {
    const distance = Math.max(position.distanceTo(this.sunPosition), 0.001);
    return (this.referenceDistance * this.referenceDistance) / (distance * distance);
  }

  private getDisplayFlux(solarFlux: number): number {
    const liftedFlux = Math.pow(Math.max(solarFlux, 0.00001), 0.42);
    const multiplierCurve = Math.pow(this.multiplier, 1.28);
    return THREE.MathUtils.clamp(liftedFlux * multiplierCurve, 0.035, 8);
  }

  setMultiplier(multiplier: number): void {
    this.multiplier = THREE.MathUtils.clamp(multiplier, 0.2, 80);
  }
}

export function markReceivesSunlight(
  object: THREE.Object3D,
  name: string,
  material: THREE.Material,
): void {
  const userData = object.userData as IlluminatedUserData;
  userData.receivesSunlight = true;
  userData.illuminationName = name;

  if (isStandardMaterial(material)) {
    userData.baseEmissive = material.emissive.clone();
  }

  if (isPointsMaterial(material)) {
    userData.baseOpacity = material.opacity;
  }
}

function isStandardMaterial(
  material: THREE.Material | THREE.Material[],
): material is THREE.MeshStandardMaterial {
  return !Array.isArray(material) && material instanceof THREE.MeshStandardMaterial;
}

function isPointsMaterial(
  material: THREE.Material | THREE.Material[],
): material is THREE.PointsMaterial {
  return !Array.isArray(material) && material instanceof THREE.PointsMaterial;
}
