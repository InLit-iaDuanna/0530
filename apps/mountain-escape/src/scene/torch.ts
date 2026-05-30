import * as THREE from 'three';

export interface Torch {
  group: THREE.Group;
  light: THREE.PointLight;
  beam: THREE.SpotLight;
  flames: THREE.Mesh[];
  update(time: number): void;
}

export function createHandTorch(): Torch {
  const group = new THREE.Group();
  const flames: THREE.Mesh[] = [];
  group.position.set(1.05, -1.04, -1.42);
  group.rotation.set(-0.42, 0.24, -0.24);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.08, 1.22, 10),
    new THREE.MeshStandardMaterial({ color: '#5a3928', roughness: 0.86, metalness: 0.02 }),
  );
  handle.position.y = -0.36;
  handle.rotation.z = 0.1;
  group.add(handle);

  const wrapMaterial = new THREE.MeshStandardMaterial({ color: '#2a211b', roughness: 0.92 });
  for (let i = 0; i < 4; i += 1) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.01, 6, 18), wrapMaterial);
    wrap.position.y = THREE.MathUtils.lerp(0.06, 0.3, i / 3);
    wrap.rotation.x = Math.PI * 0.5;
    group.add(wrap);
  }

  const coal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.08, 0.2, 12),
    new THREE.MeshStandardMaterial({
      color: '#18110d',
      roughness: 0.78,
      emissive: '#5b1708',
      emissiveIntensity: 0.35,
    }),
  );
  coal.position.y = 0.36;
  group.add(coal);

  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.52, 14, 1),
    new THREE.MeshBasicMaterial({
      color: '#ff7b1f',
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  flameOuter.position.y = 0.75;
  flameOuter.position.z = -0.04;
  group.add(flameOuter);
  flames.push(flameOuter);

  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.38, 12, 1),
    new THREE.MeshBasicMaterial({
      color: '#ffe0a4',
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    }),
  );
  flameInner.position.y = 0.68;
  flameInner.position.z = -0.05;
  flameInner.rotation.y = 0.6;
  group.add(flameInner);
  flames.push(flameInner);

  const light = new THREE.PointLight('#ff9b42', 14, 7.5, 1.4);
  light.position.set(0, 0.74, 0);
  group.add(light);

  const beam = new THREE.SpotLight('#ffbd6b', 9, 12, Math.PI * 0.22, 0.65, 1.2);
  beam.position.set(0, 0.64, 0);
  beam.target.position.set(0, 0.2, -5);
  group.add(beam, beam.target);

  return {
    group,
    light,
    beam,
    flames,
    update(time: number): void {
      const flicker = 0.72 + Math.sin(time * 19.4) * 0.13 + Math.sin(time * 31.7) * 0.08;
      light.intensity = THREE.MathUtils.lerp(10.5, 16.2, flicker);
      beam.intensity = THREE.MathUtils.lerp(7.2, 12.8, flicker);
      group.position.y = -1.04 + Math.sin(time * 2.2) * 0.018;
      group.rotation.z = -0.24 + Math.sin(time * 3.1) * 0.025;
      flames.forEach((flame, index) => {
        const scale =
          0.9 + Math.sin(time * (16 + index * 3.5)) * 0.12 + Math.sin(time * 27.3 + index) * 0.06;
        flame.scale.set(1 + (scale - 1) * 0.45, scale, 1 + (scale - 1) * 0.28);
        flame.rotation.y += 0.035 + index * 0.012;
      });
    },
  };
}
