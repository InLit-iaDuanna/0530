import * as THREE from 'three';
import { DEFAULT_CHASE_CONFIG, type ChaseSnapshot } from '../game/chase-ai';
import { Chaser } from './chaser';

const ROOM_RENDER_HALF_SIZE = DEFAULT_CHASE_CONFIG.ROOM_HALF_SIZE + 2;
const ROOM_RENDER_SIZE = ROOM_RENDER_HALF_SIZE * 2;

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.1, 120);
  readonly chaser = new Chaser();
  private readonly fog = new THREE.FogExp2(0x05060a, 0.035);

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x05070b, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0x080b11);
    this.scene.add(this.chaser.group);
    this.scene.add(new THREE.HemisphereLight(0xe7f0ff, 0x1c1f27, 1.3));

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-4, 9, 5);
    this.scene.add(key);

    this.buildRoom();

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  render(snapshot: ChaseSnapshot, yaw: number, pitch: number): void {
    this.camera.position.set(snapshot.player.x, 1.62, snapshot.player.z);
    this.camera.rotation.set(pitch, yaw, 0, 'YXZ');
    this.renderer.render(this.scene, this.camera);
  }

  private buildRoom(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_RENDER_SIZE, ROOM_RENDER_SIZE, 36, 36),
      new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_RENDER_SIZE, ROOM_RENDER_SIZE, 36, 36),
      new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 1, side: THREE.BackSide }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    this.scene.add(ceiling);

    const grid = new THREE.GridHelper(ROOM_RENDER_SIZE, 36, 0x55606e, 0x303844);
    grid.position.y = 0.01;
    this.scene.add(grid);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x232a34, roughness: 0.9 });
    const back = wall(ROOM_RENDER_SIZE, 4, wallMaterial);
    back.position.set(0, 2, ROOM_RENDER_HALF_SIZE);
    this.scene.add(back);

    const front = wall(ROOM_RENDER_SIZE, 4, wallMaterial);
    front.position.set(0, 2, -ROOM_RENDER_HALF_SIZE);
    this.scene.add(front);

    const left = wall(ROOM_RENDER_SIZE, 4, wallMaterial);
    left.rotation.y = Math.PI / 2;
    left.position.set(-ROOM_RENDER_HALF_SIZE, 2, 0);
    this.scene.add(left);

    const right = wall(ROOM_RENDER_SIZE, 4, wallMaterial);
    right.rotation.y = Math.PI / 2;
    right.position.set(ROOM_RENDER_HALF_SIZE, 2, 0);
    this.scene.add(right);

    for (let i = 0; i < 10; i += 1) {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 2.6, 0.18),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x8be9b2 : 0xff4f5f }),
      );
      marker.position.set(-27 + i * 6, 1.3, -ROOM_RENDER_HALF_SIZE + 0.15);
      this.scene.add(marker);
    }

    const startArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.6, 3),
      new THREE.MeshBasicMaterial({ color: 0xff4f5f }),
    );
    startArrow.rotation.x = Math.PI / 2;
    startArrow.position.set(0, 0.05, 4.5);
    this.scene.add(startArrow);
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.host.removeChild(this.renderer.domElement);
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
}

function wall(width: number, height: number, material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.32), material);
}
