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

const canvas = document.querySelector<HTMLCanvasElement>("#forest-canvas")!;
const enterButton = document.querySelector<HTMLButtonElement>("#enter-button")!;

if (!canvas || !enterButton) {
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

const scene = new THREE.Scene();
scene.background = new THREE.Color("#071018");
scene.fog = new THREE.FogExp2("#09141b", 0.0095);

const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 520);
camera.position.set(START_X, EYE_HEIGHT + sampleHeight(START_X, START_Z), START_Z);
camera.rotation.order = "YXZ";
scene.add(camera);

const keyState = new Set<string>();
const treeColliders: Array<{ x: number; z: number; radius: number }> = [];
let yaw = 0;
let pitch = 0;
let walkingActive = false;
let draggingLook = false;

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

const flashlight = new THREE.SpotLight("#fff2d4", 14, 96, Math.PI * 0.18, 0.58, 1.2);
flashlight.position.set(0.15, -0.08, 0.08);
flashlight.target.position.set(0, -0.2, -1);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(512, 512);
flashlight.shadow.bias = -0.00008;
camera.add(flashlight);
camera.add(flashlight.target);

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

createForest();

enterButton.addEventListener("click", enterForest);
canvas.addEventListener("click", enterForest);

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

function sampleHeight(x: number, z: number): number {
  const broad = fbm(x * 0.008, z * 0.008, 5, 9.2) - 0.5;
  const detail = fbm(x * 0.038, z * 0.038, 4, 51.7) - 0.5;
  const ridge = Math.abs(fbm(x * 0.015, z * 0.015, 3, 81.3) - 0.5);
  return broad * 15 + detail * 2.7 - ridge * 5.2;
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
  const trunkGeometry = new THREE.CylinderGeometry(0.55, 0.82, 1, 14, 5);
  const branchGeometry = new THREE.CylinderGeometry(0.11, 0.19, 1, 8);
  const coniferGeometry = new THREE.ConeGeometry(1, 1, 16, 2);
  const crownGeometry = new THREE.SphereGeometry(1, 18, 12);
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
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
    color: "#373c39",
    roughness: 0.98,
    vertexColors: true
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
    treeColliders.push({ x, z, radius: trunkRadius * 1.25 });

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
    if (Math.hypot(x - START_X, z - START_Z) < CLEARING_RADIUS * 0.7) {
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
    rockIndex += 1;
  }

  for (let i = 0; i < LOG_COUNT * 2 && logIndex < LOG_COUNT; i += 1) {
    const x = (seededRandom(i + 1100) - 0.5) * FOREST_SIZE * 0.8;
    const z = (seededRandom(i + 1200) - 0.5) * FOREST_SIZE * 0.8;
    if (Math.hypot(x - START_X, z - START_Z) < CLEARING_RADIUS * 0.85) {
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
  const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

  if (movingForward) {
    camera.position.addScaledVector(forward, distance);
  }
  if (movingBack) {
    camera.position.addScaledVector(forward, -distance);
  }
  if (movingLeft) {
    camera.position.addScaledVector(right, -distance);
  }
  if (movingRight) {
    camera.position.addScaledVector(right, distance);
  }

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -FOREST_SIZE * 0.48, FOREST_SIZE * 0.48);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -FOREST_SIZE * 0.48, FOREST_SIZE * 0.48);
  resolveTreeCollisions();

  if (isMoving) {
    headBob += delta * (speed === RUN_SPEED ? 11 : 7.2);
  } else {
    headBob = THREE.MathUtils.lerp(headBob, 0, Math.min(1, delta * 5));
  }

  const bobOffset = isMoving ? Math.sin(headBob) * 0.18 : 0;
  const targetHeight = sampleHeight(camera.position.x, camera.position.z) + EYE_HEIGHT + bobOffset;
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetHeight, Math.min(1, delta * 12));
}

function resolveTreeCollisions(): void {
  for (const collider of treeColliders) {
    const dx = camera.position.x - collider.x;
    const dz = camera.position.z - collider.z;
    const minimum = collider.radius + 0.72;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq > minimum * minimum || distanceSq < 0.0001) {
      continue;
    }

    const distance = Math.sqrt(distanceSq);
    camera.position.x = collider.x + (dx / distance) * minimum;
    camera.position.z = collider.z + (dz / distance) * minimum;
  }
}

function animate(): void {
  const now = performance.now();
  const delta = Math.min(0.05, (now - previousTime) / 1000);
  previousTime = now;

  updateMovement(delta);
  lowMist.children.forEach((mist, index) => {
    mist.rotation.y += delta * THREE.MathUtils.lerp(0.012, 0.03, seededRandom(index + 2100));
  });
  starField.rotation.y += delta * 0.006;
  renderer.render(scene, camera);
}

resize();
renderer.setAnimationLoop(animate);
