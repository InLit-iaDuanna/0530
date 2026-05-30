import * as THREE from 'three';

export function createBear(): THREE.Group {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: '#2c211c', roughness: 0.9 });
  const snout = new THREE.MeshStandardMaterial({ color: '#4a392d', roughness: 0.88 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 12), fur);
  body.scale.set(1.25, 0.92, 1.75);
  body.position.y = 0.86;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), fur);
  head.position.set(0, 1.35, -0.82);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), snout);
  nose.position.set(0, 1.28, -1.18);
  group.add(body, head, nose);

  for (const x of [-0.45, 0.45]) {
    for (const z of [-0.55, 0.52]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.7, 8), fur);
      leg.position.set(x, 0.36, z);
      group.add(leg);
    }
  }

  return group;
}
