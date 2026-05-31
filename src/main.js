import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SensorManager } from './sensors.js';
import { StepDetector } from './stepDetector.js';

const MAZE = [
  '#####################',
  '#S#     #       #   #',
  '# # ### # ##### # # #',
  '# # #   #     #   # #',
  '# # # ####### ##### #',
  '#   #       #     # #',
  '### ####### ##### # #',
  '#   #     #   #   # #',
  '# ### ### ### # ### #',
  '#     # #     # #   #',
  '##### # ####### # ###',
  '#   # #       # #   #',
  '# # # ####### # ### #',
  '# #       #   #     #',
  '# ####### # ####### #',
  '#       # #       # #',
  '####### # ####### # #',
  '#       #       #   #',
  '# ########### # ### #',
  '#           # #    E#',
  '#####################'
];

const CELL = 4;
const WALL_HEIGHT = 3.25;
const WALL_OVERLAP = 0.34;
const WALL_FACE_THICKNESS = 0.44;
const WALL_PANEL_FACE_OFFSET = CELL / 2 - 0.08;
const PLAYER_HEIGHT = 1.64;
const PLAYER_RADIUS = 0.48;
const PLAYER_SPEED = 5.2;
const MOUSE_LOOK_SPEED = 0.0023;
const STEP_SPEED_ACCELERATION = 12;
const STEP_SPEED_DECELERATION = 10;
const MOBILE_YAW_DIRECTION = 1;
const MOBILE_PITCH_DIRECTION = 1;
const MOBILE_PITCH_SCALE = 0.25;
const MOBILE_PITCH_LIMIT = 28;
const ROWS = MAZE.length;
const COLS = MAZE[0].length;
const ORIGIN_X = -(COLS * CELL) / 2;
const ORIGIN_Z = -(ROWS * CELL) / 2;
const USER_AGENT = navigator.userAgent || '';
const IS_ANDROID = /Android/i.test(USER_AGENT);
const USE_MOBILE_SENSORS = matchMedia('(pointer: coarse)').matches;
const WALL_PANELS_PER_CELL = 2;
const WALL_PANEL_TANGENT_SCALE = 0.9;
const WALL_STACK_LAYERS = 2;
const WALL_STACK_RISE = WALL_HEIGHT * 0.68;
const WALL_STACK_INSET = 0.11;
const TEXTURE_SIZE = IS_ANDROID ? 256 : 512;
const FLOOR_SEGMENTS = IS_ANDROID ? 42 : 90;
const HUD_UPDATE_INTERVAL = IS_ANDROID ? 0.12 : 0.05;
const MAP_UPDATE_INTERVAL = IS_ANDROID ? 0.28 : 0.08;

const DESKTOP_MODEL_FILES = {
  wallStone: '/models/cave-stone-wall.glb',
  wallMossStone: '/models/cave-moss-stone-wall.glb',
  wallMossRock: '/models/cave-moss-rock-wall.glb',
  wallRockDirt: '/models/cave-rock-dirt.glb',
  wallCurve: '/models/cave-curved-wall-color.glb',
  boulderMoss: '/models/cave-boulder-moss.glb'
};

const ANDROID_MODEL_FILES = {
  wallStone: DESKTOP_MODEL_FILES.wallStone,
  wallMossStone: DESKTOP_MODEL_FILES.wallMossStone,
  wallMossRock: DESKTOP_MODEL_FILES.wallMossRock
};

const MODEL_FILES = IS_ANDROID ? ANDROID_MODEL_FILES : DESKTOP_MODEL_FILES;
const STRAIGHT_WALL_MODELS = ['wallStone', 'wallMossStone', 'wallMossRock', 'wallRockDirt'];
const ANDROID_STRAIGHT_WALL_MODELS = ['wallStone', 'wallMossStone', 'wallMossRock'];

const canvas = document.querySelector('#scene');
const mapCanvas = document.querySelector('#map');
const mapContext = mapCanvas.getContext('2d');
const startScreen = document.querySelector('#startScreen');
const calibrationScreen = document.querySelector('#calibrationScreen');
const winScreen = document.querySelector('#winScreen');
const startButton = document.querySelector('#startButton');
const confirmCalibrationButton = document.querySelector('#confirmCalibrationButton');
const restartButton = document.querySelector('#restartButton');
const distanceLabel = document.querySelector('#distance');
const bearingLabel = document.querySelector('#bearing');
const cadenceLabel = document.querySelector('#cadence');
const speedLabel = document.querySelector('#speed');
const sensorStatusLabel = document.querySelector('#sensorStatus');
const startHint = document.querySelector('#startHint');
const calibrationStatus = document.querySelector('#calibrationStatus');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !IS_ANDROID,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(getRenderPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0908);
scene.fog = new THREE.FogExp2(0x0c0908, 0.034);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  IS_ANDROID ? 90 : 140
);

const world = new THREE.Group();
scene.add(world);

const fallbackMazeLayer = new THREE.Group();
const modelMazeLayer = new THREE.Group();
world.add(fallbackMazeLayer, modelMazeLayer);

const clock = new THREE.Clock();
const loader = new GLTFLoader();
const sensors = new SensorManager();
const stepDetector = new StepDetector();
const keys = new Set();
const panelHelper = new THREE.Object3D();
let hudTimer = 0;
let mapTimer = 0;
let gameActive = false;
let mobileCalibrated = false;
let mobileSpeed = 0;
let unsubscribeMotion = null;
const exitCell = findCell('E');
const startCell = findCell('S');
const exitPosition = cellCenter(exitCell.row, exitCell.col);
const startPosition = cellCenter(startCell.row, startCell.col);

const player = {
  position: new THREE.Vector3(startPosition.x, PLAYER_HEIGHT, startPosition.z),
  yaw: Math.PI,
  pitch: 0,
  won: false
};

const torch = new THREE.PointLight(0xffb46a, 2.25, 15, 1.55);
scene.add(torch);

const exitLight = new THREE.PointLight(0x83ffbd, 4.6, 18, 1.2);
exitLight.position.set(exitPosition.x, 2.1, exitPosition.z);
scene.add(exitLight);

const ambient = new THREE.HemisphereLight(0x7f8b96, 0x160f0b, 1.22);
scene.add(ambient);

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x594b38,
  map: makeStoneTexture(TEXTURE_SIZE, [66, 56, 43], [128, 111, 84]),
  roughness: 0.96,
  metalness: 0
});
floorMaterial.map.wrapS = THREE.RepeatWrapping;
floorMaterial.map.wrapT = THREE.RepeatWrapping;
floorMaterial.map.repeat.set(18, 18);

const pathCells = computeReachableCells(startCell);

init();

function init() {
  buildCaveShell();
  buildExit();
  buildFallbackMaze();
  drawMap();
  resetPlayer();
  updateStartCopy();
  updateHud();
  animate();

  loadModelSet()
    .then((assets) => {
      buildMazeModels(assets);
      fallbackMazeLayer.visible = false;
    })
    .catch((error) => {
      console.warn('GLB models failed to load. Fallback rocks remain visible.', error);
      fallbackMazeLayer.visible = true;
    });
}

function buildCaveShell() {
  const floor = createRoughPlane(COLS * CELL, ROWS * CELL, FLOOR_SEGMENTS, 0.2);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.material = floorMaterial;
  world.add(floor);
}

function buildExit() {
  const gateGeometry = new THREE.TorusGeometry(1.45, 0.09, 16, 64);
  const gateMaterial = new THREE.MeshStandardMaterial({
    color: 0x8ffff1,
    emissive: 0x25d88e,
    emissiveIntensity: 1.8,
    roughness: 0.45
  });
  const gate = new THREE.Mesh(gateGeometry, gateMaterial);
  gate.position.set(exitPosition.x, 1.65, exitPosition.z);
  gate.rotation.y = Math.PI / 2;
  world.add(gate);

  const glowGeometry = new THREE.CircleGeometry(1.25, 48);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x65ffb8,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.set(exitPosition.x, 1.65, exitPosition.z - 0.02);
  glow.rotation.y = Math.PI / 2;
  world.add(glow);
}

async function loadModelSet() {
  const entries = await Promise.all(
    Object.entries(MODEL_FILES).map(async ([name, url]) => {
      const gltf = await loader.loadAsync(url);
      return [name, prepareModel(gltf.scene, name)];
    })
  );

  return Object.fromEntries(entries);
}

function prepareModel(source, name) {
  const model = source.clone(true);
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    if (child.material) {
      child.material = child.material.clone();
      child.material.roughness = Math.max(child.material.roughness ?? 0.8, 0.78);
      child.material.metalness = Math.min(child.material.metalness ?? 0, 0.08);
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(center);

  const targetHeight = name === 'boulderMoss' ? WALL_HEIGHT * 0.58 : WALL_HEIGHT * 0.98;
  const targetWidth = name === 'boulderMoss' ? CELL * 0.82 : CELL * 1.18;
  const horizontal = Math.max(size.x, size.z, 0.001);
  const scale = Math.min(targetHeight / Math.max(size.y, 0.001), targetWidth / horizontal);
  model.scale.setScalar(scale);

  const group = new THREE.Group();
  group.add(model);
  return group;
}

function buildMazeModels(assets) {
  modelMazeLayer.clear();
  const modelMatrices = createModelMatrixBuckets();

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!isWall(row, col)) continue;
      const center = cellCenter(row, col);
      const exposed = exposedDirections(row, col);

      exposed.forEach((direction, index) => {
        placeWallPanels(modelMatrices, center, direction, row, col, index);
      });

      if (!IS_ANDROID && exposed.length >= 2 && (row * 3 + col) % 7 === 0) {
        placeBoulderAccent(modelMatrices, center, exposed, row, col);
      }
    }
  }

  if (!IS_ANDROID) addCornerCoverPanels(modelMatrices);
  Object.entries(modelMatrices).forEach(([name, matrices]) => {
    addInstancedModel(assets[name], matrices, modelMazeLayer);
  });
}

function createModelMatrixBuckets() {
  return Object.keys(MODEL_FILES).reduce((buckets, name) => {
    buckets[name] = [];
    return buckets;
  }, {});
}

function buildFallbackMaze() {
  fallbackMazeLayer.clear();
  const material = new THREE.MeshStandardMaterial({
    color: 0x2d261e,
    map: makeStoneTexture(384, [37, 33, 28], [92, 84, 68]),
    roughness: 1
  });
  material.map.wrapS = THREE.RepeatWrapping;
  material.map.wrapT = THREE.RepeatWrapping;
  material.map.repeat.set(1.6, 1.6);
  buildSeamlessWalls(fallbackMazeLayer, material);
}

function buildSeamlessWalls(layer, material) {
  buildWallMassRuns(layer, material);
  buildPassageEdgeRuns(layer, material);
}

function buildWallMassRuns(layer, material) {
  for (let row = 0; row < ROWS; row += 1) {
    let col = 0;
    while (col < COLS) {
      if (!isWall(row, col)) {
        col += 1;
        continue;
      }

      const startCol = col;
      while (col < COLS && isWall(row, col)) col += 1;
      const runLength = col - startCol;
      const center = cellCenter(row, startCol + (runLength - 1) / 2);
      const block = createRockBlock(
        runLength * CELL + WALL_OVERLAP,
        WALL_HEIGHT,
        CELL + WALL_OVERLAP,
        material
      );
      block.position.set(center.x, WALL_HEIGHT / 2, center.z);
      layer.add(block);
    }
  }
}

function buildPassageEdgeRuns(layer, material) {
  buildHorizontalEdgeRuns(layer, material, -1);
  buildHorizontalEdgeRuns(layer, material, 1);
  buildVerticalEdgeRuns(layer, material, -1);
  buildVerticalEdgeRuns(layer, material, 1);
}

function buildHorizontalEdgeRuns(layer, material, dz) {
  for (let row = 0; row < ROWS; row += 1) {
    let col = 0;
    while (col < COLS) {
      if (!hasOpenNeighbor(row, col, 0, dz)) {
        col += 1;
        continue;
      }

      const startCol = col;
      while (col < COLS && hasOpenNeighbor(row, col, 0, dz)) col += 1;
      const runLength = col - startCol;
      const center = cellCenter(row, startCol + (runLength - 1) / 2);
      const slab = createRockBlock(
        runLength * CELL + WALL_OVERLAP,
        WALL_HEIGHT * 1.03,
        WALL_FACE_THICKNESS,
        material
      );
      slab.position.set(
        center.x,
        WALL_HEIGHT / 2,
        center.z + dz * (CELL / 2 - WALL_FACE_THICKNESS / 2)
      );
      layer.add(slab);
    }
  }
}

function buildVerticalEdgeRuns(layer, material, dx) {
  for (let col = 0; col < COLS; col += 1) {
    let row = 0;
    while (row < ROWS) {
      if (!hasOpenNeighbor(row, col, dx, 0)) {
        row += 1;
        continue;
      }

      const startRow = row;
      while (row < ROWS && hasOpenNeighbor(row, col, dx, 0)) row += 1;
      const runLength = row - startRow;
      const center = cellCenter(startRow + (runLength - 1) / 2, col);
      const slab = createRockBlock(
        WALL_FACE_THICKNESS,
        WALL_HEIGHT * 1.03,
        runLength * CELL + WALL_OVERLAP,
        material
      );
      slab.position.set(
        center.x + dx * (CELL / 2 - WALL_FACE_THICKNESS / 2),
        WALL_HEIGHT / 2,
        center.z
      );
      layer.add(slab);
    }
  }
}

function hasOpenNeighbor(row, col, dx, dz) {
  return isWall(row, col) && !isWall(row + dz, col + dx);
}

function addCornerCoverPanels(modelMatrices) {
  for (let row = 1; row < ROWS - 1; row += 1) {
    for (let col = 1; col < COLS - 1; col += 1) {
      if (isWall(row, col) || (row + col) % 3 !== 0) continue;
      const walls = [
        isWall(row - 1, col),
        isWall(row, col + 1),
        isWall(row + 1, col),
        isWall(row, col - 1)
      ];
      const corner =
        (walls[0] && walls[1]) ||
        (walls[1] && walls[2]) ||
        (walls[2] && walls[3]) ||
        (walls[3] && walls[0]);

      if (!corner) continue;
      const center = cellCenter(row, col);
      const offset = cornerOffset(walls);
      modelMatrices.wallCurve.push(
        createPanelMatrix(
          center.x + offset.x,
          WALL_HEIGHT * 0.5,
          center.z + offset.z,
          cornerRotation(walls),
          0.82,
          0.9
        )
      );
    }
  }
}

function placeWallPanels(modelMatrices, center, direction, row, col, index) {
  const tangent = { x: -direction.dz, z: direction.dx };
  const spacing = CELL / WALL_PANELS_PER_CELL;
  const startOffset = -CELL / 2 + spacing / 2;

  for (let panelIndex = 0; panelIndex < WALL_PANELS_PER_CELL; panelIndex += 1) {
    const tangentOffset = startOffset + panelIndex * spacing;
    for (let stackIndex = 0; stackIndex < WALL_STACK_LAYERS; stackIndex += 1) {
      const roll =
        (((row * 11 + col * 7 + index * 5 + panelIndex * 3 + stackIndex * 9) % 7) - 3) *
        (0.018 + stackIndex * 0.004);
      const modelName = chooseWallModel(row, col, index + stackIndex, panelIndex);
      modelMatrices[modelName].push(
        createWallPanelMatrix(center, direction, tangent, tangentOffset, roll, row, col, stackIndex)
      );
    }
  }
}

function createWallPanelMatrix(center, direction, tangent, tangentOffset, roll, row, col, stackIndex) {
  const heightOffset = stackIndex * WALL_STACK_RISE;
  const inward = stackIndex * WALL_STACK_INSET;
  const stagger = (((row * 13 + col * 17 + stackIndex * 5) % 9) - 4) * 0.055;
  const scaleX = 0.92 + (stackIndex % 3) * 0.035;
  const scaleZ = WALL_PANEL_TANGENT_SCALE * (1.02 - Math.min(stackIndex, 5) * 0.018);
  return createPanelMatrix(
    center.x + direction.dx * (WALL_PANEL_FACE_OFFSET + inward) + tangent.x * (tangentOffset + stagger),
    WALL_HEIGHT * 0.5 + heightOffset,
    center.z + direction.dz * (WALL_PANEL_FACE_OFFSET + inward) + tangent.z * (tangentOffset + stagger),
    faceYaw(direction.dx, direction.dz),
    scaleX,
    scaleZ,
    roll
  );
}

function chooseWallModel(row, col, directionIndex, panelIndex) {
  const choices = IS_ANDROID ? ANDROID_STRAIGHT_WALL_MODELS : STRAIGHT_WALL_MODELS;
  const seed = row * 17 + col * 31 + directionIndex * 7 + panelIndex * 13;
  return choices[Math.abs(seed) % choices.length];
}

function placeBoulderAccent(modelMatrices, center, exposed, row, col) {
  const direction = exposed[(row + col) % exposed.length];
  const tangent = { x: -direction.dz, z: direction.dx };
  const side = (row + col) % 2 === 0 ? 1 : -1;
  const inset = CELL * 0.18;
  modelMatrices.boulderMoss.push(
    createPanelMatrix(
      center.x + direction.dx * (WALL_PANEL_FACE_OFFSET - inset) + tangent.x * CELL * 0.24 * side,
      WALL_HEIGHT * 0.28,
      center.z + direction.dz * (WALL_PANEL_FACE_OFFSET - inset) + tangent.z * CELL * 0.24 * side,
      faceYaw(direction.dx, direction.dz) + seededAngle(row, col) * 0.18,
      0.74,
      0.74
    )
  );
}

function createPanelMatrix(x, y, z, yaw, scaleX, scaleZ, roll = 0) {
  panelHelper.position.set(x, y, z);
  panelHelper.rotation.set(0, yaw, roll);
  panelHelper.scale.set(scaleX, 1, scaleZ);
  panelHelper.updateMatrix();
  return panelHelper.matrix.clone();
}

function addInstancedModel(source, matrices, layer) {
  if (matrices.length === 0) return;

  source.updateMatrixWorld(true);
  source.traverse((child) => {
    if (!child.isMesh) return;
    const mesh = new THREE.InstancedMesh(child.geometry, child.material, matrices.length);
    const matrix = new THREE.Matrix4();

    for (let index = 0; index < matrices.length; index += 1) {
      matrix.multiplyMatrices(matrices[index], child.matrixWorld);
      mesh.setMatrixAt(index, matrix);
    }

    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.frustumCulled = false;
    layer.add(mesh);
  });
}

function exposedDirections(row, col) {
  return [
    { dx: 0, dz: -1 },
    { dx: 1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: -1, dz: 0 }
  ].filter((direction) => !isWall(row + direction.dz, col + direction.dx));
}

function faceYaw(dx, dz) {
  return Math.atan2(-dz, dx);
}

function cornerRotation(walls) {
  if (walls[0] && walls[1]) return Math.PI;
  if (walls[1] && walls[2]) return -Math.PI / 2;
  if (walls[2] && walls[3]) return 0;
  return Math.PI / 2;
}

function cornerOffset(walls) {
  const offset = CELL * 0.28;
  if (walls[0] && walls[1]) return { x: offset, z: -offset };
  if (walls[1] && walls[2]) return { x: offset, z: offset };
  if (walls[2] && walls[3]) return { x: -offset, z: offset };
  return { x: -offset, z: -offset };
}

function createRockBlock(width, height, depth, material) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 3, 5, 3);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    const noise = (Math.random() - 0.5) * 0.22;
    if (Math.abs(y) < height * 0.48) {
      position.setX(index, position.getX(index) + noise);
      position.setZ(index, position.getZ(index) + noise * 0.8);
    }
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function createRoughPlane(width, depth, segments, strength) {
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const ripple = Math.sin(x * 0.24) * 0.13 + Math.cos(y * 0.2) * 0.16;
    position.setZ(index, ripple + (Math.random() - 0.5) * strength);
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry);
}

function makeStoneTexture(size, low, high) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext('2d');
  const image = context.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const vein = Math.sin(x * 0.045 + Math.cos(y * 0.025) * 2.5);
      const grain = Math.random() * 0.62 + vein * 0.18;
      image.data[index] = lerp(low[0], high[0], grain);
      image.data[index + 1] = lerp(low[1], high[1], grain);
      image.data[index + 2] = lerp(low[2], high[2], grain);
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(delta);
  updateCamera();
  hudTimer += delta;
  mapTimer += delta;
  if (hudTimer >= HUD_UPDATE_INTERVAL) {
    updateHud();
    hudTimer = 0;
  }
  if (mapTimer >= MAP_UPDATE_INTERVAL) {
    drawMap();
    mapTimer = 0;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updatePlayer(delta) {
  if (player.won || !gameActive) return;

  let movement;
  if (USE_MOBILE_SENSORS) {
    applyMobileOrientation();
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const stepState = stepDetector.getState();
    const targetSpeed = mobileCalibrated ? stepState.speed : 0;
    const acceleration = targetSpeed > mobileSpeed ? STEP_SPEED_ACCELERATION : STEP_SPEED_DECELERATION;
    mobileSpeed = moveToward(mobileSpeed, targetSpeed, acceleration * delta);
    movement = forward.multiplyScalar(mobileSpeed * delta);
  } else {
    const keyboardMove = getKeyboardMove();
    const length = Math.hypot(keyboardMove.x, keyboardMove.y);
    const moveX = length > 1 ? keyboardMove.x / length : keyboardMove.x;
    const moveY = length > 1 ? keyboardMove.y / length : keyboardMove.y;
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    movement = new THREE.Vector3()
      .addScaledVector(forward, moveY)
      .addScaledVector(right, moveX)
      .multiplyScalar(PLAYER_SPEED * delta);
  }

  moveWithCollision(movement.x, movement.z);

  const distanceToExit = Math.hypot(
    player.position.x - exitPosition.x,
    player.position.z - exitPosition.z
  );
  if (distanceToExit < CELL * 0.42) {
    player.won = true;
    gameActive = false;
    mobileSpeed = 0;
    winScreen.classList.remove('hidden');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
}

function updateCamera() {
  const bob = player.won ? 0 : Math.sin(clock.elapsedTime * 8.2) * movingAmount() * 0.028;
  camera.position.set(player.position.x, PLAYER_HEIGHT + bob, player.position.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  torch.position.copy(camera.position);
  torch.position.y -= 0.08;
}

function updateHud() {
  const dx = exitPosition.x - player.position.x;
  const dz = exitPosition.z - player.position.z;
  const distance = Math.max(0, Math.hypot(dx, dz) - CELL * 0.4);
  distanceLabel.textContent = `${distance.toFixed(0)} m`;

  const angleToExit = Math.atan2(dx, dz);
  const cameraHeading = normalizeAngle(player.yaw + Math.PI);
  const relative = normalizeAngle(angleToExit - cameraHeading);
  bearingLabel.textContent = compassFromAngle(relative);

  const flicker = 1 + Math.sin(clock.elapsedTime * 17) * 0.04 + Math.random() * 0.035;
  torch.intensity = 2.25 * flicker;
  exitLight.intensity = 4.4 + Math.sin(clock.elapsedTime * 3) * 0.6;

  const stepState = stepDetector.getState();
  cadenceLabel.textContent = `${Math.round(stepState.cadence)} spm`;
  speedLabel.textContent = mobileSpeed.toFixed(1);
  sensorStatusLabel.textContent = getSensorStatus();

  if (USE_MOBILE_SENSORS && !mobileCalibrated && !calibrationScreen.classList.contains('hidden')) {
    calibrationStatus.textContent = sensors.hasOrientation
      ? '已读到方向，请保持手机平视并确认。'
      : '等待方向传感器数据...';
  }
}

function drawMap() {
  const size = 148 * getMapPixelRatio();
  if (mapCanvas.width !== size) {
    mapCanvas.width = size;
    mapCanvas.height = size;
  }
  const cellWidth = size / COLS;
  const cellHeight = size / ROWS;
  mapContext.clearRect(0, 0, size, size);
  mapContext.fillStyle = 'rgba(10, 9, 8, 0.76)';
  mapContext.fillRect(0, 0, size, size);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!pathCells.has(`${row},${col}`)) continue;
      mapContext.fillStyle = isWall(row, col) ? '#211d19' : 'rgba(214, 181, 127, 0.24)';
      mapContext.fillRect(col * cellWidth, row * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
    }
  }

  const playerCell = worldToCell(player.position.x, player.position.z);
  mapContext.fillStyle = '#efb25b';
  mapContext.beginPath();
  mapContext.arc(
    (playerCell.col + 0.5) * cellWidth,
    (playerCell.row + 0.5) * cellHeight,
    Math.max(3.5, cellWidth * 0.45),
    0,
    Math.PI * 2
  );
  mapContext.fill();

  mapContext.fillStyle = '#65ffb8';
  mapContext.fillRect(
    (exitCell.col + 0.25) * cellWidth,
    (exitCell.row + 0.25) * cellHeight,
    cellWidth * 0.5,
    cellHeight * 0.5
  );
}

function getKeyboardMove() {
  let x = 0;
  let y = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  return { x, y };
}

function movingAmount() {
  if (!gameActive || player.won) return 0;
  if (USE_MOBILE_SENSORS) return clamp(mobileSpeed / PLAYER_SPEED, 0, 1);
  const keyboard = getKeyboardMove();
  return Math.min(1, Math.hypot(keyboard.x, keyboard.y));
}

function applyMobileOrientation() {
  if (!mobileCalibrated) return;
  const orientation = sensors.getRelativeOrientation();
  if (!orientation.available) return;

  player.yaw = Math.PI + THREE.MathUtils.degToRad(orientation.yaw * MOBILE_YAW_DIRECTION);
  player.pitch = clamp(
    THREE.MathUtils.degToRad(orientation.pitch * MOBILE_PITCH_DIRECTION * MOBILE_PITCH_SCALE),
    THREE.MathUtils.degToRad(-MOBILE_PITCH_LIMIT),
    THREE.MathUtils.degToRad(MOBILE_PITCH_LIMIT)
  );
}

function moveToward(current, target, maxDelta) {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return target;
}

function getSensorStatus() {
  if (!USE_MOBILE_SENSORS) return '桌面';
  const capabilities = sensors.getCapabilities();
  if (mobileCalibrated) return '已校准';
  if (!capabilities.secure) return '需 HTTPS';
  if (!capabilities.orientation || !capabilities.motion) return '不支持';
  if (sensors.permissionState === 'denied') return '无权限';
  if (sensors.hasOrientation || sensors.hasMotion) return '待确认';
  return '等待';
}

function moveWithCollision(dx, dz) {
  if (dx !== 0 && !collides(player.position.x + dx, player.position.z)) {
    player.position.x += dx;
  }
  if (dz !== 0 && !collides(player.position.x, player.position.z + dz)) {
    player.position.z += dz;
  }
}

function collides(x, z) {
  const min = worldToCell(x - PLAYER_RADIUS, z - PLAYER_RADIUS);
  const max = worldToCell(x + PLAYER_RADIUS, z + PLAYER_RADIUS);
  for (let row = min.row; row <= max.row; row += 1) {
    for (let col = min.col; col <= max.col; col += 1) {
      if (isWall(row, col)) return true;
    }
  }
  return false;
}

function resetPlayer() {
  player.position.set(startPosition.x, PLAYER_HEIGHT, startPosition.z);
  player.yaw = Math.PI;
  player.pitch = 0;
  player.won = false;
  gameActive = false;
  mobileCalibrated = false;
  mobileSpeed = 0;
  stepDetector.reset();
  calibrationScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
}

function findCell(marker) {
  for (let row = 0; row < ROWS; row += 1) {
    const col = MAZE[row].indexOf(marker);
    if (col !== -1) return { row, col };
  }
  throw new Error(`Missing maze marker: ${marker}`);
}

function cellCenter(row, col) {
  return {
    x: ORIGIN_X + col * CELL + CELL / 2,
    z: ORIGIN_Z + row * CELL + CELL / 2
  };
}

function worldToCell(x, z) {
  return {
    col: Math.floor((x - ORIGIN_X) / CELL),
    row: Math.floor((z - ORIGIN_Z) / CELL)
  };
}

function isWall(row, col) {
  if (row < 0 || col < 0 || row >= ROWS || col >= COLS) return true;
  return MAZE[row][col] === '#';
}

function computeReachableCells(start) {
  const reachable = new Set();
  const queue = [start];
  reachable.add(`${start.row},${start.col}`);

  while (queue.length > 0) {
    const current = queue.shift();
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ].forEach(([dr, dc]) => {
      const row = current.row + dr;
      const col = current.col + dc;
      const key = `${row},${col}`;
      if (reachable.has(key) || isWall(row, col)) return;
      reachable.add(key);
      queue.push({ row, col });
    });
  }

  return reachable;
}

function normalizeAngle(angle) {
  let value = angle;
  while (value <= -Math.PI) value += Math.PI * 2;
  while (value > Math.PI) value -= Math.PI * 2;
  return value;
}

function compassFromAngle(angle) {
  const degrees = THREE.MathUtils.radToDeg(angle);
  if (Math.abs(degrees) < 18) return '前';
  if (degrees >= 18 && degrees < 70) return '右前';
  if (degrees >= 70 && degrees < 118) return '右';
  if (degrees >= 118) return '身后';
  if (degrees <= -18 && degrees > -70) return '左前';
  if (degrees <= -70 && degrees > -118) return '左';
  return '身后';
}

function lerp(a, b, amount) {
  const t = clamp(amount, 0, 1);
  return Math.round(a + (b - a) * t);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function seededAngle(row, col) {
  return (((row * 47 + col * 29) % 360) * Math.PI) / 180;
}

function getRenderPixelRatio() {
  const ratio = window.devicePixelRatio || 1;
  return IS_ANDROID ? Math.min(ratio, 1.15) : Math.min(ratio, 2);
}

function getMapPixelRatio() {
  const ratio = window.devicePixelRatio || 1;
  return IS_ANDROID ? 1 : Math.min(ratio, 2);
}

function applyLook(deltaX, deltaY, speed) {
  player.yaw -= deltaX * speed;
  player.pitch = clamp(player.pitch - deltaY * speed, -1.18, 1.08);
}

function updateStartCopy() {
  if (USE_MOBILE_SENSORS) {
    startButton.textContent = '允许传感器并校准方向';
    startHint.textContent = '手机端需要 HTTPS，并允许运动与方向传感器。';
  } else {
    startButton.textContent = '进入迷宫';
    startHint.textContent = '桌面端使用鼠标转向，WASD 或方向键移动。';
  }
}

async function startMobileCalibration() {
  resetPlayer();
  startButton.disabled = true;
  startButton.textContent = '正在请求传感器...';
  startHint.textContent = '请在浏览器弹窗中允许运动与方向权限。';
  let started = false;

  try {
    await sensors.requestPermissions();
    sensors.start();
    if (unsubscribeMotion) unsubscribeMotion();
    unsubscribeMotion = sensors.onMotion((event) => stepDetector.handleMotion(event));

    startScreen.classList.add('hidden');
    calibrationScreen.classList.remove('hidden');
    calibrationStatus.textContent = sensors.hasOrientation
      ? '已读到方向，请保持手机平视并确认。'
      : '等待方向传感器数据...';
    updateHud();
    canvas.focus();
    started = true;
  } catch (error) {
    showStartError(error.message || '传感器权限请求失败。');
  } finally {
    startButton.disabled = false;
    if (started) updateStartCopy();
    else startButton.textContent = '允许传感器并校准方向';
  }
}

function confirmMobileCalibration() {
  if (!sensors.hasOrientation) {
    calibrationStatus.textContent = '还没有读到方向，请稍等再确认。';
    return;
  }

  sensors.calibrate();
  stepDetector.reset();
  mobileSpeed = 0;
  mobileCalibrated = true;
  gameActive = true;
  calibrationScreen.classList.add('hidden');
  canvas.focus();
  updateHud();
}

function startDesktopGame() {
  resetPlayer();
  startScreen.classList.add('hidden');
  gameActive = true;
  canvas.focus();

  if ('requestPointerLock' in canvas) {
    canvas.requestPointerLock();
  }
}

function showStartError(message) {
  startHint.textContent = message;
  startScreen.classList.remove('hidden');
  calibrationScreen.classList.add('hidden');
  updateHud();
}

startButton.addEventListener('click', () => {
  if (USE_MOBILE_SENSORS) {
    startMobileCalibration();
  } else {
    startDesktopGame();
  }
});

confirmCalibrationButton.addEventListener('click', () => {
  confirmMobileCalibration();
});

restartButton.addEventListener('click', () => {
  if (USE_MOBILE_SENSORS) {
    startMobileCalibration();
  } else {
    startDesktopGame();
  }
});

canvas.addEventListener('click', () => {
  if (!gameActive || player.won || USE_MOBILE_SENSORS) return;
  if ('requestPointerLock' in canvas) canvas.requestPointerLock();
});

document.addEventListener('mousemove', (event) => {
  if (USE_MOBILE_SENSORS || !gameActive || document.pointerLockElement !== canvas || player.won) return;
  applyLook(event.movementX, event.movementY, MOUSE_LOOK_SPEED);
});

window.addEventListener('keydown', (event) => {
  keys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

window.addEventListener('resize', () => {
  renderer.setPixelRatio(getRenderPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  drawMap();
});
