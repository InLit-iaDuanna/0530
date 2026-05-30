import * as THREE from "three";
import "./style.css";

const FOREST_SIZE = 760;
const TERRAIN_SEGMENTS = 136;
const TREE_COUNT = 540;
const BRANCH_LIMIT = 1700;
const ROCK_COUNT = 135;
const LOG_COUNT = 34;
const EYE_HEIGHT = 4.2;
const WALK_SPEED = 18;
const RUN_SPEED = 31;
const START_X = 14;
const START_Z = 12;
const CLEARING_RADIUS = 32;
const CAVE_ENTRANCE_X = 10;
const CAVE_ENTRANCE_Z = -46;
const CAVE_LENGTH = 138;
const CAVE_WIDTH = 18;
const CAVE_HEIGHT = 16;
const CAVE_CLEAR_RADIUS = 44;
const CAVE_COLLIDER_COUNT = 36;
const CAVE_WALL_DETAIL_COUNT = 150;
const CAVE_STALACTITE_COUNT = 44;
const CAVE_FLOOR_STONE_COUNT = 70;
const PLAYER_RADIUS = 0.72;

type CircleCollider = { x: number; z: number; radius: number };

const canvas = document.querySelector<HTMLCanvasElement>("#forest-canvas")!;
const enterButton = document.querySelector<HTMLButtonElement>("#enter-button")!;
const torchBrightnessInput = document.querySelector<HTMLInputElement>("#torch-brightness")!;
const torchBrightnessValue = document.querySelector<HTMLOutputElement>("#torch-brightness-value")!;

if (!canvas || !enterButton || !torchBrightnessInput || !torchBrightnessValue) {
  throw new Error("Night forest failed to initialize.");
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const textureLoader = new THREE.TextureLoader();

const scene = new THREE.Scene();
scene.background = new THREE.Color("#071018");
scene.fog = new THREE.FogExp2("#09141b", 0.0095);

const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 520);
camera.position.set(START_X, EYE_HEIGHT + sampleHeight(START_X, START_Z), START_Z);
camera.rotation.order = "YXZ";
scene.add(camera);

const keyState = new Set<string>();
const worldColliders: CircleCollider[] = [];
const torchFlames: THREE.Mesh[] = [];
let yaw = 0;
let pitch = 0;
let walkingActive = false;
let draggingLook = false;
let torchBrightness = 1;

const moonLight = new THREE.DirectionalLight("#c9ddff", 2.18);
moonLight.position.set(-80, 120, -90);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
moonLight.shadow.camera.near = 20;
moonLight.shadow.camera.far = 360;
moonLight.shadow.camera.left = -140;
moonLight.shadow.camera.right = 140;
moonLight.shadow.camera.top = 140;
moonLight.shadow.camera.bottom = -140;
scene.add(moonLight);

const hemisphere = new THREE.HemisphereLight("#5c789d", "#13140c", 0.68);
scene.add(hemisphere);

const torchLight = new THREE.PointLight("#ff9f42", 16, 68, 1.18);
torchLight.position.set(1.05, -0.86, -1.32);
torchLight.castShadow = true;
torchLight.shadow.mapSize.set(512, 512);
torchLight.shadow.bias = -0.00008;
camera.add(torchLight);

const torchBeam = new THREE.SpotLight("#ffd19a", 14, 108, Math.PI * 0.36, 0.82, 1.25);
torchBeam.position.set(0.82, -0.74, -1.2);
torchBeam.target.position.set(0.14, -0.34, -7.8);
torchBeam.castShadow = true;
torchBeam.shadow.mapSize.set(512, 512);
torchBeam.shadow.bias = -0.00008;
camera.add(torchBeam);
camera.add(torchBeam.target);

const torch = createHandTorch();
camera.add(torch);

const terrain = new THREE.Mesh(
  createTerrainGeometry(),
  new THREE.MeshStandardMaterial({
    roughness: 0.96,
    metalness: 0.02,
    vertexColors: true,
    map: createGroundTexture()
  })
);
terrain.receiveShadow = true;
scene.add(terrain);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(10, 32, 16),
  new THREE.MeshBasicMaterial({ color: "#d9e7ff" })
);
moon.position.copy(moonLight.position).normalize().multiplyScalar(420);
scene.add(moon);

const starField = createStarField();
scene.add(starField);

const lowMist = createMistLayer();
scene.add(lowMist);

const cave = createCaveScene();
scene.add(cave);

createForest();
setTorchBrightness(Number(torchBrightnessInput.value));

enterButton.addEventListener("click", enterForest);
canvas.addEventListener("click", enterForest);
torchBrightnessInput.addEventListener("input", () => {
  setTorchBrightness(Number(torchBrightnessInput.value));
});

torchBrightnessInput.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

canvas.addEventListener("pointerdown", () => {
  draggingLook = walkingActive && document.pointerLockElement !== canvas;
});

window.addEventListener("pointerup", () => {
  draggingLook = false;
});

window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas && !draggingLook) {
    return;
  }

  yaw -= event.movementX * 0.0022;
  pitch -= event.movementY * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI * 0.46, Math.PI * 0.46);
  camera.rotation.set(pitch, yaw, 0);
});

document.addEventListener("pointerlockchange", () => {
  walkingActive = document.pointerLockElement === canvas || walkingActive;
  enterButton.hidden = walkingActive;
});

window.addEventListener("keydown", (event) => {
  keyState.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keyState.delete(event.code);
});

window.addEventListener("resize", resize);

let headBob = 0;
let previousTime = performance.now();

function seededRandom(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function smoothNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = seededRandom(ix * 17.3 + iz * 23.1 + seed);
  const b = seededRandom((ix + 1) * 17.3 + iz * 23.1 + seed);
  const c = seededRandom(ix * 17.3 + (iz + 1) * 23.1 + seed);
  const d = seededRandom((ix + 1) * 17.3 + (iz + 1) * 23.1 + seed);

  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, ux), THREE.MathUtils.lerp(c, d, ux), uz);
}

function fbm(x: number, z: number, octaves: number, seed: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let value = 0;
  let total = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += smoothNoise(x * frequency, z * frequency, seed + i * 19.17) * amplitude;
    total += amplitude;
    amplitude *= 0.52;
    frequency *= 2.05;
  }

  return value / total;
}

function sampleTerrainHeight(x: number, z: number): number {
  const broad = fbm(x * 0.008, z * 0.008, 5, 9.2) - 0.5;
  const detail = fbm(x * 0.038, z * 0.038, 4, 51.7) - 0.5;
  const ridge = Math.abs(fbm(x * 0.015, z * 0.015, 3, 81.3) - 0.5);
  return broad * 15 + detail * 2.7 - ridge * 5.2;
}

function sampleHeight(x: number, z: number): number {
  const terrainHeight = sampleTerrainHeight(x, z);
  const cave = getCaveLocal(x, z);

  if (cave.progress < -0.18 || cave.progress > 1.04 || cave.distance > CAVE_WIDTH * 0.92) {
    return terrainHeight;
  }

  const floorHeight = sampleCaveFloor(cave.progress);
  const edgeFade = 1 - THREE.MathUtils.smoothstep(cave.distance, CAVE_WIDTH * 0.58, CAVE_WIDTH * 0.92);
  const entranceFade = THREE.MathUtils.smoothstep(cave.progress, -0.18, 0.08);
  const blend = edgeFade * entranceFade;
  return THREE.MathUtils.lerp(terrainHeight, floorHeight, blend);
}

function getCaveLocal(x: number, z: number): { centerX: number; centerZ: number; distance: number; progress: number } {
  const progress = THREE.MathUtils.clamp((CAVE_ENTRANCE_Z - z) / CAVE_LENGTH, -0.25, 1.08);
  const centerX = getCaveCenterX(progress);
  const centerZ = CAVE_ENTRANCE_Z - progress * CAVE_LENGTH;
  return {
    centerX,
    centerZ,
    distance: Math.abs(x - centerX),
    progress
  };
}

function getCaveCenterX(progress: number): number {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  return CAVE_ENTRANCE_X + Math.sin(t * Math.PI * 1.18) * 8.5 - Math.sin(t * Math.PI * 2.4) * 2.2;
}

function sampleCaveFloor(progress: number): number {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  const entranceHeight = sampleTerrainHeight(CAVE_ENTRANCE_X, CAVE_ENTRANCE_Z);
  return entranceHeight - 1.2 - t * 2.4 + Math.sin(t * Math.PI * 2.1) * 0.45;
}

function getCaveWalkableHalfWidth(progress: number): number {
  return CAVE_WIDTH * THREE.MathUtils.lerp(0.72, 0.52, THREE.MathUtils.clamp(progress, 0, 1));
}

function isInCaveClearing(x: number, z: number, padding = 0): boolean {
  const cave = getCaveLocal(x, z);
  const nearEntrance = Math.hypot(x - CAVE_ENTRANCE_X, z - CAVE_ENTRANCE_Z) < CAVE_CLEAR_RADIUS + padding;
  const nearTunnel = cave.progress > -0.1 && cave.progress < 1.05 && cave.distance < CAVE_WIDTH * 1.75 + padding;
  return nearEntrance || nearTunnel;
}

function moveOutOfCaveClearing(x: number, z: number, seed: number): { x: number; z: number } {
  if (!isInCaveClearing(x, z, 8)) {
    return { x, z };
  }

  const cave = getCaveLocal(x, z);
  if (cave.progress > 0 && cave.progress < 1.05) {
    const side = x >= cave.centerX ? 1 : -1;
    return {
      x: cave.centerX + side * (CAVE_WIDTH * 2.1 + seededRandom(seed + 1) * 28),
      z
    };
  }

  const angle = Math.atan2(z - CAVE_ENTRANCE_Z, x - CAVE_ENTRANCE_X) + (seededRandom(seed + 2) - 0.5) * 0.36;
  const radius = CAVE_CLEAR_RADIUS + 10 + seededRandom(seed + 3) * 22;
  return {
    x: CAVE_ENTRANCE_X + Math.cos(angle) * radius,
    z: CAVE_ENTRANCE_Z + Math.sin(angle) * radius
  };
}

function createGroundTexture(): THREE.CanvasTexture {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  if (!context) {
    throw new Error("Ground texture failed to initialize.");
  }

  context.fillStyle = "#24301e";
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  for (let i = 0; i < 1700; i += 1) {
    const x = seededRandom(i + 2200) * textureCanvas.width;
    const y = seededRandom(i + 2300) * textureCanvas.height;
    const length = THREE.MathUtils.lerp(3, 13, seededRandom(i + 2400));
    const alpha = THREE.MathUtils.lerp(0.06, 0.18, seededRandom(i + 2500));
    context.strokeStyle = seededRandom(i + 2600) > 0.5 ? `rgb(58 54 35 / ${alpha})` : `rgb(24 45 29 / ${alpha})`;
    context.lineWidth = THREE.MathUtils.lerp(0.5, 1.4, seededRandom(i + 2700));
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(i) * length, y + Math.sin(i * 1.7) * length);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(44, 44);
  texture.anisotropy = 4;
  return texture;
}

function createBarkTexture(): THREE.CanvasTexture {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 96;
  textureCanvas.height = 320;
  const context = textureCanvas.getContext("2d");
  if (!context) {
    throw new Error("Bark texture failed to initialize.");
  }

  const gradient = context.createLinearGradient(0, 0, textureCanvas.width, 0);
  gradient.addColorStop(0, "#2a1c16");
  gradient.addColorStop(0.5, "#5b3b2e");
  gradient.addColorStop(1, "#251914");
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  for (let i = 0; i < 240; i += 1) {
    const x = seededRandom(i + 2800) * textureCanvas.width;
    const y = seededRandom(i + 2900) * textureCanvas.height;
    const length = THREE.MathUtils.lerp(16, 58, seededRandom(i + 3000));
    context.strokeStyle = seededRandom(i + 3100) > 0.45 ? "rgb(20 14 12 / 0.34)" : "rgb(114 78 58 / 0.18)";
    context.lineWidth = THREE.MathUtils.lerp(0.6, 2.4, seededRandom(i + 3200));
    context.beginPath();
    context.moveTo(x, y);
    context.bezierCurveTo(x - 5, y + length * 0.28, x + 8, y + length * 0.66, x + 1, y + length);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 3.8);
  texture.anisotropy = 4;
  return texture;
}

function createLeafTexture(): THREE.CanvasTexture {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 192;
  textureCanvas.height = 192;
  const context = textureCanvas.getContext("2d");
  if (!context) {
    throw new Error("Leaf texture failed to initialize.");
  }

  context.fillStyle = "#17331f";
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  for (let i = 0; i < 1100; i += 1) {
    const x = seededRandom(i + 3300) * textureCanvas.width;
    const y = seededRandom(i + 3400) * textureCanvas.height;
    const radius = THREE.MathUtils.lerp(0.8, 3.4, seededRandom(i + 3500));
    context.fillStyle = seededRandom(i + 3600) > 0.5 ? "rgb(41 86 54 / 0.2)" : "rgb(8 24 17 / 0.22)";
    context.beginPath();
    context.ellipse(x, y, radius, radius * 0.46, seededRandom(i + 3700) * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  texture.anisotropy = 4;
  return texture;
}

function createRockTexture(): THREE.CanvasTexture {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  if (!context) {
    throw new Error("Rock texture failed to initialize.");
  }

  const gradient = context.createLinearGradient(0, 0, textureCanvas.width, textureCanvas.height);
  gradient.addColorStop(0, "#20282a");
  gradient.addColorStop(0.45, "#3b403b");
  gradient.addColorStop(1, "#141718");
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  for (let i = 0; i < 900; i += 1) {
    const x = seededRandom(i + 3900) * textureCanvas.width;
    const y = seededRandom(i + 4000) * textureCanvas.height;
    const length = THREE.MathUtils.lerp(7, 38, seededRandom(i + 4100));
    const alpha = THREE.MathUtils.lerp(0.06, 0.24, seededRandom(i + 4200));
    context.strokeStyle = seededRandom(i + 4300) > 0.48 ? `rgb(205 216 198 / ${alpha})` : `rgb(0 0 0 / ${alpha})`;
    context.lineWidth = THREE.MathUtils.lerp(0.5, 2.8, seededRandom(i + 4400));
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(i * 0.8) * length, y + Math.sin(i * 1.37) * length);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5.4, 2.2);
  texture.anisotropy = 4;
  return texture;
}

function loadCaveTexture(path: string, repeatX: number, repeatY: number): THREE.Texture {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  return texture;
}

function createHandTorch(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(1.05, -1.04, -1.42);
  group.rotation.set(-0.42, 0.24, -0.24);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.08, 1.22, 10),
    new THREE.MeshStandardMaterial({
      color: "#5a3928",
      roughness: 0.86,
      metalness: 0.02
    })
  );
  handle.position.y = -0.36;
  handle.rotation.z = 0.1;
  handle.castShadow = true;
  group.add(handle);

  const wrapMaterial = new THREE.MeshStandardMaterial({
    color: "#2a211b",
    roughness: 0.92
  });
  for (let i = 0; i < 4; i += 1) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.01, 6, 18), wrapMaterial);
    wrap.position.y = THREE.MathUtils.lerp(0.06, 0.3, i / 3);
    wrap.rotation.x = Math.PI * 0.5;
    wrap.castShadow = true;
    group.add(wrap);
  }

  const coal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.08, 0.2, 12),
    new THREE.MeshStandardMaterial({
      color: "#18110d",
      roughness: 0.78,
      emissive: "#5b1708",
      emissiveIntensity: 0.35
    })
  );
  coal.position.y = 0.36;
  coal.castShadow = true;
  group.add(coal);

  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.52, 14, 1),
    new THREE.MeshBasicMaterial({
      color: "#ff7b1f",
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    })
  );
  flameOuter.position.y = 0.75;
  group.add(flameOuter);
  torchFlames.push(flameOuter);

  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.38, 12, 1),
    new THREE.MeshBasicMaterial({
      color: "#ffe0a4",
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    })
  );
  flameInner.position.y = 0.68;
  flameInner.rotation.y = 0.6;
  group.add(flameInner);
  torchFlames.push(flameInner);

  return group;
}

function createCaveScene(): THREE.Group {
  const group = new THREE.Group();
  const caveWallTexture = loadCaveTexture("/textures/cave-wall.jpg", 45, 105);
  const caveFloorTexture = loadCaveTexture("/textures/cave-floor.jpg", 32, 110);
  const caveMaterial = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.98,
    metalness: 0.01,
    vertexColors: true,
    map: caveWallTexture,
    bumpMap: caveWallTexture,
    bumpScale: 0.13,
    side: THREE.DoubleSide
  });
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: "#fff2df",
    roughness: 0.99,
    metalness: 0.01,
    vertexColors: true,
    map: caveFloorTexture,
    bumpMap: caveFloorTexture,
    bumpScale: 0.075
  });
  const darkMouthMaterial = new THREE.MeshBasicMaterial({
    color: "#030506",
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const tunnel = new THREE.Mesh(createCaveTunnelGeometry(), caveMaterial);
  tunnel.castShadow = true;
  tunnel.receiveShadow = true;
  group.add(tunnel);

  const floor = new THREE.Mesh(createCaveFloorGeometry(), floorMaterial);
  floor.receiveShadow = true;
  group.add(floor);

  const backWall = new THREE.Mesh(createCaveBackWallGeometry(), caveMaterial);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  const mouthShadow = new THREE.Mesh(new THREE.CircleGeometry(10.8, 32, 0, Math.PI), darkMouthMaterial);
  mouthShadow.position.set(CAVE_ENTRANCE_X, sampleCaveFloor(0) + 8.2, CAVE_ENTRANCE_Z + 1.2);
  mouthShadow.rotation.y = Math.PI;
  mouthShadow.scale.set(1.28, 0.88, 1);
  group.add(mouthShadow);

  const emberLight = new THREE.PointLight("#ff7d2a", 4.8, 38, 1.7);
  emberLight.position.set(CAVE_ENTRANCE_X - 2.5, sampleCaveFloor(0) + 4.2, CAVE_ENTRANCE_Z - 8);
  emberLight.castShadow = true;
  group.add(emberLight);

  const entranceRocks = createEntranceRocks();
  group.add(entranceRocks);
  group.add(createCaveDetailRocks(caveMaterial, floorMaterial));
  return group;
}

function createCaveTunnelGeometry(): THREE.BufferGeometry {
  const rings = 76;
  const segments = 44;
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const baseColor = new THREE.Color("#b4aa9a");
  const highlightColor = new THREE.Color("#fff0ce");
  const warmColor = new THREE.Color("#d58a55");

  for (let r = 0; r <= rings; r += 1) {
    const progress = r / rings;
    const centerX = getCaveCenterX(progress);
    const centerZ = CAVE_ENTRANCE_Z - progress * CAVE_LENGTH;
    const floor = sampleCaveFloor(progress);
    const width = CAVE_WIDTH * THREE.MathUtils.lerp(1.06, 0.8, progress);
    const height = CAVE_HEIGHT * THREE.MathUtils.lerp(1.1, 0.82, progress);

    for (let s = 0; s <= segments; s += 1) {
      const arch = s / segments;
      const angle = Math.PI * arch;
      const side = Math.cos(angle);
      const crown = Math.sin(angle);
      const broadRough = fbm(progress * 12.4 + arch * 4.6, arch * 10.2, 4, 93.2) - 0.5;
      const chipRough = fbm(progress * 36.5, arch * 28.5, 3, 131.8) - 0.5;
      const seam = Math.abs(fbm(progress * 22.2 + arch * 7.7, arch * 18.4, 2, 159.6) - 0.5);
      const rough = broadRough * 2.35 + chipRough * 0.82 - seam * 0.72;
      const x = centerX + side * (width + rough * 0.82);
      const y = floor + Math.max(0.25, crown) * (height + rough * 1.14) + (1 - crown) * 0.65;
      const z = centerZ + (fbm(progress * 18.6, arch * 13.5, 3, 102.4) - 0.5) * 1.65;
      const color = baseColor
        .clone()
        .lerp(highlightColor, crown * 0.24 + seededRandom(r * 71 + s) * 0.15)
        .lerp(warmColor, (1 - progress) * 0.1)
        .multiplyScalar(THREE.MathUtils.lerp(0.78, 1.12, 1 - seam));

      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
      uvs.push(arch, progress);
    }
  }

  const row = segments + 1;
  for (let r = 0; r < rings; r += 1) {
    for (let s = 0; s < segments; s += 1) {
      const a = r * row + s;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCaveFloorGeometry(): THREE.BufferGeometry {
  const rings = 76;
  const segments = 18;
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const colorA = new THREE.Color("#c0a386");
  const colorB = new THREE.Color("#ffd09a");

  for (let r = 0; r <= rings; r += 1) {
    const progress = r / rings;
    const centerX = getCaveCenterX(progress);
    const centerZ = CAVE_ENTRANCE_Z - progress * CAVE_LENGTH;
    const floor = sampleCaveFloor(progress);
    const width = CAVE_WIDTH * THREE.MathUtils.lerp(0.78, 0.58, progress);

    for (let s = 0; s <= segments; s += 1) {
      const across = s / segments - 0.5;
      const rough = (fbm(progress * 18, across * 12, 4, 119.6) - 0.5) * 0.82;
      const x = centerX + across * width * 2;
      const z = centerZ + (fbm(progress * 28, across * 18, 2, 149.2) - 0.5) * 0.52;
      const y = floor + rough + Math.abs(across) * 0.5;
      const color = colorA.clone().lerp(colorB, 0.14 + Math.abs(across) * 0.2 + seededRandom(r * 37 + s) * 0.1);
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
      uvs.push(s / segments, progress);
    }
  }

  const row = segments + 1;
  for (let r = 0; r < rings; r += 1) {
    for (let s = 0; s < segments; s += 1) {
      const a = r * row + s;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCaveBackWallGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const centerX = getCaveCenterX(1);
  const centerZ = CAVE_ENTRANCE_Z - CAVE_LENGTH - 0.7;
  const floor = sampleCaveFloor(1);
  const baseColor = new THREE.Color("#92877c");
  const topColor = new THREE.Color("#ead4ad");

  positions.push(centerX, floor + CAVE_HEIGHT * 0.42, centerZ);
  colors.push(baseColor.r, baseColor.g, baseColor.b);
  uvs.push(0.5, 0.5);

  for (let i = 0; i <= 20; i += 1) {
    const angle = Math.PI * (i / 20);
    const rough = (seededRandom(i + 4700) - 0.5) * 1.4;
    const x = centerX + Math.cos(angle) * (CAVE_WIDTH * 0.74 + rough);
    const y = floor + Math.sin(angle) * (CAVE_HEIGHT * 0.78 + rough) + 0.7;
    positions.push(x, y, centerZ);
    const color = baseColor.clone().lerp(topColor, Math.sin(angle) * 0.45);
    colors.push(color.r, color.g, color.b);
    uvs.push(0.5 + Math.cos(angle) * 0.5, Math.sin(angle));
  }

  for (let i = 1; i < 21; i += 1) {
    indices.push(0, i, i + 1);
  }

  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCaveDetailRocks(wallMaterial: THREE.Material, floorMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const wallRockGeometry = new THREE.DodecahedronGeometry(1, 1);
  const wallRockMaterial = (wallMaterial as THREE.MeshStandardMaterial).clone();
  const wallRocks = new THREE.InstancedMesh(wallRockGeometry, wallRockMaterial, CAVE_WALL_DETAIL_COUNT);

  wallRocks.castShadow = true;
  wallRocks.receiveShadow = true;
  for (let i = 0; i < CAVE_WALL_DETAIL_COUNT; i += 1) {
    const progress = THREE.MathUtils.lerp(0.06, 0.97, seededRandom(i + 6800));
    const arch = THREE.MathUtils.lerp(0.08, 0.92, seededRandom(i + 6900));
    const angle = Math.PI * arch;
    const centerX = getCaveCenterX(progress);
    const centerZ = CAVE_ENTRANCE_Z - progress * CAVE_LENGTH;
    const floor = sampleCaveFloor(progress);
    const side = Math.cos(angle);
    const crown = Math.sin(angle);
    const width = CAVE_WIDTH * THREE.MathUtils.lerp(1.06, 0.8, progress);
    const height = CAVE_HEIGHT * THREE.MathUtils.lerp(1.1, 0.82, progress);
    const jut = THREE.MathUtils.lerp(0.35, 1.15, seededRandom(i + 7000));
    const x = centerX + side * (width - jut * 0.18);
    const y = floor + Math.max(0.28, crown) * (height - jut * 0.08) + (1 - crown) * 0.65;
    const z = centerZ + (seededRandom(i + 7100) - 0.5) * 2.4;
    const size = THREE.MathUtils.lerp(0.62, 2.15, seededRandom(i + 7200));

    dummy.position.set(x, y, z);
    dummy.rotation.set(
      seededRandom(i + 7300) * Math.PI,
      seededRandom(i + 7400) * Math.PI,
      seededRandom(i + 7500) * Math.PI
    );
    dummy.scale.set(
      size * THREE.MathUtils.lerp(0.65, 1.2, seededRandom(i + 7600)),
      size * THREE.MathUtils.lerp(0.42, 0.86, seededRandom(i + 7700)),
      size * THREE.MathUtils.lerp(0.32, 0.72, seededRandom(i + 7800))
    );
    dummy.updateMatrix();
    wallRocks.setMatrixAt(i, dummy.matrix);
    color.set("#9a8978").lerp(new THREE.Color("#f0d0a3"), seededRandom(i + 7900) * 0.34);
    wallRocks.setColorAt(i, color);
  }
  wallRocks.instanceMatrix.needsUpdate = true;
  if (wallRocks.instanceColor) {
    wallRocks.instanceColor.needsUpdate = true;
  }
  group.add(wallRocks);

  const stalactiteGeometry = new THREE.ConeGeometry(0.72, 1, 8, 3);
  const stalactiteMaterial = (wallMaterial as THREE.MeshStandardMaterial).clone();
  const stalactites = new THREE.InstancedMesh(stalactiteGeometry, stalactiteMaterial, CAVE_STALACTITE_COUNT);

  stalactites.castShadow = true;
  stalactites.receiveShadow = true;
  for (let i = 0; i < CAVE_STALACTITE_COUNT; i += 1) {
    const progress = THREE.MathUtils.lerp(0.08, 0.95, seededRandom(i + 8000));
    const arch = THREE.MathUtils.lerp(0.34, 0.66, seededRandom(i + 8100));
    const angle = Math.PI * arch;
    const centerX = getCaveCenterX(progress);
    const centerZ = CAVE_ENTRANCE_Z - progress * CAVE_LENGTH;
    const floor = sampleCaveFloor(progress);
    const width = CAVE_WIDTH * THREE.MathUtils.lerp(1.06, 0.8, progress);
    const height = CAVE_HEIGHT * THREE.MathUtils.lerp(1.1, 0.82, progress);
    const side = Math.cos(angle);
    const crown = Math.sin(angle);
    const length = THREE.MathUtils.lerp(1.4, 4.9, seededRandom(i + 8200));

    dummy.position.set(
      centerX + side * width * 0.72 + (seededRandom(i + 8300) - 0.5) * 1.2,
      floor + crown * height - length * 0.48,
      centerZ + (seededRandom(i + 8400) - 0.5) * 3
    );
    dummy.rotation.set(Math.PI, seededRandom(i + 8500) * Math.PI, (seededRandom(i + 8600) - 0.5) * 0.24);
    dummy.scale.set(
      THREE.MathUtils.lerp(0.48, 1.08, seededRandom(i + 8700)),
      length,
      THREE.MathUtils.lerp(0.48, 1.08, seededRandom(i + 8800))
    );
    dummy.updateMatrix();
    stalactites.setMatrixAt(i, dummy.matrix);
    color.set("#8d7d6e").lerp(new THREE.Color("#dfc19b"), seededRandom(i + 8900) * 0.38);
    stalactites.setColorAt(i, color);
  }
  stalactites.instanceMatrix.needsUpdate = true;
  if (stalactites.instanceColor) {
    stalactites.instanceColor.needsUpdate = true;
  }
  group.add(stalactites);

  const floorStoneGeometry = new THREE.DodecahedronGeometry(1, 0);
  const floorStoneMaterial = (floorMaterial as THREE.MeshStandardMaterial).clone();
  const floorStones = new THREE.InstancedMesh(floorStoneGeometry, floorStoneMaterial, CAVE_FLOOR_STONE_COUNT);

  floorStones.castShadow = false;
  floorStones.receiveShadow = true;
  for (let i = 0; i < CAVE_FLOOR_STONE_COUNT; i += 1) {
    const progress = THREE.MathUtils.lerp(0.04, 0.98, seededRandom(i + 9000));
    const centerX = getCaveCenterX(progress);
    const centerZ = CAVE_ENTRANCE_Z - progress * CAVE_LENGTH;
    const halfWidth = getCaveWalkableHalfWidth(progress);
    const offset = (seededRandom(i + 9100) - 0.5) * halfWidth * 1.55;
    const x = centerX + offset;
    const z = centerZ + (seededRandom(i + 9200) - 0.5) * 2.3;
    const floor = sampleCaveFloor(progress);
    const size = THREE.MathUtils.lerp(0.24, 0.82, seededRandom(i + 9300));

    dummy.position.set(x, floor + size * 0.34, z);
    dummy.rotation.set(seededRandom(i + 9400) * Math.PI, seededRandom(i + 9500) * Math.PI, seededRandom(i + 9600) * Math.PI);
    dummy.scale.set(size * THREE.MathUtils.lerp(0.9, 1.8, seededRandom(i + 9700)), size * 0.38, size);
    dummy.updateMatrix();
    floorStones.setMatrixAt(i, dummy.matrix);
    color.set("#856a55").lerp(new THREE.Color("#d19968"), seededRandom(i + 9800) * 0.45);
    floorStones.setColorAt(i, color);
  }
  floorStones.instanceMatrix.needsUpdate = true;
  if (floorStones.instanceColor) {
    floorStones.instanceColor.needsUpdate = true;
  }
  group.add(floorStones);

  return group;
}

function createEntranceRocks(): THREE.Group {
  const group = new THREE.Group();
  const entranceRockTexture = loadCaveTexture("/textures/cave-wall.jpg", 3.5, 3.5);
  const material = new THREE.MeshStandardMaterial({
    color: "#f0dfc8",
    roughness: 0.88,
    metalness: 0,
    map: entranceRockTexture,
    bumpMap: entranceRockTexture,
    bumpScale: 0.08
  });
  const geometry = new THREE.DodecahedronGeometry(1, 1);
  const color = new THREE.Color();
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 26; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const depth = THREE.MathUtils.lerp(-8, 13, seededRandom(i + 4800));
    const spread = THREE.MathUtils.lerp(CAVE_WIDTH * 0.72, CAVE_WIDTH * 1.22, seededRandom(i + 4900));
    const x = CAVE_ENTRANCE_X + side * spread + (seededRandom(i + 5000) - 0.5) * 4;
    const z = CAVE_ENTRANCE_Z + depth;
    const ground = sampleHeight(x, z);
    const size = THREE.MathUtils.lerp(2.2, 7.4, seededRandom(i + 5100));
    const rock = new THREE.Mesh(geometry, material.clone());

    color.set("#303634").lerp(new THREE.Color("#65685e"), seededRandom(i + 5200) * 0.45);
    (rock.material as THREE.MeshStandardMaterial).color.copy(color);
    dummy.position.set(x, ground + size * 0.42, z);
    dummy.rotation.set(seededRandom(i + 5300) * Math.PI, seededRandom(i + 5400) * Math.PI, seededRandom(i + 5500) * Math.PI);
    dummy.scale.set(size * THREE.MathUtils.lerp(0.82, 1.35, seededRandom(i + 5600)), size * 0.72, size);
    dummy.updateMatrix();
    rock.applyMatrix4(dummy.matrix);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
    worldColliders.push({ x, z, radius: size * 0.62 });
  }

  for (let i = 0; i < 18; i += 1) {
    const angle = Math.PI * (0.06 + (i / 17) * 0.88);
    const jitter = (seededRandom(i + 5700) - 0.5) * 0.18;
    const x = CAVE_ENTRANCE_X + Math.cos(angle + jitter) * CAVE_WIDTH * THREE.MathUtils.lerp(0.78, 1.1, seededRandom(i + 5800));
    const y = sampleCaveFloor(0) + 1.4 + Math.sin(angle + jitter) * CAVE_HEIGHT * THREE.MathUtils.lerp(0.72, 1.02, seededRandom(i + 5900));
    const z = CAVE_ENTRANCE_Z + THREE.MathUtils.lerp(-2.8, 3.6, seededRandom(i + 6000));
    const size = THREE.MathUtils.lerp(2.4, 5.6, seededRandom(i + 6100));
    const rock = new THREE.Mesh(geometry, material.clone());

    color.set("#262d2d").lerp(new THREE.Color("#5a5e55"), seededRandom(i + 6200) * 0.36);
    (rock.material as THREE.MeshStandardMaterial).color.copy(color);
    dummy.position.set(x, y, z);
    dummy.rotation.set(seededRandom(i + 6300) * Math.PI, seededRandom(i + 6400) * Math.PI, seededRandom(i + 6500) * Math.PI);
    dummy.scale.set(size * 1.2, size * THREE.MathUtils.lerp(0.76, 1.28, seededRandom(i + 6600)), size);
    dummy.updateMatrix();
    rock.applyMatrix4(dummy.matrix);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    if (Math.abs(Math.cos(angle + jitter)) > 0.56) {
      worldColliders.push({ x, z, radius: size * 0.58 });
    }
  }

  for (let i = 0; i < CAVE_COLLIDER_COUNT; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const progress = i / CAVE_COLLIDER_COUNT;
    const centerX = getCaveCenterX(progress);
    const z = CAVE_ENTRANCE_Z - progress * CAVE_LENGTH;
    const width = getCaveWalkableHalfWidth(progress) + 1.6;
    worldColliders.push({ x: centerX + side * width, z, radius: 1.35 });
  }

  return group;
}

function createTerrainGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const row = TERRAIN_SEGMENTS + 1;
  const vertexCount = row * row;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(TERRAIN_SEGMENTS * TERRAIN_SEGMENTS * 6);
  const colorA = new THREE.Color("#11170d");
  const colorB = new THREE.Color("#253019");
  const colorC = new THREE.Color("#3b3827");
  let pointer = 0;

  for (let z = 0; z <= TERRAIN_SEGMENTS; z += 1) {
    const worldZ = (z / TERRAIN_SEGMENTS - 0.5) * FOREST_SIZE;
    for (let x = 0; x <= TERRAIN_SEGMENTS; x += 1) {
      const worldX = (x / TERRAIN_SEGMENTS - 0.5) * FOREST_SIZE;
      const height = sampleHeight(worldX, worldZ);
      const leafNoise = fbm(worldX * 0.06, worldZ * 0.06, 3, 18.8);
      const groundColor = colorA.clone().lerp(colorB, leafNoise).lerp(colorC, Math.max(0, height) * 0.015);

      positions[pointer * 3] = worldX;
      positions[pointer * 3 + 1] = height;
      positions[pointer * 3 + 2] = worldZ;
      colors[pointer * 3] = groundColor.r;
      colors[pointer * 3 + 1] = groundColor.g;
      colors[pointer * 3 + 2] = groundColor.b;
      pointer += 1;
    }
  }

  let indexPointer = 0;
  for (let z = 0; z < TERRAIN_SEGMENTS; z += 1) {
    for (let x = 0; x < TERRAIN_SEGMENTS; x += 1) {
      const a = z * row + x;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices[indexPointer] = a;
      indices[indexPointer + 1] = c;
      indices[indexPointer + 2] = b;
      indices[indexPointer + 3] = b;
      indices[indexPointer + 4] = c;
      indices[indexPointer + 5] = d;
      indexPointer += 6;
    }
  }

  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createForest(): void {
  const barkTexture = createBarkTexture();
  const leafTexture = createLeafTexture();
  const rockTexture = createRockTexture();
  const trunkGeometry = new THREE.CylinderGeometry(0.55, 0.82, 1, 14, 5);
  const branchGeometry = new THREE.CylinderGeometry(0.11, 0.19, 1, 8);
  const coniferGeometry = new THREE.ConeGeometry(1, 1, 16, 2);
  const crownGeometry = new THREE.SphereGeometry(1, 18, 12);
  const rockGeometry = new THREE.DodecahedronGeometry(1, 1);
  const logGeometry = new THREE.CylinderGeometry(0.7, 0.9, 1, 9);

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: "#4c3428",
    roughness: 0.94,
    vertexColors: true,
    map: barkTexture,
    bumpMap: barkTexture,
    bumpScale: 0.08
  });
  const branchMaterial = new THREE.MeshStandardMaterial({
    color: "#38261e",
    roughness: 0.96,
    vertexColors: true,
    map: barkTexture,
    bumpMap: barkTexture,
    bumpScale: 0.045
  });
  const needleMaterial = new THREE.MeshStandardMaterial({
    color: "#15311f",
    roughness: 0.88,
    vertexColors: true,
    map: leafTexture
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: "#1c3926",
    roughness: 0.9,
    vertexColors: true,
    map: leafTexture
  });
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: "#b8bbb0",
    roughness: 0.9,
    metalness: 0,
    vertexColors: true,
    map: rockTexture,
    bumpMap: rockTexture,
    bumpScale: 0.06
  });

  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, TREE_COUNT);
  const branches = new THREE.InstancedMesh(branchGeometry, branchMaterial, BRANCH_LIMIT);
  const conifers = new THREE.InstancedMesh(coniferGeometry, needleMaterial, TREE_COUNT * 3);
  const crowns = new THREE.InstancedMesh(crownGeometry, leafMaterial, TREE_COUNT);
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, ROCK_COUNT);
  const logs = new THREE.InstancedMesh(logGeometry, trunkMaterial, LOG_COUNT);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  trunks.castShadow = true;
  branches.castShadow = true;
  conifers.castShadow = true;
  crowns.castShadow = true;
  rocks.castShadow = true;
  logs.castShadow = true;
  trunks.receiveShadow = true;
  branches.receiveShadow = true;
  conifers.receiveShadow = true;
  crowns.receiveShadow = true;
  rocks.receiveShadow = true;
  logs.receiveShadow = true;

  let branchIndex = 0;
  let coniferIndex = 0;
  let crownIndex = 0;
  let rockIndex = 0;
  let logIndex = 0;

  for (let i = 0; i < TREE_COUNT; i += 1) {
    const angle = seededRandom(i + 101) * Math.PI * 2;
    const radius = Math.sqrt(seededRandom(i + 202)) * FOREST_SIZE * 0.46;
    let x = Math.cos(angle) * radius + (seededRandom(i + 303) - 0.5) * 16;
    let z = Math.sin(angle) * radius + (seededRandom(i + 404) - 0.5) * 16;
    const startDistance = Math.hypot(x - START_X, z - START_Z);
    if (startDistance < CLEARING_RADIUS) {
      const away = new THREE.Vector2(x - START_X, z - START_Z).normalize();
      if (away.lengthSq() === 0) {
        away.set(1, 0);
      }
      x = START_X + away.x * (CLEARING_RADIUS + seededRandom(i + 88) * 18);
      z = START_Z + away.y * (CLEARING_RADIUS + seededRandom(i + 89) * 18);
    }
    const moved = moveOutOfCaveClearing(x, z, i + 5800);
    x = moved.x;
    z = moved.z;
    const ground = sampleHeight(x, z);
    const height = THREE.MathUtils.lerp(16, 34, seededRandom(i + 505));
    const trunkRadius = THREE.MathUtils.lerp(0.75, 1.55, seededRandom(i + 606));
    const isConifer = seededRandom(i + 707) > 0.34;

    dummy.position.set(x, ground + height * 0.5, z);
    dummy.rotation.set(
      (seededRandom(i + 1) - 0.5) * 0.05,
      seededRandom(i + 2) * Math.PI * 2,
      (seededRandom(i + 3) - 0.5) * 0.05
    );
    dummy.scale.set(trunkRadius, height, trunkRadius);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    color.set("#4b3327").lerp(new THREE.Color("#6a4937"), seededRandom(i + 13) * 0.5);
    trunks.setColorAt(i, color);
    worldColliders.push({ x, z, radius: trunkRadius * 1.25 });

    const branchesForTree = Math.floor(THREE.MathUtils.lerp(2, 6, seededRandom(i + 33)));
    for (let b = 0; b < branchesForTree && branchIndex < BRANCH_LIMIT; b += 1) {
      const branchHeight = ground + height * THREE.MathUtils.lerp(0.36, 0.78, seededRandom(i * 31 + b));
      const branchLength = THREE.MathUtils.lerp(4.2, 9.8, seededRandom(i * 43 + b));
      const branchAngle = seededRandom(i * 61 + b) * Math.PI * 2;
      const branchTilt = THREE.MathUtils.lerp(0.18, 0.42, seededRandom(i * 71 + b));
      const direction = new THREE.Vector3(
        Math.cos(branchAngle) * Math.cos(branchTilt),
        Math.sin(branchTilt),
        Math.sin(branchAngle) * Math.cos(branchTilt)
      ).normalize();

      dummy.position.set(
        x + direction.x * branchLength * 0.45,
        branchHeight + direction.y * branchLength * 0.45,
        z + direction.z * branchLength * 0.45
      );
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      dummy.scale.set(
        THREE.MathUtils.lerp(0.8, 1.25, seededRandom(i * 19 + b)),
        branchLength,
        THREE.MathUtils.lerp(0.8, 1.25, seededRandom(i * 23 + b))
      );
      dummy.updateMatrix();
      branches.setMatrixAt(branchIndex, dummy.matrix);
      color.set("#33241d").lerp(new THREE.Color("#56382c"), seededRandom(i * 79 + b) * 0.4);
      branches.setColorAt(branchIndex, color);
      branchIndex += 1;
    }

    if (isConifer) {
      for (let tier = 0; tier < 3; tier += 1) {
        const tierWidth = THREE.MathUtils.lerp(8.5, 4.8, tier / 2) * THREE.MathUtils.lerp(0.82, 1.22, seededRandom(i + tier * 8));
        const tierHeight = THREE.MathUtils.lerp(10, 15, seededRandom(i + tier * 11));
        const tierY = ground + height * THREE.MathUtils.lerp(0.52, 0.9, tier / 2);

        dummy.position.set(x, tierY, z);
        dummy.rotation.set(0, seededRandom(i + tier * 17) * Math.PI * 2, 0);
        dummy.scale.set(tierWidth, tierHeight, tierWidth);
        dummy.updateMatrix();
        conifers.setMatrixAt(coniferIndex, dummy.matrix);
        color.set("#11291d").lerp(new THREE.Color("#245237"), seededRandom(i + tier * 31) * 0.58);
        conifers.setColorAt(coniferIndex, color);
        coniferIndex += 1;
      }
    } else {
      dummy.position.set(x, ground + height + 2.4, z);
      dummy.rotation.set(seededRandom(i + 8) * Math.PI, seededRandom(i + 9) * Math.PI, seededRandom(i + 10) * Math.PI);
      dummy.scale.set(
        THREE.MathUtils.lerp(7.2, 12.5, seededRandom(i + 19)),
        THREE.MathUtils.lerp(5.8, 9.5, seededRandom(i + 29)),
        THREE.MathUtils.lerp(7.2, 12.5, seededRandom(i + 39))
      );
      dummy.updateMatrix();
      crowns.setMatrixAt(crownIndex, dummy.matrix);
      color.set("#17331f").lerp(new THREE.Color("#31563a"), seededRandom(i + 44) * 0.5);
      crowns.setColorAt(crownIndex, color);
      crownIndex += 1;
    }
  }

  for (let i = 0; i < ROCK_COUNT * 2 && rockIndex < ROCK_COUNT; i += 1) {
    const x = (seededRandom(i + 800) - 0.5) * FOREST_SIZE * 0.94;
    const z = (seededRandom(i + 900) - 0.5) * FOREST_SIZE * 0.94;
    if (Math.hypot(x - START_X, z - START_Z) < CLEARING_RADIUS * 0.7 || isInCaveClearing(x, z, 6)) {
      continue;
    }
    const ground = sampleHeight(x, z);
    const size = THREE.MathUtils.lerp(0.55, 2.8, seededRandom(i + 1000));

    dummy.position.set(x, ground + size * 0.44, z);
    dummy.rotation.set(seededRandom(i + 2) * Math.PI, seededRandom(i + 3) * Math.PI, seededRandom(i + 4) * Math.PI);
    dummy.scale.set(size, size * THREE.MathUtils.lerp(0.36, 0.74, seededRandom(i + 5)), size);
    dummy.updateMatrix();
    rocks.setMatrixAt(rockIndex, dummy.matrix);
    color.set("#2c332f").lerp(new THREE.Color("#555b52"), seededRandom(i + 1001) * 0.5);
    rocks.setColorAt(rockIndex, color);
    worldColliders.push({ x, z, radius: size * 0.76 });
    rockIndex += 1;
  }

  for (let i = 0; i < LOG_COUNT * 2 && logIndex < LOG_COUNT; i += 1) {
    const x = (seededRandom(i + 1100) - 0.5) * FOREST_SIZE * 0.8;
    const z = (seededRandom(i + 1200) - 0.5) * FOREST_SIZE * 0.8;
    if (Math.hypot(x - START_X, z - START_Z) < CLEARING_RADIUS * 0.85 || isInCaveClearing(x, z, 10)) {
      continue;
    }
    const ground = sampleHeight(x, z);
    const length = THREE.MathUtils.lerp(8, 19, seededRandom(i + 1300));
    const yaw = seededRandom(i + 1400) * Math.PI * 2;

    dummy.position.set(x, ground + 0.72, z);
    dummy.rotation.set(Math.PI * 0.5, 0, yaw);
    dummy.scale.set(0.9, length, 0.9);
    dummy.updateMatrix();
    logs.setMatrixAt(logIndex, dummy.matrix);
    color.set("#3f2d23").lerp(new THREE.Color("#6b4a36"), seededRandom(i + 1500) * 0.34);
    logs.setColorAt(logIndex, color);
    for (let s = -1; s <= 1; s += 1) {
      worldColliders.push({
        x: x + Math.cos(yaw) * length * 0.23 * s,
        z: z + Math.sin(yaw) * length * 0.23 * s,
        radius: 1.08
      });
    }
    logIndex += 1;
  }

  branches.count = branchIndex;
  conifers.count = coniferIndex;
  crowns.count = crownIndex;
  rocks.count = rockIndex;
  logs.count = logIndex;
  trunks.instanceMatrix.needsUpdate = true;
  branches.instanceMatrix.needsUpdate = true;
  conifers.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  rocks.instanceMatrix.needsUpdate = true;
  logs.instanceMatrix.needsUpdate = true;

  scene.add(trunks, branches, conifers, crowns, rocks, logs);
}

function createStarField(): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(720 * 3);

  for (let i = 0; i < 720; i += 1) {
    const theta = seededRandom(i + 33) * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.lerp(0.08, 0.92, seededRandom(i + 66)));
    const radius = 500;
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: "#dfe9ff",
      size: 1.15,
      transparent: true,
      opacity: 0.48,
      depthWrite: false
    })
  );
}

function createMistLayer(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: "#b6c7c9",
    transparent: true,
    opacity: 0.045,
    depthWrite: false
  });

  for (let i = 0; i < 26; i += 1) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(58, 8), material);
    mist.position.set(
      (seededRandom(i + 1600) - 0.5) * FOREST_SIZE * 0.8,
      THREE.MathUtils.lerp(3, 9, seededRandom(i + 1700)),
      (seededRandom(i + 1800) - 0.5) * FOREST_SIZE * 0.8
    );
    mist.rotation.y = seededRandom(i + 1900) * Math.PI * 2;
    group.add(mist);
  }

  return group;
}

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function enterForest(): void {
  walkingActive = true;
  enterButton.hidden = true;

  if (document.pointerLockElement !== canvas && typeof canvas.requestPointerLock === "function") {
    const lockResult = canvas.requestPointerLock();
    if (lockResult && typeof lockResult.catch === "function") {
      lockResult.catch(() => {
        walkingActive = true;
        enterButton.hidden = true;
      });
    }
  }
}

function setTorchBrightness(value: number): void {
  torchBrightness = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 1, 0.45, 2.2);
  torchBrightnessInput.value = torchBrightness.toFixed(2);
  torchBrightnessValue.value = `${Math.round(torchBrightness * 100)}%`;
}

function isForwardPressed(): boolean {
  return keyState.has("KeyW") || keyState.has("ArrowUp");
}

function isBackPressed(): boolean {
  return keyState.has("KeyS") || keyState.has("ArrowDown");
}

function isLeftPressed(): boolean {
  return keyState.has("KeyA") || keyState.has("ArrowLeft");
}

function isRightPressed(): boolean {
  return keyState.has("KeyD") || keyState.has("ArrowRight");
}

function updateMovement(delta: number): void {
  if (!walkingActive) {
    return;
  }

  const movingForward = isForwardPressed();
  const movingBack = isBackPressed();
  const movingLeft = isLeftPressed();
  const movingRight = isRightPressed();
  const isMoving = movingForward || movingBack || movingLeft || movingRight;
  const speed = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? RUN_SPEED : WALK_SPEED;
  const distance = speed * delta;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) {
    forward.set(Math.sin(yaw), 0, -Math.cos(yaw));
  } else {
    forward.normalize();
  }
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const movement = new THREE.Vector3();

  if (movingForward) {
    movement.add(forward);
  }
  if (movingBack) {
    movement.addScaledVector(forward, -1);
  }
  if (movingLeft) {
    movement.addScaledVector(right, -1);
  }
  if (movingRight) {
    movement.add(right);
  }

  if (movement.lengthSq() > 0) {
    movement.normalize();
    camera.position.addScaledVector(movement, distance);
  }

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -FOREST_SIZE * 0.48, FOREST_SIZE * 0.48);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -FOREST_SIZE * 0.48, FOREST_SIZE * 0.48);
  resolveWorldCollisions();
  resolveCaveBounds();

  if (isMoving) {
    headBob += delta * (speed === RUN_SPEED ? 11 : 7.2);
  } else {
    headBob = THREE.MathUtils.lerp(headBob, 0, Math.min(1, delta * 5));
  }

  const bobOffset = isMoving ? Math.sin(headBob) * 0.18 : 0;
  const targetHeight = sampleHeight(camera.position.x, camera.position.z) + EYE_HEIGHT + bobOffset;
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetHeight, Math.min(1, delta * 12));
}

function resolveWorldCollisions(): void {
  for (const collider of worldColliders) {
    const dx = camera.position.x - collider.x;
    const dz = camera.position.z - collider.z;
    const minimum = collider.radius + PLAYER_RADIUS;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq > minimum * minimum || distanceSq < 0.0001) {
      continue;
    }

    const distance = Math.sqrt(distanceSq);
    camera.position.x = collider.x + (dx / distance) * minimum;
    camera.position.z = collider.z + (dz / distance) * minimum;
  }
}

function resolveCaveBounds(): void {
  const cave = getCaveLocal(camera.position.x, camera.position.z);
  if (cave.progress < -0.02 || cave.progress > 1.03) {
    return;
  }

  const halfWidth = getCaveWalkableHalfWidth(cave.progress);
  const offset = camera.position.x - cave.centerX;
  const maxOffset = halfWidth - PLAYER_RADIUS;

  if (Math.abs(offset) > maxOffset) {
    camera.position.x = cave.centerX + Math.sign(offset || 1) * maxOffset;
  }

  const backWallZ = CAVE_ENTRANCE_Z - CAVE_LENGTH + PLAYER_RADIUS * 3.2;
  if (camera.position.z < backWallZ) {
    camera.position.z = backWallZ;
  }
}

function animate(): void {
  const now = performance.now();
  const delta = Math.min(0.05, (now - previousTime) / 1000);
  const time = now * 0.001;
  previousTime = now;

  updateMovement(delta);
  updateTorch(time);
  lowMist.children.forEach((mist, index) => {
    mist.rotation.y += delta * THREE.MathUtils.lerp(0.012, 0.03, seededRandom(index + 2100));
  });
  starField.rotation.y += delta * 0.006;
  renderer.render(scene, camera);
}

function updateTorch(time: number): void {
  const flicker = 0.72 + Math.sin(time * 19.4) * 0.13 + Math.sin(time * 31.7) * 0.08;
  torchLight.intensity = THREE.MathUtils.lerp(14.5, 22.5, flicker) * torchBrightness;
  torchBeam.intensity = THREE.MathUtils.lerp(11.5, 20.5, flicker) * torchBrightness;
  torch.position.y = -1.04 + Math.sin(time * 2.2) * 0.018;
  torch.rotation.z = -0.24 + Math.sin(time * 3.1) * 0.025;

  torchFlames.forEach((flame, index) => {
    const scale = 0.9 + Math.sin(time * (16 + index * 3.5)) * 0.12 + Math.sin(time * 27.3 + index) * 0.06;
    flame.scale.set(1 + (scale - 1) * 0.45, scale, 1 + (scale - 1) * 0.28);
    flame.rotation.y += 0.035 + index * 0.012;
  });
}

resize();
renderer.setAnimationLoop(animate);
