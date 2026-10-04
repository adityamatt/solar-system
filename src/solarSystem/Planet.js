import * as THREE from 'three';

const FULL_TURN = Math.PI * 2;

export class Planet {
  constructor({
    name,
    radius,
    orbitRadius,
    orbitalPeriodDays,
    rotationPeriodDays,
    axialTilt = 0,
    initialAngle = 0,
    material,
  }) {
    this.name = name;
    this.radius = radius;
    this.orbitRadius = orbitRadius;
    this.orbitalPeriodDays = orbitalPeriodDays;
    this.rotationPeriodDays = rotationPeriodDays;
    this.initialAngle = initialAngle;

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
    this.axis.add(this.mesh);

    this.position = new THREE.Vector3();
    this.update(0);
  }

  update(simulatedDays) {
    if (this.orbitalPeriodDays > 0) {
      this.orbitPivot.rotation.y =
        this.initialAngle + (simulatedDays / this.orbitalPeriodDays) * FULL_TURN;
    }

    if (this.rotationPeriodDays > 0) {
      this.mesh.rotation.y = (simulatedDays / this.rotationPeriodDays) * FULL_TURN;
    }

    this.mesh.getWorldPosition(this.position);
  }
}
