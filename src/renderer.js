import * as THREE from "../vendor/three.module.min.js";
import { CONFIG, ALERT_LEVELS } from "./config.js";

export class GhostRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111a17);
    this.scene.fog = new THREE.FogExp2(0x17241f, 0.024);

    this.camera = new THREE.PerspectiveCamera(CONFIG.FOV, 1, CONFIG.NEAR, CONFIG.FAR);
    this.camera.position.set(0, 1.65, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.desktopYaw = 0;
    this.desktopPitch = 0;
    this.isDragging = false;
    this.lastPointer = null;
    this.smoothedYaw = 0;
    this.smoothedPitch = 0;
    this.cardinalLockAnchor = null;
    this.ghostGroup = new THREE.Group();
    this.monsterParts = {};
    this.forestItems = [];
    this.warningLights = [];
    this.playerTravel = 0;
    this.lastTravelElapsed = 0;
    this.redBackLight = null;
    this.clock = new THREE.Clock();

    this.buildScene();
    this.bindResize();
    this.bindDesktopControls();
    this.resize();
  }

  buildScene() {
    this.scene.add(new THREE.HemisphereLight(0xc6d8cf, 0x273124, 1.08));
    this.scene.add(new THREE.AmbientLight(0xa0afa5, 0.5));

    const moon = new THREE.DirectionalLight(0xd6e8ff, 1.55);
    moon.position.set(-6, 9, -7);
    this.scene.add(moon);

    this.redBackLight = new THREE.PointLight(0xff2b2b, 0.75, 18);
    this.redBackLight.position.set(0, 2.5, 9);
    this.scene.add(this.redBackLight);

    this.addForestPath();
    this.addGhost();
  }

  addForestPath() {
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x182319, roughness: 0.98, metalness: 0.01 });
    const slopeMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2c1a, roughness: 0.98 });
    const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x3b2d1e, roughness: 1 });
    const pathStripeMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
    const pathEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x24301f, roughness: 1 });
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3c2b1d, roughness: 0.9 });
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x24513d, roughness: 0.92 });
    const darkFoliageMaterial = new THREE.MeshStandardMaterial({ color: 0x1a342b, roughness: 0.96 });
    const farFoliageMaterial = new THREE.MeshStandardMaterial({ color: 0x173025, roughness: 1 });
    const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x1b3a2c, roughness: 1 });
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x3c4240, roughness: 0.95 });
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x2f5131, roughness: 0.98 });
    const paleTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x85826b, roughness: 0.9 });
    const mistMaterial = new THREE.MeshBasicMaterial({
      color: 0xc7d4cc,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const groundGeometry = new THREE.PlaneGeometry(72, 12, 4, 1);
    const slopeGeometry = new THREE.PlaneGeometry(13, 12, 1, 1);
    const pathGeometry = new THREE.PlaneGeometry(5.3, 12, 2, 2);
    const pathStripeGeometry = new THREE.PlaneGeometry(0.12, 1.8, 1, 1);
    const edgeGeometry = new THREE.PlaneGeometry(2.4, 12, 1, 1);
    const mistGeometry = new THREE.PlaneGeometry(28, 3.4, 1, 1);
    const grassGeometry = new THREE.ConeGeometry(0.14, 0.58, 5);
    const worldStartZ = CONFIG.FOREST_VIEW_MAX_Z - CONFIG.FOREST_WORLD_LENGTH;
    const worldEndZ = CONFIG.FOREST_VIEW_MAX_Z + 36;
    const worldSpan = worldEndZ - worldStartZ;
    const segmentCount = Math.ceil(worldSpan / 12) + 1;

    for (let index = 0; index < segmentCount; index += 1) {
      const baseZ = worldStartZ + index * 12;
      const wiggle = Math.sin(index * 1.7) * 0.22;
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, -0.01, baseZ);
      this.scene.add(ground);
      this.registerForestItem(ground, baseZ, 0);

      const path = new THREE.Mesh(pathGeometry, pathMaterial);
      path.rotation.x = -Math.PI / 2;
      path.position.set(wiggle, 0.025, baseZ);
      this.scene.add(path);
      this.registerForestItem(path, baseZ, wiggle);

      for (const side of [-1, 1]) {
        const slope = new THREE.Mesh(slopeGeometry, slopeMaterial);
        slope.rotation.x = -Math.PI / 2;
        slope.rotation.z = side * 0.18;
        slope.position.set(side * 12.5, 0.28, baseZ);
        this.scene.add(slope);
        this.registerForestItem(slope, baseZ, side * 12.5);

        const edge = new THREE.Mesh(edgeGeometry, pathEdgeMaterial);
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(wiggle + side * 3.8, 0.03, baseZ);
        this.scene.add(edge);
        this.registerForestItem(edge, baseZ, wiggle + side * 3.8);
      }

      for (let stripeIndex = 0; stripeIndex < 3; stripeIndex += 1) {
        const stripeBaseZ = baseZ - 4 + stripeIndex * 4;
        const stripe = new THREE.Mesh(pathStripeGeometry, pathStripeMaterial);
        stripe.rotation.x = -Math.PI / 2;
        stripe.rotation.z = random01(index * 6.1 + stripeIndex) * 1.2 - 0.6;
        stripe.position.set(wiggle + (random01(index * 3.2 + stripeIndex) - 0.5) * 3.4, 0.035, stripeBaseZ);
        this.scene.add(stripe);
        this.registerForestItem(stripe, stripeBaseZ, stripe.position.x, stripe.rotation.z);
      }

      if (index % 2 === 0) {
        const mist = new THREE.Mesh(mistGeometry, mistMaterial);
        mist.position.set(0, 1.05 + random01(index) * 0.45, baseZ - 3);
        mist.rotation.y = random01(index * 2.9) * 0.26 - 0.13;
        this.scene.add(mist);
        this.registerForestItem(mist, baseZ - 3, 0, random01(index * 4.4) * Math.PI * 2);
      }

      if (index % 3 === 0) {
        const canopy = createCanopyCluster(canopyMaterial, 0.92 + random01(index * 9.8) * 0.22);
        canopy.position.set((random01(index * 12.3) - 0.5) * 4.5, 5.1, baseZ - 1.8);
        canopy.rotation.y = random01(index * 15.6) * Math.PI * 2;
        this.scene.add(canopy);
        this.registerForestItem(canopy, baseZ - 1.8, canopy.position.x, random01(index * 3.4) * Math.PI * 2);
      }
    }

    for (let index = 0; index < 180; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const seed = random01(index * 23.7);
      const x = side * (2.55 + random01(index * 5.21) * 0.95);
      const baseZ = worldStartZ + random01(index * 4.73) * worldSpan;
      const tree = createTree({
        scale: 0.48 + seed * 0.72,
        trunkMaterial,
        foliageMaterial: seed > 0.44 ? foliageMaterial : darkFoliageMaterial,
      });
      tree.position.set(x, 0, baseZ);
      tree.rotation.y = random01(index * 10.9) * Math.PI * 2;
      this.scene.add(tree);
      this.registerForestItem(tree, baseZ, x, random01(index * 14.6) * Math.PI * 2);
    }

    for (let index = 0; index < 260; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const baseZ = worldStartZ + random01(index * 7.37) * worldSpan;
      const x = side * (2.05 + random01(index * 2.83) * 1.1);
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.position.set(x, 0.29, baseZ);
      grass.scale.setScalar(0.65 + random01(index * 3.1) * 0.75);
      grass.rotation.set(0, random01(index * 8.4) * Math.PI * 2, side * 0.18);
      this.scene.add(grass);
      this.registerForestItem(grass, baseZ, x, random01(index * 9.9) * Math.PI * 2);
    }

    for (let index = 0; index < 180; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const lane = Math.floor(index / 2);
      const seed = random01(index * 12.37);
      const x = side * (1.75 + random01(index * 4.21) * 0.72);
      const baseZ = 24 - lane * 7.2 + random01(index * 6.13) * 1.9;
      const marker = createTracksideTree({
        scale: 0.58 + seed * 0.38,
        trunkMaterial: index % 5 === 0 ? paleTrunkMaterial : trunkMaterial,
        foliageMaterial: index % 3 === 0 ? foliageMaterial : darkFoliageMaterial,
      });
      marker.position.set(x, 0, baseZ);
      marker.rotation.y = random01(index * 5.91) * Math.PI * 2;
      this.scene.add(marker);
      this.registerForestItem(marker, baseZ, x, random01(index * 8.9) * Math.PI * 2);
    }

    for (let index = 0; index < 210; index += 1) {
      const seed = random01(index * 19.17);
      const side = index % 2 === 0 ? -1 : 1;
      const distanceFromPath = 4.2 + random01(index * 2.31) * 12;
      const x = side * distanceFromPath + (random01(index * 7.23) - 0.5) * 0.8;
      const baseZ = worldStartZ + random01(index * 5.91) * worldSpan;
      const tree = createTree({
        scale: 0.75 + seed * 1.45,
        trunkMaterial,
        foliageMaterial: seed > 0.48 ? foliageMaterial : darkFoliageMaterial,
      });
      tree.position.set(x, 0, baseZ);
      tree.rotation.y = random01(index * 11.4) * Math.PI * 2;
      this.scene.add(tree);
      this.registerForestItem(tree, baseZ, x, random01(index * 13.2) * Math.PI * 2);
    }

    for (let index = 0; index < 120; index += 1) {
      const seed = random01(index * 31.7);
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (15 + random01(index * 8.4) * 13);
      const baseZ = worldStartZ + random01(index * 9.13) * worldSpan;
      const tree = createTree({
        scale: 1.25 + seed * 2.3,
        trunkMaterial,
        foliageMaterial: farFoliageMaterial,
      });
      tree.position.set(x, 0, baseZ);
      tree.rotation.y = random01(index * 17.9) * Math.PI * 2;
      this.scene.add(tree);
      this.registerForestItem(tree, baseZ, x, random01(index * 18.1) * Math.PI * 2);
    }

    for (let index = 0; index < 100; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const baseZ = worldStartZ + random01(index * 8.33) * worldSpan;
      const x = side * (2.8 + random01(index * 4.7) * 3.4);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + random01(index) * 0.32, 0), rockMaterial);
      rock.position.set(x, 0.16, baseZ);
      rock.rotation.set(random01(index * 2) * 0.8, random01(index * 3) * 3, random01(index * 4) * 0.6);
      this.scene.add(rock);
      this.registerForestItem(rock, baseZ, x);
    }

    for (let index = 0; index < 26; index += 1) {
      const glow = new THREE.PointLight(0xffa65c, 0.24, 9);
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (3.6 + random01(index * 4.2) * 2.4);
      const baseZ = worldStartZ + index * 28;
      glow.position.set(x, 1.1, baseZ);
      this.warningLights.push(glow);
      this.scene.add(glow);
      this.registerForestItem(glow, baseZ, x);
    }
  }

  addGhost() {
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0x050607,
      emissive: 0x030606,
      emissiveIntensity: 0.7,
      roughness: 0.36,
      metalness: 0.2,
    });
    const wetSkinMaterial = new THREE.MeshStandardMaterial({
      color: 0x010202,
      emissive: 0x07110f,
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.42,
    });
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4fff6,
      emissive: 0xcffff6,
      emissiveIntensity: 1.85,
      roughness: 0.25,
    });
    const mouthMaterial = new THREE.MeshStandardMaterial({
      color: 0x5b0303,
      emissive: 0xff1010,
      emissiveIntensity: 0.75,
      roughness: 0.45,
    });
    const tongueMaterial = new THREE.MeshStandardMaterial({
      color: 0xbc102a,
      emissive: 0xff203f,
      emissiveIntensity: 0.55,
      roughness: 0.32,
    });
    const toothMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5efd7,
      emissive: 0x6a5b3d,
      emissiveIntensity: 0.25,
      roughness: 0.42,
    });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.55, 7, 12), wetSkinMaterial);
    body.position.y = 1.25;
    body.scale.set(0.9, 1.05, 0.7);

    const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 1), skinMaterial);
    chest.position.set(0, 1.65, -0.02);
    chest.scale.set(0.9, 1.25, 0.62);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 1), wetSkinMaterial);
    head.position.set(0, 2.5, -0.08);
    head.scale.set(1.02, 0.88, 0.78);

    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), skinMaterial);
    jaw.position.set(0, 2.26, -0.38);
    jaw.scale.set(1.2, 0.38, 0.52);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.05), mouthMaterial);
    mouth.position.set(0, 2.31, -0.66);

    const tongueCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.28, -0.68),
      new THREE.Vector3(0.03, 2.14, -0.96),
      new THREE.Vector3(-0.04, 2.02, -1.2),
      new THREE.Vector3(0.08, 1.92, -1.42),
    ]);
    const tongue = new THREE.Mesh(new THREE.TubeGeometry(tongueCurve, 16, 0.045, 7, false), tongueMaterial);

    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8), eyeMaterial);
    leftEye.position.set(-0.22, 2.58, -0.48);
    leftEye.scale.set(1.55, 0.45, 0.2);
    leftEye.rotation.z = -0.18;
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.22;
    rightEye.rotation.z = 0.18;

    const teeth = [];
    for (let index = 0; index < 8; index += 1) {
      const x = -0.28 + index * 0.08;
      const upper = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.16, 5), toothMaterial);
      upper.position.set(x, 2.39, -0.7);
      upper.rotation.x = Math.PI;
      const lower = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.13, 5), toothMaterial);
      lower.position.set(x + 0.035, 2.24, -0.69);
      teeth.push(upper, lower);
    }

    const leftArm = createClawedArm(-1, wetSkinMaterial, toothMaterial);
    const rightArm = createClawedArm(1, wetSkinMaterial, toothMaterial);
    const leftLeg = createMonsterLeg(-1, skinMaterial);
    const rightLeg = createMonsterLeg(1, skinMaterial);

    const tendrils = [];
    for (let index = 0; index < 5; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const tendril = createBackTendril(side, index, wetSkinMaterial);
      tendrils.push(tendril);
    }

    const mouthLight = new THREE.PointLight(0xff1828, 1.2, 4);
    mouthLight.position.set(0, 2.25, -0.82);

    this.ghostGroup.add(
      body,
      chest,
      head,
      jaw,
      mouth,
      tongue,
      leftEye,
      rightEye,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      mouthLight,
      ...teeth,
      ...tendrils
    );
    this.monsterParts = {
      body,
      chest,
      head,
      jaw,
      tongue,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      mouthLight,
      tendrils,
    };
    this.scene.add(this.ghostGroup);
  }

  update(gameState, orientation, desktopMode = false) {
    const elapsed = this.clock.getElapsedTime();
    this.updatePlayerPosition(gameState.playerPosition || 0, elapsed);
    this.updateCamera(orientation, desktopMode);
    this.updateGhost(gameState.ghostDistance, elapsed);
    this.updateLights(gameState.alertLevel, elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera(orientation, desktopMode) {
    if (desktopMode) {
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.y = this.desktopYaw;
      this.camera.rotation.x = this.desktopPitch;
      this.camera.rotation.z = 0;
      return;
    }

    const rawYaw = (orientation?.yaw || 0) * CONFIG.CAMERA_YAW_DIRECTION;
    const targetYaw = this.stabilizeCardinalYaw(rawYaw);
    const targetPitch = THREE.MathUtils.clamp(
      (orientation?.pitch || 0) * CONFIG.CAMERA_PITCH_DIRECTION * CONFIG.CAMERA_PITCH_SCALE,
      -CONFIG.CAMERA_PITCH_LIMIT,
      CONFIG.CAMERA_PITCH_LIMIT
    );

    this.smoothedYaw = smoothAngle(this.smoothedYaw, targetYaw, CONFIG.CAMERA_SMOOTHING);
    this.smoothedPitch = THREE.MathUtils.lerp(this.smoothedPitch, targetPitch, CONFIG.CAMERA_SMOOTHING);

    const yaw = THREE.MathUtils.degToRad(this.smoothedYaw);
    const pitch = THREE.MathUtils.degToRad(this.smoothedPitch);
    // Roll is intentionally ignored so a small hand tilt does not make the view corkscrew.
    this.camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  }

  resetOrientation() {
    this.smoothedYaw = 0;
    this.smoothedPitch = 0;
    this.cardinalLockAnchor = null;
    this.playerTravel = 0;
    this.lastTravelElapsed = this.clock.getElapsedTime();
    this.camera.position.set(0, 1.65, 0);
  }

  stabilizeCardinalYaw(yaw) {
    const { anchor, delta } = findNearestCardinal(yaw);

    if (this.cardinalLockAnchor !== null) {
      const lockDelta = normalizeAngle(yaw - this.cardinalLockAnchor);
      if (Math.abs(lockDelta) <= CONFIG.CAMERA_CARDINAL_LOCK_RELEASE) {
        return this.cardinalLockAnchor;
      }
      this.cardinalLockAnchor = null;
    }

    if (Math.abs(delta) <= CONFIG.CAMERA_CARDINAL_LOCK_ENTER) {
      this.cardinalLockAnchor = anchor;
      return anchor;
    }

    return softenNearCardinal(yaw, anchor, delta);
  }

  updateGhost(distance, elapsed) {
    const runPulse = elapsed * 10.2;
    const bob = Math.sin(runPulse) * 0.11;
    this.ghostGroup.position.set(0, bob, this.camera.position.z + distance);
    this.ghostGroup.lookAt(this.camera.position);
    const scale = THREE.MathUtils.clamp(1.1 + (30 - distance) * 0.025, 1.1, 1.9);
    this.ghostGroup.scale.setScalar(scale);
    if (this.redBackLight) {
      this.redBackLight.position.set(0, 2.5, this.camera.position.z + Math.min(distance, 12));
    }

    const parts = this.monsterParts;
    if (parts.body) {
      parts.body.rotation.z = Math.sin(runPulse * 0.5) * 0.08;
      parts.chest.rotation.z = Math.sin(runPulse * 0.5 + 0.7) * 0.1;
      parts.head.rotation.y = Math.sin(elapsed * 3.6) * 0.14;
      parts.head.rotation.z = Math.sin(elapsed * 4.2) * 0.08;
      parts.jaw.rotation.x = 0.12 + Math.sin(elapsed * 7.2) * 0.12;
      parts.tongue.rotation.y = Math.sin(elapsed * 9.0) * 0.22;
      parts.tongue.rotation.x = Math.sin(elapsed * 6.5) * 0.12;
      parts.tongue.scale.set(1, 1 + Math.sin(elapsed * 5.5) * 0.06, 1 + Math.sin(elapsed * 8.3) * 0.12);
      parts.leftArm.rotation.x = -0.45 + Math.sin(runPulse) * 0.48;
      parts.rightArm.rotation.x = -0.45 + Math.sin(runPulse + Math.PI) * 0.48;
      parts.leftArm.rotation.z = -0.42 + Math.sin(runPulse + 0.5) * 0.26;
      parts.rightArm.rotation.z = 0.42 + Math.sin(runPulse + Math.PI + 0.5) * 0.26;
      animateMonsterLeg(parts.leftLeg, runPulse + Math.PI);
      animateMonsterLeg(parts.rightLeg, runPulse);
      parts.mouthLight.intensity = 0.8 + Math.sin(elapsed * 11) * 0.35;
      for (let index = 0; index < parts.tendrils.length; index += 1) {
        parts.tendrils[index].rotation.y = Math.sin(elapsed * 4.6 + index) * 0.28;
        parts.tendrils[index].rotation.z = Math.cos(elapsed * 5.2 + index) * 0.18;
      }
    }
  }

  updateLights(alertLevel, elapsed) {
    const intensity = alertLevel === ALERT_LEVELS.RED ? 1.4 : alertLevel === ALERT_LEVELS.ORANGE ? 0.9 : 0.45;
    for (const light of this.warningLights) {
      light.intensity = intensity + Math.sin(elapsed * 6) * 0.18;
    }
  }

  updatePlayerPosition(playerPosition, elapsed) {
    const delta = Math.max(0, elapsed - this.lastTravelElapsed);
    this.lastTravelElapsed = elapsed;
    const targetScroll = playerPosition * CONFIG.FOREST_SCROLL_SCALE;
    const amount = 1 - Math.exp(-CONFIG.FOREST_SCROLL_SMOOTHING * delta);
    this.playerTravel += (targetScroll - this.playerTravel) * amount;
    this.camera.position.set(0, 1.65, -this.playerTravel);
  }

  registerForestItem(item, baseZ, baseX, phase = 0) {
    item.userData.baseZ = baseZ;
    item.userData.baseX = baseX;
    item.userData.phase = phase;
    this.forestItems.push(item);
  }

  getDebugState() {
    return {
      cameraZ: this.camera.position.z,
      playerTravel: this.playerTravel,
      forestItems: this.forestItems.length,
    };
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  bindResize() {
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => setTimeout(() => this.resize(), 250));
  }

  bindDesktopControls() {
    this.canvas.addEventListener("pointerdown", (event) => {
      this.isDragging = true;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture(event.pointerId);
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.isDragging || !this.lastPointer) {
        return;
      }
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      this.desktopYaw -= dx * 0.006;
      this.desktopPitch = THREE.MathUtils.clamp(this.desktopPitch - dy * 0.006, -1.2, 1.2);
      this.lastPointer = { x: event.clientX, y: event.clientY };
    });

    window.addEventListener("pointerup", () => {
      this.isDragging = false;
      this.lastPointer = null;
    });
  }
}

function smoothAngle(current, target, amount) {
  const delta = ((((target - current + 180) % 360) + 360) % 360) - 180;
  return current + delta * amount;
}

function findNearestCardinal(yaw) {
  const anchors = [0, 180, -180];
  let anchor = 0;
  let delta = normalizeAngle(yaw);

  for (const candidate of anchors) {
    const candidateDelta = normalizeAngle(yaw - candidate);
    if (Math.abs(candidateDelta) < Math.abs(delta)) {
      anchor = candidate;
      delta = candidateDelta;
    }
  }

  return { anchor, delta };
}

function softenNearCardinal(yaw, anchor, delta) {
  const distance = Math.abs(delta);
  if (distance <= CONFIG.CAMERA_CARDINAL_DEADZONE) {
    return anchor;
  }

  if (distance <= CONFIG.CAMERA_CARDINAL_SOFT_ZONE) {
    const range = CONFIG.CAMERA_CARDINAL_SOFT_ZONE - CONFIG.CAMERA_CARDINAL_DEADZONE;
    const t = (distance - CONFIG.CAMERA_CARDINAL_DEADZONE) / range;
    const softened = Math.sign(delta) * range * t * t;
    return normalizeAngle(anchor + softened);
  }

  return normalizeAngle(yaw);
}

function normalizeAngle(value) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function createTree({ scale, trunkMaterial, foliageMaterial }) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.2 * scale, 2.5 * scale, 6), trunkMaterial);
  trunk.position.y = 1.25 * scale;
  tree.add(trunk);

  for (let layer = 0; layer < 3; layer += 1) {
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry((0.82 - layer * 0.15) * scale, 1.42 * scale, 7),
      foliageMaterial
    );
    foliage.position.y = (2.1 + layer * 0.62) * scale;
    foliage.rotation.y = layer * 0.7;
    tree.add(foliage);
  }

  return tree;
}

function createTracksideTree({ scale, trunkMaterial, foliageMaterial }) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.17 * scale, 2.0 * scale, 6), trunkMaterial);
  trunk.position.y = 1.0 * scale;
  tree.add(trunk);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.72 * scale, 1.15 * scale, 7), foliageMaterial);
  crown.position.y = 2.05 * scale;
  tree.add(crown);

  const top = new THREE.Mesh(new THREE.ConeGeometry(0.5 * scale, 0.9 * scale, 7), foliageMaterial);
  top.position.y = 2.72 * scale;
  top.rotation.y = 0.45;
  tree.add(top);

  return tree;
}

function createClawedArm(side, skinMaterial, clawMaterial) {
  const arm = new THREE.Group();
  arm.position.set(side * 0.55, 1.85, -0.06);
  arm.rotation.z = side * 0.42;

  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.58, 4, 7), skinMaterial);
  upper.position.y = -0.24;
  upper.rotation.z = side * 0.2;

  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.64, 4, 7), skinMaterial);
  forearm.position.set(side * 0.1, -0.74, -0.08);
  forearm.rotation.z = side * 0.28;
  forearm.rotation.x = -0.35;

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), skinMaterial);
  hand.position.set(side * 0.18, -1.12, -0.14);
  hand.scale.set(1.25, 0.65, 0.75);

  for (let index = 0; index < 4; index += 1) {
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.22, 5), clawMaterial);
    claw.position.set(side * (0.12 + index * 0.035), -1.2, -0.2 - index * 0.015);
    claw.rotation.x = Math.PI / 2;
    claw.rotation.z = side * (0.2 + index * 0.1);
    arm.add(claw);
  }

  arm.add(upper, forearm, hand);
  return arm;
}

function createMonsterLeg(side, skinMaterial) {
  const leg = new THREE.Group();
  leg.position.set(side * 0.34, 1.6, 0.05);

  const tendonMaterial = new THREE.MeshStandardMaterial({
    color: 0x070909,
    emissive: 0x350304,
    emissiveIntensity: 0.34,
    roughness: 0.22,
    metalness: 0.35,
  });
  const clawMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f0f0c,
    emissive: 0x3c0404,
    emissiveIntensity: 0.75,
    roughness: 0.24,
    metalness: 0.38,
  });
  const landingMaterial = new THREE.MeshBasicMaterial({
    color: 0xff1d1d,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 7), skinMaterial);
  hip.scale.set(1.05, 0.75, 0.85);
  hip.position.set(0, -0.03, 0.01);

  const thighPivot = new THREE.Group();
  thighPivot.position.set(0, -0.03, 0);

  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.64, 5, 8), skinMaterial);
  thigh.position.y = -0.32;
  thigh.rotation.z = side * 0.07;

  const kneePivot = new THREE.Group();
  kneePivot.position.set(side * 0.025, -0.72, 0.02);

  const knee = new THREE.Mesh(new THREE.SphereGeometry(0.115, 9, 6), tendonMaterial);
  knee.scale.set(1.05, 0.82, 0.95);

  const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.66, 5, 8), skinMaterial);
  shin.position.set(side * 0.02, -0.34, -0.01);
  shin.rotation.z = -side * 0.05;

  const anklePivot = new THREE.Group();
  anklePivot.position.set(side * 0.02, -0.72, -0.01);

  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.5), tendonMaterial);
  foot.position.set(side * 0.045, -0.06, -0.2);
  foot.rotation.x = -0.16;
  foot.scale.set(1.05, 1, 1);

  const heel = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), tendonMaterial);
  heel.position.set(side * 0.02, -0.04, 0.06);
  heel.scale.set(1, 0.65, 0.95);

  const landingGlow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), landingMaterial);
  landingGlow.rotation.x = -Math.PI / 2;
  landingGlow.position.set(0, -1.56, -0.16);
  landingGlow.scale.set(1.15, 0.42, 1);

  const toeClaws = [];
  for (let index = 0; index < 3; index += 1) {
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.24, 5), clawMaterial);
    claw.position.set(side * (-0.08 + index * 0.08), -0.08, -0.48);
    claw.rotation.x = -Math.PI / 2;
    claw.rotation.z = side * (0.08 + index * 0.04);
    toeClaws.push(claw);
    anklePivot.add(claw);
  }

  anklePivot.add(heel, foot);
  kneePivot.add(knee, shin, anklePivot);
  thighPivot.add(thigh, kneePivot);
  leg.add(hip, thighPivot, landingGlow);
  leg.userData = { hip, thighPivot, kneePivot, anklePivot, thigh, shin, foot, heel, toeClaws, landingGlow };
  return leg;
}

function animateMonsterLeg(leg, phase) {
  const stride = Math.sin(phase);
  const counterStride = Math.cos(phase);
  const lift = Math.max(0, stride);
  const plant = Math.max(0, -stride);
  const side = leg.position.x > 0 ? 1 : -1;
  const hipSwing = -stride * 0.78;
  const kneeBend = 0.28 + lift * 1.1 + plant * 0.2;
  const ankleBend = -0.2 + lift * 0.58 - plant * 0.26;
  const footReach = -0.2 - stride * 0.24;

  leg.position.x = side * (0.34 + Math.abs(stride) * 0.03);
  leg.position.y = 1.6 + lift * 0.18 - plant * 0.035;
  leg.position.z = stride * 0.12;
  leg.rotation.z = side * (0.07 + plant * 0.05);

  const { hip, thighPivot, kneePivot, anklePivot, thigh, shin, foot, heel, toeClaws, landingGlow } = leg.userData;
  hip.scale.set(1.08 + plant * 0.08, 0.74 + lift * 0.08, 0.86);
  thighPivot.rotation.x = hipSwing;
  thighPivot.rotation.z = side * (0.08 + counterStride * 0.04);
  kneePivot.rotation.x = kneeBend;
  anklePivot.rotation.x = ankleBend;
  anklePivot.position.z = -stride * 0.08;
  thigh.rotation.x = -0.08 + lift * 0.12;
  shin.rotation.x = 0.08 + plant * 0.08;
  foot.position.z = footReach;
  foot.position.y = -0.06 + lift * 0.05 - plant * 0.015;
  foot.rotation.x = -0.2 + lift * 0.4 - plant * 0.14;
  heel.position.z = 0.04 + plant * 0.05;
  heel.scale.set(1 + plant * 0.12, 0.65, 0.95);

  for (let index = 0; index < toeClaws.length; index += 1) {
    toeClaws[index].position.z = -0.48 - stride * 0.18;
    toeClaws[index].position.y = -0.08 + lift * 0.045;
    toeClaws[index].rotation.x = -Math.PI / 2 + lift * 0.36 - plant * 0.12;
    toeClaws[index].material.emissiveIntensity = 0.45 + plant * 0.85;
  }

  landingGlow.position.z = -0.16 + plant * 0.1;
  landingGlow.scale.set(1.15 + plant * 0.9, 0.42 + plant * 0.32, 1);
  landingGlow.material.opacity = 0.02 + plant * 0.22;
}

function createBackTendril(side, index, material) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.24, 2.05 - index * 0.12, 0.12),
    new THREE.Vector3(side * (0.48 + index * 0.06), 1.92 - index * 0.08, 0.36),
    new THREE.Vector3(side * (0.72 + index * 0.07), 1.66 - index * 0.1, 0.18),
    new THREE.Vector3(side * (0.48 + index * 0.04), 1.4 - index * 0.08, -0.08),
  ]);
  const tendril = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.035, 6, false), material);
  tendril.rotation.z = side * 0.12;
  return tendril;
}

function createCanopyCluster(material, scale) {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const offsets = [
    [-3.9, 0, 0],
    [-1.7, 0.35, -0.4],
    [0.5, 0.1, 0.2],
    [2.7, 0.28, -0.3],
    [4.4, -0.08, 0.1],
  ];

  for (let index = 0; index < offsets.length; index += 1) {
    const crown = new THREE.Mesh(geometry, material);
    const [x, y, z] = offsets[index];
    crown.position.set(x * scale, y * scale, z * scale);
    crown.scale.set(1.85 * scale, 0.68 * scale, 1.2 * scale);
    crown.rotation.set(0.15 * index, index * 0.8, 0.1);
    group.add(crown);
  }

  return group;
}

function random01(seed) {
  return fract(Math.sin(seed * 91.345 + 17.17) * 43758.5453);
}

function fract(value) {
  return value - Math.floor(value);
}
