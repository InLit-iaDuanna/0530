import * as THREE from 'three';
import { CameraBackground } from './background';
import { Chaser } from './chaser';

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly background = new CameraBackground();
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 80);
  readonly chaser = new Chaser();
  private readonly fog = new THREE.FogExp2(0x05060a, 0.035);

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    this.scene.fog = this.fog;
    this.scene.add(this.chaser.group);
    this.scene.add(new THREE.HemisphereLight(0xe7f0ff, 0x17171d, 1.4));

    const rim = new THREE.DirectionalLight(0xffffff, 2.2);
    rim.position.set(0, 2.2, 2.8);
    this.scene.add(rim);

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  setCameraVideo(video: HTMLVideoElement): void {
    this.background.useVideo(video);
  }

  setFallbackBackground(): void {
    this.background.useFallback();
  }

  render(yaw: number, pitch: number): void {
    this.camera.rotation.set(pitch, yaw, 0, 'YXZ');
    this.renderer.clear();
    this.renderer.render(this.background.scene, this.background.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
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
