import * as THREE from 'three';
import type { CircleCollider } from '../collision';
import { getWallCells, gridToWorld, type MazeLayout } from './maze-grid';

export function createCaveMaze(layout: MazeLayout): {
  group: THREE.Group;
  colliders: CircleCollider[];
  exit: THREE.Vector3;
  start: THREE.Vector3;
} {
  const group = new THREE.Group();
  const wallCells = getWallCells(layout);
  const colliders: CircleCollider[] = [];
  const wallGeometry = new THREE.BoxGeometry(layout.cellSize, layout.wallHeight, layout.cellSize);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#4a514d',
    roughness: 0.95,
    metalness: 0.02,
    emissive: '#080705',
    emissiveIntensity: 0.08,
  });
  const walls = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCells.length);
  const dummy = new THREE.Object3D();

  wallCells.forEach((cell, index) => {
    const [x, y, z] = gridToWorld(layout, cell, layout.wallHeight / 2 - 0.05);
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    walls.setMatrixAt(index, dummy.matrix);
    colliders.push({ x, z, radius: layout.cellSize * 0.62, kind: 'wall' });
  });
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(layout.cols * layout.cellSize, layout.rows * layout.cellSize),
    new THREE.MeshStandardMaterial({
      color: '#22231f',
      roughness: 1,
      emissive: '#060504',
      emissiveIntensity: 0.06,
    }),
  );
  floor.rotation.x = -Math.PI * 0.5;
  floor.receiveShadow = true;
  group.add(floor);

  const [exitX, , exitZ] = gridToWorld(layout, layout.exit, 0);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.82, 32),
    new THREE.MeshBasicMaterial({ color: '#f2d98a', side: THREE.DoubleSide }),
  );
  marker.position.set(exitX, 0.025, exitZ);
  marker.rotation.x = -Math.PI * 0.5;
  group.add(marker);

  const [startX, , startZ] = gridToWorld(layout, layout.start, 0);
  return {
    group,
    colliders,
    exit: new THREE.Vector3(exitX, 1.45, exitZ),
    start: new THREE.Vector3(startX, 1.45, startZ),
  };
}
