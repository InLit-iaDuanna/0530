import { GRAVITY_LP_ALPHA } from '../lib/constants';
import type { MotionSample, SensorStatus, Vec3 } from '../lib/types';

interface DeviceMotionPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

export interface MotionSourceListener {
  onSample: (sample: MotionSample) => void;
  onStatus: (status: SensorStatus) => void;
}

export class MotionSource {
  private gravity: Vec3 = { x: 0, y: 0, z: 0 };
  private gravityInitialized = false;
  private status: SensorStatus = 'idle';
  private readonly listener: MotionSourceListener;
  private bound = false;

  constructor(listener: MotionSourceListener) {
    this.listener = listener;
    this.detect();
  }

  getStatus(): SensorStatus {
    return this.status;
  }

  needsExplicitPermission(): boolean {
    const ctor = (window as unknown as { DeviceMotionEvent?: DeviceMotionPermission })
      .DeviceMotionEvent;
    return typeof ctor?.requestPermission === 'function';
  }

  async start(): Promise<SensorStatus> {
    if (this.status === 'unsupported' || this.status === 'insecure') {
      return this.status;
    }

    if (this.needsExplicitPermission()) {
      this.setStatus('requesting');
      const ctor = (window as unknown as { DeviceMotionEvent: DeviceMotionPermission })
        .DeviceMotionEvent;
      try {
        const result = await ctor.requestPermission?.();
        if (result !== 'granted') {
          this.setStatus('denied');
          return this.status;
        }
      } catch {
        this.setStatus('denied');
        return this.status;
      }
    }

    this.bind();
    this.setStatus('active');
    return this.status;
  }

  stop(): void {
    if (this.bound) {
      window.removeEventListener('devicemotion', this.handleMotion, true);
      this.bound = false;
    }

    this.setStatus('idle');
  }

  private detect(): void {
    if (typeof window === 'undefined' || typeof window.DeviceMotionEvent === 'undefined') {
      this.setStatus('unsupported');
      return;
    }

    if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext) {
      this.setStatus('insecure');
      return;
    }

    if (this.needsExplicitPermission()) {
      this.setStatus('permission-required');
      return;
    }

    this.setStatus('idle');
  }

  private bind(): void {
    if (this.bound) {
      return;
    }
    window.addEventListener('devicemotion', this.handleMotion, true);
    this.bound = true;
  }

  private setStatus(next: SensorStatus): void {
    if (this.status === next) {
      return;
    }
    this.status = next;
    this.listener.onStatus(next);
  }

  private readonly handleMotion = (event: DeviceMotionEvent): void => {
    const incl = event.accelerationIncludingGravity;
    const linear = event.acceleration;
    const rate = event.rotationRate;

    if (!incl || incl.x === null || incl.y === null || incl.z === null) {
      return;
    }

    const inclVec: Vec3 = { x: incl.x, y: incl.y, z: incl.z };

    if (!this.gravityInitialized) {
      this.gravity = inclVec;
      this.gravityInitialized = true;
    } else {
      this.gravity = {
        x: this.gravity.x * GRAVITY_LP_ALPHA + inclVec.x * (1 - GRAVITY_LP_ALPHA),
        y: this.gravity.y * GRAVITY_LP_ALPHA + inclVec.y * (1 - GRAVITY_LP_ALPHA),
        z: this.gravity.z * GRAVITY_LP_ALPHA + inclVec.z * (1 - GRAVITY_LP_ALPHA),
      };
    }

    const accelLinear: Vec3 =
      linear && linear.x !== null && linear.y !== null && linear.z !== null
        ? { x: linear.x, y: linear.y, z: linear.z }
        : {
            x: inclVec.x - this.gravity.x,
            y: inclVec.y - this.gravity.y,
            z: inclVec.z - this.gravity.z,
          };

    const gyro: Vec3 =
      rate && rate.alpha !== null && rate.beta !== null && rate.gamma !== null
        ? { x: rate.beta, y: rate.gamma, z: rate.alpha }
        : ZERO;

    const sample: MotionSample = {
      t: event.timeStamp || performance.now(),
      accel: accelLinear,
      gravity: this.gravity,
      gyro,
    };

    this.listener.onSample(sample);
  };
}
