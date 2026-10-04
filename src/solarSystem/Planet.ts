import * as THREE from 'three';

const FULL_TURN = Math.PI * 2;

interface PlanetOptions {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriodDays: number;
  rotationPeriodDays: number;
  axialTilt?: number;
  initialAngle?: number;
  material: THREE.MeshStandardMaterial;
  receivesSunlight?: boolean;
}

export class Planet {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriodDays: number;
  rotationPeriodDays: number;
  initialAngle: number;
  receivesSunlight: boolean;
  group: THREE.Group;
  orbitPivot: THREE.Group;
  orbitOffset: THREE.Group;
  axis: THREE.Group;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  position: THREE.Vector3;

  constructor({
    name,
    radius,
    orbitRadius,
    orbitalPeriodDays,
    rotationPeriodDays,
    axialTilt = 0,
    initialAngle = 0,
    material,
    receivesSunlight = false,
  }: PlanetOptions) {
    this.name = name;
    this.radius = radius;
    this.orbitRadius = orbitRadius;
    this.orbitalPeriodDays = orbitalPeriodDays;
    this.rotationPeriodDays = rotationPeriodDays;
    this.initialAngle = initialAngle;
    this.receivesSunlight = receivesSunlight;

    this.group = new THREE.Group();
    this.group.name = `${name} system`;

    this.orbitPivot = new THREE.Group();
    this.group.add(this.orbitPivot);

    this.orbitOffset = new THREE.Group();
    this.orbitOffset.position.x = orbitRadius;
    this.orbitPivot.add(this.orbitOffset);

    this.axis = new THREE.Group();
    this.axis.rotation.z = THREE.MathUtils.degToRad(axialTilt);
    this.orbitOffset.add(this.axis);

    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = name;
    this.mesh.userData.baseEmissive = material.emissive.clone();
    this.axis.add(this.mesh);

    this.position = new THREE.Vector3();
    this.update(0);
  }

  update(simulatedDays: number): void {
    if (this.orbitalPeriodDays > 0) {
      this.orbitPivot.rotation.y =
        this.initialAngle + (simulatedDays / this.orbitalPeriodDays) * FULL_TURN;
    }

    if (this.rotationPeriodDays > 0) {
      this.mesh.rotation.y = (simulatedDays / this.rotationPeriodDays) * FULL_TURN;
    }

    this.mesh.getWorldPosition(this.position);
  }

  updateSunlight(sunPosition: THREE.Vector3, referenceDistance: number): number {
    if (!this.receivesSunlight || !this.mesh.material) return 1;

    const distance = Math.max(this.position.distanceTo(sunPosition), 0.001);
    const solarFlux = (referenceDistance * referenceDistance) / (distance * distance);
    const displayFlux = THREE.MathUtils.clamp(solarFlux, 0.08, 2.4);
    const material = this.mesh.material;

    material.emissive.copy(this.mesh.userData.baseEmissive).lerp(new THREE.Color(0x8fc8ff), 0.16);
    material.emissiveIntensity = THREE.MathUtils.mapLinear(displayFlux, 0.08, 2.4, 0.015, 0.22);
    material.needsUpdate = true;

    return solarFlux;
  }
}
