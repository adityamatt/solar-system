import * as THREE from 'three';

export interface TrajectoryPathProvider {
  rebuildTrajectoryPath(simulatedDays: number): void;
}

export function createTrajectoryLine(
  name: string,
  points: THREE.Vector3[],
  color: THREE.ColorRepresentation,
  opacity: number,
): THREE.LineLoop {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.name = name;
  line.userData.isOrbitPath = true;
  line.userData.isTrajectoryPath = true;
  return line;
}

export function replaceTrajectoryPath(
  parent: THREE.Object3D,
  currentPath: THREE.Object3D | null,
  nextPath: THREE.Object3D,
): THREE.Object3D {
  if (currentPath) {
    parent.remove(currentPath);
    disposeTrajectoryPath(currentPath);
  }

  parent.add(nextPath);
  return nextPath;
}

function disposeTrajectoryPath(path: THREE.Object3D): void {
  path.traverse((object) => {
    if (!(object instanceof THREE.Line)) return;
    object.geometry.dispose();

    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
      return;
    }

    object.material.dispose();
  });
}
