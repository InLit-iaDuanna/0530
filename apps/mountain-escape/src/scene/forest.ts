import * as THREE from 'three';
import type { CircleCollider } from '../collision';

export function createForest(options: {
  count: number;
  radius: number;
  clearingRadius: number;
  seed: number;
  dark?: boolean;
}): { group: THREE.Group; colliders: CircleCollider[] } {
  const group = new THREE.Group();
  const colliders: CircleCollider[] = [];
  const trunkGeometry = new THREE.CylinderGeometry(0.28, 0.42, 2.4, 10);
  const crownGeometry = new THREE.ConeGeometry(1.05, 2.2, 12, 2);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: options.dark ? '#2f2119' : '#4b3427',
    roughness: 0.92,
  });
  const crownMaterial = new THREE.MeshStandardMaterial({
    color: options.dark ? '#102016' : '#193923',
    roughness: 0.9,
  });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, options.count);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, options.count);
  const dummy = new THREE.Object3D();

  let placed = 0;
  for (let i = 0; placed < options.count && i < options.count * 6; i += 1) {
    const angle = random(options.seed + i * 3) * Math.PI * 2;
    const radius = Math.sqrt(random(options.seed + i * 7)) * options.radius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.hypot(x, z) < options.clearingRadius) {
      continue;
    }

    const scale = THREE.MathUtils.lerp(0.82, 1.35, random(options.seed + i * 11));
    dummy.position.set(x, 1.2 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.rotation.y = random(options.seed + i * 13) * Math.PI;
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);

    dummy.position.set(x, 3.0 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    crowns.setMatrixAt(placed, dummy.matrix);
    colliders.push({ x, z, radius: 0.48 * scale, kind: 'tree' });
    placed += 1;
  }

  trunks.count = placed;
  crowns.count = placed;
  trunks.castShadow = true;
  crowns.castShadow = true;
  group.add(trunks, crowns);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(options.radius * 2.4, options.radius * 2.4),
    new THREE.MeshStandardMaterial({ color: options.dark ? '#14100d' : '#1f2d1e', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI * 0.5;
  ground.receiveShadow = true;
  group.add(ground);

  return { group, colliders };
}

function random(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}
