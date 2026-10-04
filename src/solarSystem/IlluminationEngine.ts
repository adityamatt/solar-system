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

  constructor({ sunPosition, root, referenceDistance }: IlluminationEngineOptions) {
    this.sunPosition = sunPosition;
    this.root = root;
    this.referenceDistance = referenceDistance;
  }

  update(): Map<string, number> {
    const fluxByBody = new Map<string, number>();

    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;

      const userData = object.userData as IlluminatedUserData;
      if (!userData.receivesSunlight) return;

      const material = object.material;
      object.getWorldPosition(this.workingPosition);
      const solarFlux = this.getSolarFlux(this.workingPosition);
      const displayFlux = THREE.MathUtils.clamp(solarFlux, 0.035, 2.6);

      if (isStandardMaterial(material)) {
        const baseEmissive = userData.baseEmissive ?? new THREE.Color(0x000000);

        material.emissive.copy(baseEmissive).lerp(this.fillColor, 0.13);
        material.emissiveIntensity = THREE.MathUtils.mapLinear(displayFlux, 0.035, 2.6, 0.006, 0.2);
        material.needsUpdate = true;
      }

      if (isPointsMaterial(material)) {
        const baseOpacity = userData.baseOpacity ?? material.opacity;
        material.opacity = baseOpacity * THREE.MathUtils.mapLinear(displayFlux, 0.035, 2.6, 0.32, 1.15);
        material.needsUpdate = true;
      }

      if (userData.illuminationName) {
        fluxByBody.set(userData.illuminationName, solarFlux);
      }
    });

    return fluxByBody;
  }

  private getSolarFlux(position: THREE.Vector3): number {
    const distance = Math.max(position.distanceTo(this.sunPosition), 0.001);
    return (this.referenceDistance * this.referenceDistance) / (distance * distance);
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
