import { clamp } from '../lib/lowpass';

interface Accel {
  x: number;
  y: number;
  z: number;
}

export class Pedometer {
  private gravity: Accel = { x: 0, y: 0, z: 0 };
  private samples: number[] = [];
  private lastMagnitude = 0;
  private lastStepAt = 0;
  private pendingSteps = 0;
  private lastEventAt = 0;
  private active = false;

  constructor() {
    window.addEventListener('devicemotion', this.handleMotion, true);
  }

  async requestPermission(): Promise<void> {
    const motion = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof motion.requestPermission === 'function') {
      await motion.requestPermission();
    }
  }

  consumeSteps(): number {
    const steps = this.pendingSteps;
    this.pendingSteps = 0;
    return steps;
  }

  hasRecentMotion(now = performance.now()): boolean {
    return this.active && now - this.lastEventAt < 3000;
  }

  destroy(): void {
    window.removeEventListener('devicemotion', this.handleMotion, true);
  }

  private readonly handleMotion = (event: DeviceMotionEvent): void => {
    const source = event.accelerationIncludingGravity;
    if (!source || source.x === null || source.y === null || source.z === null) {
      return;
    }

    const accel = { x: source.x, y: source.y, z: source.z };
    this.gravity = {
      x: this.gravity.x * 0.92 + accel.x * 0.08,
      y: this.gravity.y * 0.92 + accel.y * 0.08,
      z: this.gravity.z * 0.92 + accel.z * 0.08,
    };

    const linear = {
      x: accel.x - this.gravity.x,
      y: accel.y - this.gravity.y,
      z: accel.z - this.gravity.z,
    };
    const magnitude = Math.hypot(linear.x, linear.y, linear.z);
    this.samples.push(magnitude);

    if (this.samples.length > 18) {
      this.samples.shift();
    }

    const variance = sampleVariance(this.samples);
    const now = performance.now();
    const crossedUp = this.lastMagnitude < 1.1 && magnitude >= 1.1;

    if (variance > 0.42 && crossedUp && now - this.lastStepAt > 280) {
      this.pendingSteps += 1;
      this.lastStepAt = now;
    }

    this.lastMagnitude = magnitude;
    this.lastEventAt = now;
    this.active = true;
  };
}

function sampleVariance(samples: number[]): number {
  if (samples.length < 4) {
    return 0;
  }

  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const variance =
    samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / samples.length;
  return clamp(variance, 0, 12);
}
