import * as THREE from 'three';
import type { ChaseSnapshot } from '../game/chase-ai';

export class Chaser {
  readonly group = new THREE.Group();
  private readonly leftLeg: THREE.Mesh;
  private readonly rightLeg: THREE.Mesh;
  private readonly leftArm: THREE.Mesh;
  private readonly rightArm: THREE.Mesh;
  private readonly shadow: THREE.Mesh;

  constructor() {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xd9dde8,
      roughness: 0.72,
      metalness: 0.05,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d1018,
      roughness: 0.9,
    });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.72, 6, 12), bodyMaterial);
    body.position.y = 1.0;
    this.group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), bodyMaterial);
    head.position.y = 1.62;
    this.group.add(head);

    this.leftLeg = limb(0.16, 0.66, bodyMaterial);
    this.rightLeg = limb(0.16, 0.66, bodyMaterial);
    this.leftLeg.position.set(-0.18, 0.38, 0);
    this.rightLeg.position.set(0.18, 0.38, 0);
    this.group.add(this.leftLeg, this.rightLeg);

    this.leftArm = limb(0.12, 0.62, accentMaterial);
    this.rightArm = limb(0.12, 0.62, accentMaterial);
    this.leftArm.position.set(-0.48, 1.08, 0);
    this.rightArm.position.set(0.48, 1.08, 0);
    this.group.add(this.leftArm, this.rightArm);

    const outline = this.group.clone(true);
    outline.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshBasicMaterial({
          color: 0x05060a,
          side: THREE.BackSide,
        });
        child.scale.multiplyScalar(1.08);
      }
    });
    this.group.add(outline);

    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4f5f,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.18, 2.6, 16), beaconMaterial);
    beacon.position.y = 3.05;
    this.group.add(beacon);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4f5f }),
    );
    ring.position.y = 4.4;
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.group.add(this.shadow);
  }

  update(snapshot: ChaseSnapshot, yaw: number, elapsed: number): void {
    this.group.position.set(snapshot.chaser.x, 0, snapshot.chaser.z);
    this.group.lookAt(snapshot.player.x, 0.4, snapshot.player.z);

    const cycle = elapsed * 8 + snapshot.speed;
    const swing = Math.sin(cycle) * 0.48;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.8;
    this.rightArm.rotation.x = swing * 0.8;

    this.group.scale.setScalar(1);
    this.shadow.scale.setScalar(THREE.MathUtils.clamp(2 / snapshot.distance, 0.45, 1.1));
  }
}

function limb(width: number, height: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, width);
  geometry.translate(0, -height / 2, 0);
  return new THREE.Mesh(geometry, material);
}
