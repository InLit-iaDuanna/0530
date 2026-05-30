import * as THREE from 'three';

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
  kind?: 'wall' | 'tree' | 'grass';
  disabled?: boolean;
}

export const PLAYER_RADIUS = 0.38;

export function resolveWorldCollisions(
  position: THREE.Vector3,
  colliders: CircleCollider[],
  onHit?: (collider: CircleCollider) => void,
): boolean {
  let hit = false;

  for (const collider of colliders) {
    if (collider.disabled) {
      continue;
    }

    const dx = position.x - collider.x;
    const dz = position.z - collider.z;
    const minimum = collider.radius + PLAYER_RADIUS;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq > minimum * minimum || distanceSq < 0.0001) {
      continue;
    }

    const distance = Math.sqrt(distanceSq);
    position.x = collider.x + (dx / distance) * minimum;
    position.z = collider.z + (dz / distance) * minimum;
    hit = true;
    onHit?.(collider);
  }

  return hit;
}

export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material?.dispose();
    }
  });
}
