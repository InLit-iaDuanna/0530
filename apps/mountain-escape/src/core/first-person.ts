import * as THREE from 'three';

export class FirstPersonControls {
  yaw = 0;
  pitch = 0;
  private draggingLook = false;
  private enabled = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.PerspectiveCamera,
  ) {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('dblclick', this.requestPointerLock);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.draggingLook = false;
    }
  }

  setYawPitch(yaw: number, pitch = 0): void {
    this.yaw = yaw;
    this.pitch = THREE.MathUtils.clamp(pitch, -Math.PI * 0.46, Math.PI * 0.46);
    this.applyRotation();
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('dblclick', this.requestPointerLock);
  }

  private applyRotation(): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private readonly handlePointerDown = (): void => {
    this.draggingLook = this.enabled && document.pointerLockElement !== this.canvas;
  };

  private readonly handlePointerUp = (): void => {
    this.draggingLook = false;
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.enabled) {
      return;
    }

    if (document.pointerLockElement !== this.canvas && !this.draggingLook) {
      return;
    }

    this.yaw -= event.movementX * 0.0022;
    this.pitch -= event.movementY * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI * 0.46, Math.PI * 0.46);
    this.applyRotation();
  };

  private readonly requestPointerLock = (): void => {
    this.canvas.requestPointerLock?.();
  };
}
