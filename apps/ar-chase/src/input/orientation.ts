import { LowPass, clamp } from '../lib/lowpass';
import { detectPlatform } from '../lib/ua';

type WebKitOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

export class OrientationInput {
  private yawFilter = new LowPass(0.15);
  private pitchFilter = new LowPass(0.15);
  private yawOffset = 0;
  private yaw = 0;
  private pitch = 0;
  private received = false;
  private readonly platform = detectPlatform();

  constructor() {
    window.addEventListener('deviceorientation', this.handleOrientation, true);
  }

  calibrate(): void {
    this.yawOffset = this.yaw;
  }

  snapshot(): { yaw: number; pitch: number; active: boolean } {
    return {
      yaw: this.yaw - this.yawOffset,
      pitch: this.pitch,
      active: this.received,
    };
  }

  destroy(): void {
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
  }

  private readonly handleOrientation = (event: DeviceOrientationEvent): void => {
    const reading = event as WebKitOrientationEvent;
    let yawDeg: number | null = null;

    if (this.platform === 'ios' && typeof reading.webkitCompassHeading === 'number') {
      yawDeg = reading.webkitCompassHeading;
    } else if (typeof event.alpha === 'number') {
      yawDeg = this.platform === 'android' ? 360 - event.alpha : event.alpha;
    }

    if (yawDeg === null) {
      return;
    }

    const pitchDeg = typeof event.beta === 'number' ? event.beta : 0;
    this.yaw = this.yawFilter.update((yawDeg * Math.PI) / 180);
    this.pitch = this.pitchFilter.update(clamp((pitchDeg * Math.PI) / 180, -0.8, 0.8));
    this.received = true;
  };
}
