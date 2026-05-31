import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const startButton = document.querySelector<HTMLButtonElement>("#start-button");
const assetStatus = document.querySelector<HTMLSpanElement>("#asset-status");

if (!canvas || !startButton || !assetStatus) {
  throw new Error("Forest walk failed to initialize.");
}

const sceneCanvas = canvas;
const enterButton = startButton;
const statusLabel = assetStatus;

const WORLD_DEPTH = 220;
const WORLD_WIDTH = 130;
const EYE_HEIGHT = 1.7;
const clock = new THREE.Clock();
const keys = new Set<string>();
const reusableForward = new THREE.Vector3();
const reusableRight = new THREE.Vector3();
const reusableBox = new THREE.Box3();
const reusableCenter = new THREE.Vector3();
const reusableSize = new THREE.Vector3();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: sceneCanvas,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7e9ab0);
scene.fog = new THREE.FogExp2(0x7e9ab0, 0.018);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, EYE_HEIGHT, 16);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.object);

const sun = new THREE.DirectionalLight(0xfff1cb, 2.6);
sun.position.set(-20, 34, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 105;
sun.shadow.camera.left = -56;
sun.shadow.camera.right = 56;
sun.shadow.camera.top = 56;
sun.shadow.camera.bottom = -56;
scene.add(sun);

const hemisphere = new THREE.HemisphereLight(0xc7e8ff, 0x19351f, 1.75);
scene.add(hemisphere);

const pathLight = new THREE.PointLight(0xcfe8d6, 1.6, 34, 1.8);
pathLight.position.set(0, 3.4, 10);
scene.add(pathLight);

createGround();
createTrail();
createLowPlants();
createDistantTreeSilhouettes();

const loader = new GLTFLoader();
loadForestAssets();

enterButton.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  enterButton.style.display = "none";
});

controls.addEventListener("unlock", () => {
  enterButton.style.display = "block";
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(render);

async function loadForestAssets(): Promise<void> {
  statusLabel.textContent = "模型加载中";

  try {
    const [treeModel, lavenderModel] = await Promise.all([
      loadNormalizedModel("/models/tree.glb", 8.4),
      loadNormalizedModel("/models/lavender.glb", 1.05)
    ]);

    scatterTrees(treeModel);
    scatterLavender(lavenderModel);
    statusLabel.textContent = "GLB 树木和薰衣草已加载";
  } catch (error) {
    console.error(error);
    statusLabel.textContent = "GLB 加载失败，保留基础森林";
  }
}

async function loadNormalizedModel(url: string, targetHeight: number): Promise<THREE.Group> {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (Array.isArray(child.material)) {
        child.material.forEach((material) => tuneMaterial(material));
      } else {
        tuneMaterial(child.material);
      }
    }
  });

  reusableBox.setFromObject(model);
  reusableBox.getSize(reusableSize);
  reusableBox.getCenter(reusableCenter);
  const height = Math.max(reusableSize.y, 0.001);
  const scale = targetHeight / height;

  model.position.sub(reusableCenter);
  model.position.y -= reusableBox.min.y - reusableCenter.y;
  model.scale.setScalar(scale);

  return model;
}

function tuneMaterial(material: THREE.Material): void {
  material.side = THREE.DoubleSide;

  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.roughness = Math.max(material.roughness, 0.72);
  }

  material.needsUpdate = true;
}

function scatterTrees(source: THREE.Group): void {
  const cluster = new THREE.Group();
  cluster.name = "glb-tree-forest";

  for (let i = 0; i < 30; i += 1) {
    const z = 2 - seededRange(i * 31 + 2, 8, WORLD_DEPTH);
    const side = seeded(i * 17 + 1) > 0.5 ? 1 : -1;
    const bend = pathBend(z);
    const x = bend + side * seededRange(i * 29 + 8, 10, 56);
    const tree = source.clone(true);
    const scale = seededRange(i * 37 + 12, 0.72, 1.45);

    tree.position.set(x, groundHeight(x, z), z);
    tree.rotation.y = seededRange(i * 41 + 4, -Math.PI, Math.PI);
    tree.scale.multiplyScalar(scale);
    cluster.add(tree);
  }

  scene.add(cluster);
}

function scatterLavender(source: THREE.Group): void {
  const patch = new THREE.Group();
  patch.name = "glb-lavender-patches";

  const featuredPositions = [
    new THREE.Vector3(-4.7, 0, 6),
    new THREE.Vector3(5.3, 0, 2),
    new THREE.Vector3(-6.4, 0, -6)
  ];

  featuredPositions.forEach((position, index) => {
    const lavender = source.clone(true);

    lavender.position.set(position.x, groundHeight(position.x, position.z), position.z);
    lavender.rotation.y = index * 1.7;
    lavender.scale.multiplyScalar(1.55);
    patch.add(lavender);
  });

  for (let i = 0; i < 46; i += 1) {
    const z = 0 - seededRange(i * 19 + 7, 4, WORLD_DEPTH - 10);
    const side = seeded(i * 13 + 9) > 0.5 ? 1 : -1;
    const bend = pathBend(z);
    const x = bend + side * seededRange(i * 23 + 6, 4.8, 18);
    const lavender = source.clone(true);
    const scale = seededRange(i * 43 + 3, 0.72, 1.35);

    lavender.position.set(x, groundHeight(x, z), z);
    lavender.rotation.y = seededRange(i * 47 + 5, -Math.PI, Math.PI);
    lavender.scale.multiplyScalar(scale);
    patch.add(lavender);
  }

  scene.add(patch);
}

function createGround(): void {
  const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH + 38, 90, 150);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i) - WORLD_DEPTH * 0.5 + 14;
    position.setY(i, groundHeight(x, z));
    position.setZ(i, z);
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x274d2c,
    roughness: 0.95,
    metalness: 0
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  scene.add(ground);
}

function createTrail(): void {
  const points: THREE.Vector3[] = [];
  const halfWidth = 3.4;
  const segmentCount = 130;

  for (let i = 0; i <= segmentCount; i += 1) {
    const z = 18 - (WORLD_DEPTH / segmentCount) * i;
    const center = pathBend(z);
    points.push(new THREE.Vector3(center - halfWidth, groundHeight(center, z) + 0.025, z));
    points.push(new THREE.Vector3(center + halfWidth, groundHeight(center, z) + 0.025, z));
  }

  const vertices: number[] = [];
  const indices: number[] = [];

  points.forEach((point) => {
    vertices.push(point.x, point.y, point.z);
  });

  for (let i = 0; i < segmentCount; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x6b5742,
    roughness: 0.98,
    metalness: 0
  });

  const trail = new THREE.Mesh(geometry, material);
  trail.receiveShadow = true;
  scene.add(trail);
}

function createLowPlants(): void {
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f7d35,
    roughness: 0.9,
    side: THREE.DoubleSide
  });
  const geometry = new THREE.PlaneGeometry(0.18, 1.2);

  for (let i = 0; i < 140; i += 1) {
    const z = 14 - seededRange(i * 29 + 1, 0, WORLD_DEPTH);
    const side = seeded(i * 11 + 5) > 0.5 ? 1 : -1;
    const x = pathBend(z) + side * seededRange(i * 37 + 8, 5.5, 46);
    const blade = new THREE.Mesh(geometry, grassMaterial);

    blade.position.set(x, groundHeight(x, z) + 0.55, z);
    blade.rotation.set(0, seededRange(i * 19 + 3, -Math.PI, Math.PI), seededRange(i * 23 + 7, -0.16, 0.16));
    blade.scale.setScalar(seededRange(i * 31 + 13, 0.65, 1.45));
    scene.add(blade);
  }
}

function createDistantTreeSilhouettes(): void {
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x24422c,
    roughness: 0.95
  });
  const crownMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c5637,
    roughness: 0.95
  });
  const trunkGeometry = new THREE.CylinderGeometry(0.32, 0.48, 8, 5);
  const crownGeometry = new THREE.IcosahedronGeometry(3.2, 1);

  for (let i = 0; i < 42; i += 1) {
    const z = -seededRange(i * 17 + 4, 40, WORLD_DEPTH);
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * seededRange(i * 23 + 6, 34, 62);
    const height = seededRange(i * 29 + 3, 8, 17);
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);

    trunk.scale.set(seededRange(i * 13 + 9, 0.8, 1.5), height / 8, seededRange(i * 11 + 12, 0.8, 1.4));
    trunk.position.y = height * 0.5;

    crown.scale.set(
      seededRange(i * 31 + 6, 1.1, 2.3),
      seededRange(i * 37 + 7, 0.72, 1.45),
      seededRange(i * 41 + 8, 1.0, 2.0)
    );
    crown.position.set(
      seededRange(i * 19 + 10, -1.5, 1.5),
      height + seededRange(i * 43 + 11, 1.8, 3.8),
      seededRange(i * 47 + 12, -1.5, 1.5)
    );

    group.add(trunk, crown);
    group.position.set(x, groundHeight(x, z), z);
    group.rotation.y = seededRange(i * 53 + 13, -0.7, 0.7);
    scene.add(group);
  }
}

function render(): void {
  const delta = Math.min(clock.getDelta(), 0.04);

  if (controls.isLocked) {
    updateMovement(delta);
  }

  const t = clock.elapsedTime;
  pathLight.position.set(camera.position.x, camera.position.y + 1.2, camera.position.z - 2.5);
  pathLight.intensity = 1.25 + Math.sin(t * 2.1) * 0.14;
  renderer.render(scene, camera);
}

function updateMovement(delta: number): void {
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 10 : 5.6;
  const object = controls.object;

  reusableForward.set(0, 0, -1).applyQuaternion(object.quaternion);
  reusableForward.y = 0;
  reusableForward.normalize();

  reusableRight.set(1, 0, 0).applyQuaternion(object.quaternion);
  reusableRight.y = 0;
  reusableRight.normalize();

  const step = speed * delta;

  if (keys.has("KeyW")) {
    object.position.addScaledVector(reusableForward, step);
  }
  if (keys.has("KeyS")) {
    object.position.addScaledVector(reusableForward, -step);
  }
  if (keys.has("KeyD")) {
    object.position.addScaledVector(reusableRight, step);
  }
  if (keys.has("KeyA")) {
    object.position.addScaledVector(reusableRight, -step);
  }

  object.position.x = THREE.MathUtils.clamp(object.position.x, -WORLD_WIDTH * 0.46, WORLD_WIDTH * 0.46);
  object.position.z = THREE.MathUtils.clamp(object.position.z, -WORLD_DEPTH + 8, 18);
  object.position.y = groundHeight(object.position.x, object.position.z) + EYE_HEIGHT;
}

function groundHeight(x: number, z: number): number {
  return Math.sin(x * 0.11 + z * 0.035) * 0.18 + Math.cos(z * 0.07) * 0.12;
}

function pathBend(z: number): number {
  return Math.sin(z * 0.045) * 3.2 + Math.sin(z * 0.012) * 4.3;
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function seededRange(seed: number, min: number, max: number): number {
  return min + (max - min) * seeded(seed);
}
