import * as THREE from 'three';

export class CameraBackground {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mesh: THREE.Mesh;
  private texture: THREE.VideoTexture | null = null;

  constructor() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x06070a });
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  useVideo(video: HTMLVideoElement): void {
    this.texture?.dispose();
    this.texture = new THREE.VideoTexture(video);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.mesh.material = new THREE.MeshBasicMaterial({ map: this.texture });
  }

  useFallback(): void {
    this.texture?.dispose();
    this.texture = null;
    this.mesh.material = new THREE.MeshBasicMaterial({ color: 0x07090f });
  }
}
