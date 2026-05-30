import * as THREE from 'three';
import type { CircleCollider } from '../collision';

export interface GrassPatch {
  group: THREE.Group;
  colliders: CircleCollider[];
  cutNear(position: THREE.Vector3, yaw: number): number;
  remaining(): number;
}

export function createGrassPatch(): GrassPatch {
  const group = new THREE.Group();
  const count = 84;
  const geometry = new THREE.ConeGeometry(0.13, 1.8, 5);
  const material = new THREE.MeshStandardMaterial({ color: '#496d32', roughness: 0.86 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const colliders: CircleCollider[] = [];
  const cut = new Set<number>();

  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / 12);
    const col = i % 12;
    const x = (col - 5.5) * 0.72 + (random(i + 4) - 0.5) * 0.32;
    const z = -5.2 - row * 0.55 + (random(i + 14) - 0.5) * 0.18;
    const scale = THREE.MathUtils.lerp(0.8, 1.25, random(i + 24));
    dummy.position.set(x, 0.9 * scale, z);
    dummy.rotation.set((random(i + 34) - 0.5) * 0.25, random(i + 44) * Math.PI, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    colliders.push({ x, z, radius: 0.34, kind: 'grass' });
  }

  group.add(mesh);
  return {
    group,
    colliders,
    cutNear(position: THREE.Vector3, yaw: number): number {
      let cutCount = 0;
      const forward = new THREE.Vector2(-Math.sin(yaw), -Math.cos(yaw));
      colliders.forEach((collider, index) => {
        if (collider.disabled) {
          return;
        }

        const toGrass = new THREE.Vector2(collider.x - position.x, collider.z - position.z);
        const distance = toGrass.length();
        if (distance > 1.65 || distance < 0.05) {
          return;
        }

        const dot = forward.dot(toGrass.normalize());
        if (dot < 0.45) {
          return;
        }

        collider.disabled = true;
        cut.add(index);
        dummy.position.set(collider.x, 0.05, collider.z);
        dummy.rotation.set(Math.PI * 0.5, yaw, 0);
        dummy.scale.set(1, 0.05, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        cutCount += 1;
      });
      mesh.instanceMatrix.needsUpdate = true;
      return cutCount;
    },
    remaining(): number {
      return count - cut.size;
    },
  };
}

function random(seed: number): number {
  const value = Math.sin(seed * 91.17 + 17.3) * 10000;
  return value - Math.floor(value);
}
