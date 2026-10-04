import * as THREE from 'three';

export function createCoordinateFrame({ size = 18 } = {}) {
  const group = new THREE.Group();
  group.name = '3D coordinate frame';

  const axes = [
    { name: 'X', direction: new THREE.Vector3(1, 0, 0), color: 0xff5c7a },
    { name: 'Y', direction: new THREE.Vector3(0, 1, 0), color: 0x9bf06c },
    { name: 'Z', direction: new THREE.Vector3(0, 0, 1), color: 0x55a7ff },
  ];

  axes.forEach(({ name, direction, color }) => {
    const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(0, 0, 0), size, color, 0.7, 0.34);
    arrow.name = `${name} axis`;
    group.add(arrow);

    const label = createAxisLabel(name, color);
    label.position.copy(direction.clone().multiplyScalar(size + 0.9));
    group.add(label);
  });

  const grid = new THREE.GridHelper(size * 2, size * 2, 0x37526a, 0x1e3145);
  grid.name = 'XZ reference grid';
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  group.add(grid);

  return group;
}

function createAxisLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#050914';
  context.beginPath();
  context.arc(48, 48, 28, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.stroke();
  context.fillStyle = '#ffffff';
  context.font = '700 42px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 48, 47);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(1.1, 1.1, 1.1);
  sprite.name = `${text} axis label`;
  return sprite;
}
