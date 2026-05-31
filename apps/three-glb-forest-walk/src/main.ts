import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import "./style.css";

type SceneMode = "day" | "night";

type Theme = {
  ambient: number;
  background: number;
  fog: number;
  fogDensity: number;
  ground: number;
  path: number;
  sun: number;
  sunIntensity: number;
  moonIntensity: number;
  fillIntensity: number;
  fireflyOpacity: number;
};

const themes: Record<SceneMode, Theme> = {
  day: {
    ambient: 0xe7f5dd,
    background: 0x97b8c7,
    fog: 0xaac3bf,
    fogDensity: 0.012,
    ground: 0x426b36,
    path: 0x9a7a50,
    sun: 0xffefbd,
    sunIntensity: 3.4,
    moonIntensity: 0,
    fillIntensity: 0.7,
    fireflyOpacity: 0
  },
  night: {
    ambient: 0x17283e,
    background: 0x07111e,
    fog: 0x17283b,
    fogDensity: 0.021,
    ground: 0x17321f,
    path: 0x433727,
    sun: 0x9db9ff,
    sunIntensity: 0.25,
    moonIntensity: 2.7,
    fillIntensity: 1.65,
    fireflyOpacity: 1
  }
};

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const enterButton = document.querySelector<HTMLButtonElement>("#enter-button");
const dayButton = document.querySelector<HTMLButtonElement>("#day-button");
const nightButton = document.querySelector<HTMLButtonElement>("#night-button");
const assetStatus = document.querySelector<HTMLDivElement>("#asset-status");

if (!canvas || !enterButton || !dayButton || !nightButton || !assetStatus) {
  throw new Error("Light forest walk failed to initialize.");
}

const sceneCanvas = canvas;
const enterControl = enterButton;
const dayControl = dayButton;
const nightControl = nightButton;
const statusLabel = assetStatus;

const WORLD_WIDTH = 130;
const WORLD_DEPTH = 230;
const EYE_HEIGHT = 1.72;
const clock = new THREE.Clock();
const keys = new Set<string>();
const tempBox = new THREE.Box3();
const tempCenter = new THREE.Vector3();
const tempSize = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

let sceneMode: SceneMode = "day";

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
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, EYE_HEIGHT, 18);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.object);

const hemisphere = new THREE.HemisphereLight(themes.day.ambient, 0x1a2e1f, 1.35);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(themes.day.sun, themes.day.sunIntensity);
sun.position.set(-22, 34, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = -58;
sun.shadow.camera.right = 58;
sun.shadow.camera.top = 58;
sun.shadow.camera.bottom = -58;
scene.add(sun);

const moon = new THREE.DirectionalLight(0xb8c9ff, 0);
moon.position.set(20, 28, -16);
scene.add(moon);

const lantern = new THREE.PointLight(0xb9d7ff, themes.day.fillIntensity, 42, 1.8);
lantern.position.set(0, 3.2, 10);
scene.add(lantern);

const groundMaterial = new THREE.MeshStandardMaterial({
  color: themes.day.ground,
  roughness: 0.95,
  metalness: 0
});
const pathMaterial = new THREE.MeshStandardMaterial({
  color: themes.day.path,
  roughness: 0.98,
  metalness: 0
});
const grassMaterial = new THREE.MeshStandardMaterial({
  color: 0x5f8b3c,
  roughness: 0.9,
  side: THREE.DoubleSide
});
const stoneMaterial = new THREE.MeshStandardMaterial({
  color: 0x667060,
  roughness: 0.92
});
const fireflyMaterial = new THREE.PointsMaterial({
  blending: THREE.AdditiveBlending,
  color: 0xf5e889,
  depthWrite: false,
  transparent: true,
  opacity: 0,
  size: 0.18,
  sizeAttenuation: true
});

createGround();
createPath();
createGrass();
createStones();
const fireflies = createFireflies();
applyTheme("day");
loadTrees();

enterControl.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  enterControl.style.display = "none";
});

controls.addEventListener("unlock", () => {
  enterControl.style.display = "block";
});

dayControl.addEventListener("click", () => {
  applyTheme("day");
});

nightControl.addEventListener("click", () => {
  applyTheme("night");
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

async function loadTrees(): Promise<void> {
  statusLabel.textContent = "树木加载中";

  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync("/models/tree.glb");
    const tree = normalizeTree(gltf.scene, 8.8);
    scatterTreeClones(tree);
    statusLabel.textContent = "树木已加载";
  } catch (error) {
    console.error(error);
    statusLabel.textContent = "树木加载失败";
    createFallbackTrees();
  }
}

function normalizeTree(model: THREE.Group, targetHeight: number): THREE.Group {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (Array.isArray(child.material)) {
        child.material.forEach(tuneMaterial);
      } else {
        tuneMaterial(child.material);
      }
    }
  });

  tempBox.setFromObject(model);
  tempBox.getCenter(tempCenter);
  tempBox.getSize(tempSize);

  const scale = targetHeight / Math.max(tempSize.y, 0.001);
  model.position.sub(tempCenter);
  model.position.y -= tempBox.min.y - tempCenter.y;
  model.scale.setScalar(scale);

  return model;
}

function tuneMaterial(material: THREE.Material): void {
  material.side = THREE.DoubleSide;

  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.roughness = Math.max(material.roughness, 0.78);
  }

  material.needsUpdate = true;
}

function scatterTreeClones(source: THREE.Group): void {
  const trees = new THREE.Group();
  trees.name = "lightweight-tree-forest";

  for (let i = 0; i < 64; i += 1) {
    const z = 10 - seededRange(i * 29 + 7, 6, WORLD_DEPTH);
    const side = seeded(i * 17 + 3) > 0.5 ? 1 : -1;
    const x = pathBend(z) + side * seededRange(i * 31 + 11, 9, 55);
    const tree = source.clone(true);
    const scale = seededRange(i * 23 + 5, 0.72, 1.55);

    tree.position.set(x, groundHeight(x, z), z);
    tree.rotation.y = seededRange(i * 37 + 13, -Math.PI, Math.PI);
    tree.scale.multiplyScalar(scale);
    trees.add(tree);
  }

  scene.add(trees);
}

function createFallbackTrees(): void {
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4c3424, roughness: 0.9 });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x2f6737, roughness: 0.88 });
  const trunkGeometry = new THREE.CylinderGeometry(0.35, 0.52, 7, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(3.8, 1);

  for (let i = 0; i < 54; i += 1) {
    const z = 10 - seededRange(i * 29 + 7, 6, WORLD_DEPTH);
    const side = seeded(i * 17 + 3) > 0.5 ? 1 : -1;
    const x = pathBend(z) + side * seededRange(i * 31 + 11, 9, 55);
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);

    trunk.position.y = 3.5;
    crown.position.y = 8;
    crown.scale.set(1.25, 0.88, 1.25);
    group.add(trunk, crown);
    group.position.set(x, groundHeight(x, z), z);
    scene.add(group);
  }
}

function createGround(): void {
  const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH + 42, 90, 150);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i) - WORLD_DEPTH * 0.5 + 16;
    position.setY(i, groundHeight(x, z));
    position.setZ(i, z);
  }
  geometry.computeVertexNormals();

  const ground = new THREE.Mesh(geometry, groundMaterial);
  ground.receiveShadow = true;
  scene.add(ground);
}

function createPath(): void {
  const halfWidth = 3.45;
  const segmentCount = 142;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segmentCount; i += 1) {
    const z = 18 - (WORLD_DEPTH / segmentCount) * i;
    const center = pathBend(z);
    const left = center - halfWidth - Math.sin(i * 0.24) * 0.35;
    const rightEdge = center + halfWidth + Math.cos(i * 0.18) * 0.3;

    vertices.push(left, groundHeight(left, z) + 0.035, z);
    vertices.push(rightEdge, groundHeight(rightEdge, z) + 0.035, z);
  }

  for (let i = 0; i < segmentCount; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const path = new THREE.Mesh(geometry, pathMaterial);
  path.receiveShadow = true;
  scene.add(path);
}

function createGrass(): void {
  const geometry = new THREE.PlaneGeometry(0.18, 1.35);

  for (let i = 0; i < 210; i += 1) {
    const z = 15 - seededRange(i * 19 + 2, 0, WORLD_DEPTH);
    const side = seeded(i * 13 + 8) > 0.5 ? 1 : -1;
    const x = pathBend(z) + side * seededRange(i * 41 + 3, 4.8, 57);
    const grass = new THREE.Mesh(geometry, grassMaterial);

    grass.position.set(x, groundHeight(x, z) + 0.58, z);
    grass.rotation.set(
      seededRange(i * 11 + 4, -0.1, 0.1),
      seededRange(i * 17 + 6, -Math.PI, Math.PI),
      seededRange(i * 23 + 9, -0.18, 0.18)
    );
    grass.scale.setScalar(seededRange(i * 29 + 12, 0.55, 1.4));
    scene.add(grass);
  }
}

function createStones(): void {
  const geometry = new THREE.DodecahedronGeometry(1, 0);

  for (let i = 0; i < 42; i += 1) {
    const z = 14 - seededRange(i * 31 + 6, 0, WORLD_DEPTH);
    const side = seeded(i * 13 + 5) > 0.5 ? 1 : -1;
    const x = pathBend(z) + side * seededRange(i * 17 + 9, 4.5, 30);
    const stone = new THREE.Mesh(geometry, stoneMaterial);
    const scale = seededRange(i * 23 + 11, 0.22, 0.86);

    stone.position.set(x, groundHeight(x, z) + scale * 0.32, z);
    stone.rotation.set(
      seededRange(i * 19 + 2, -0.7, 0.7),
      seededRange(i * 29 + 4, -Math.PI, Math.PI),
      seededRange(i * 37 + 8, -0.7, 0.7)
    );
    stone.scale.set(scale * 1.5, scale * 0.6, scale);
    stone.castShadow = true;
    stone.receiveShadow = true;
    scene.add(stone);
  }
}

function createFireflies(): THREE.Points {
  const count = 90;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const z = 10 - seededRange(i * 31 + 1, 8, WORLD_DEPTH - 18);
    const side = seeded(i * 17 + 2) > 0.5 ? 1 : -1;
    const x = pathBend(z) + side * seededRange(i * 23 + 4, 5, 38);
    positions[i * 3] = x;
    positions[i * 3 + 1] = seededRange(i * 29 + 6, 1.2, 5.6);
    positions[i * 3 + 2] = z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, fireflyMaterial);
  scene.add(points);
  return points;
}

function applyTheme(mode: SceneMode): void {
  sceneMode = mode;
  const theme = themes[mode];

  scene.background = new THREE.Color(theme.background);
  scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);
  hemisphere.color.setHex(theme.ambient);
  sun.color.setHex(theme.sun);
  sun.intensity = theme.sunIntensity;
  moon.intensity = theme.moonIntensity;
  lantern.intensity = theme.fillIntensity;
  groundMaterial.color.setHex(theme.ground);
  pathMaterial.color.setHex(theme.path);
  fireflyMaterial.opacity = theme.fireflyOpacity;
  fireflyMaterial.needsUpdate = true;
  document.body.dataset.mode = mode;
  dayControl.setAttribute("aria-pressed", String(mode === "day"));
  nightControl.setAttribute("aria-pressed", String(mode === "night"));
}

function render(): void {
  const delta = Math.min(clock.getDelta(), 0.04);

  if (controls.isLocked) {
    updateMovement(delta);
  }

  const elapsed = clock.elapsedTime;
  lantern.position.set(camera.position.x, camera.position.y + 1.1, camera.position.z - 2.8);
  lantern.intensity = themes[sceneMode].fillIntensity + Math.sin(elapsed * 1.8) * 0.08;
  animateFireflies(elapsed);
  renderer.render(scene, camera);
}

function animateFireflies(elapsed: number): void {
  if (sceneMode !== "night") {
    return;
  }

  const positions = fireflies.geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const base = seeded(i * 19 + 9);
    positions.setY(i, seededRange(i * 29 + 6, 1.2, 5.6) + Math.sin(elapsed * 1.4 + base * 8) * 0.28);
  }
  positions.needsUpdate = true;
}

function updateMovement(delta: number): void {
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 9.4 : 5.2;
  const object = controls.object;

  forward.set(0, 0, -1).applyQuaternion(object.quaternion);
  forward.y = 0;
  forward.normalize();

  right.set(1, 0, 0).applyQuaternion(object.quaternion);
  right.y = 0;
  right.normalize();

  const step = speed * delta;

  if (keys.has("KeyW")) {
    object.position.addScaledVector(forward, step);
  }
  if (keys.has("KeyS")) {
    object.position.addScaledVector(forward, -step);
  }
  if (keys.has("KeyD")) {
    object.position.addScaledVector(right, step);
  }
  if (keys.has("KeyA")) {
    object.position.addScaledVector(right, -step);
  }

  object.position.x = THREE.MathUtils.clamp(object.position.x, -WORLD_WIDTH * 0.46, WORLD_WIDTH * 0.46);
  object.position.z = THREE.MathUtils.clamp(object.position.z, -WORLD_DEPTH + 10, 18);
  object.position.y = groundHeight(object.position.x, object.position.z) + EYE_HEIGHT;
}

function groundHeight(x: number, z: number): number {
  return Math.sin(x * 0.09 + z * 0.035) * 0.2 + Math.cos(z * 0.058) * 0.14;
}

function pathBend(z: number): number {
  return Math.sin(z * 0.044) * 3.6 + Math.sin(z * 0.013) * 4.2;
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function seededRange(seed: number, min: number, max: number): number {
  return min + (max - min) * seeded(seed);
}
