import { clamp } from '../lib/lowpass';

export class ShakeDetector {
  private gravity = { x: 0, y: 0, z: 0 };
  private samples: number[] = [];
  private rmsValue = 0;

  constructor() {
    window.addEventListener('devicemotion', this.handleMotion, true);
  }

  rms(): number {
    return this.rmsValue;
  }

  destroy(): void {
    window.removeEventListener('devicemotion', this.handleMotion, true);
  }

  private readonly handleMotion = (event: DeviceMotionEvent): void => {
    const source = event.accelerationIncludingGravity;
    if (!source || source.x === null || source.y === null || source.z === null) {
      return;
    }

    this.gravity.x = this.gravity.x * 0.94 + source.x * 0.06;
    this.gravity.y = this.gravity.y * 0.94 + source.y * 0.06;
    this.gravity.z = this.gravity.z * 0.94 + source.z * 0.06;

    const linearX = source.x - this.gravity.x;
    const linearY = source.y - this.gravity.y;
    const linearZ = source.z - this.gravity.z;
    this.samples.push(Math.hypot(linearX, linearY, linearZ));

    if (this.samples.length > 40) {
      this.samples.shift();
    }

    const energy =
      this.samples.reduce((sum, value) => sum + value * value, 0) /
      Math.max(1, this.samples.length);
    this.rmsValue = clamp(Math.sqrt(energy), 0, 8);
  };
}
