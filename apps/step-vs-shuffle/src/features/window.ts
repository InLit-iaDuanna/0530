import { dot3, magnitude3, normalize3, sub3 } from '../lib/math';
import type { MotionSample, Vec3 } from '../lib/types';

export interface ProjectedSample {
  readonly t: number;
  readonly aVert: number;
  readonly aHorz: number;
  readonly gyroMag: number;
  readonly gravityX: number;
  readonly gravityY: number;
  readonly gravityZ: number;
}

export interface RingState {
  readonly samples: readonly ProjectedSample[];
  readonly durationMs: number;
}

export class WindowBuffer {
  private readonly buffer: ProjectedSample[] = [];
  private readonly capacityMs: number;

  constructor(capacityMs: number) {
    this.capacityMs = capacityMs;
  }

  push(sample: MotionSample): ProjectedSample {
    const projected = project(sample);
    this.buffer.push(projected);

    while (this.buffer.length > 1) {
      const head = this.buffer[0];
      const tail = this.buffer[this.buffer.length - 1];

      if (!head || !tail) {
        break;
      }

      if (tail.t - head.t <= this.capacityMs) {
        break;
      }
      this.buffer.shift();
    }

    return projected;
  }

  snapshot(): RingState {
    if (this.buffer.length === 0) {
      return { samples: [], durationMs: 0 };
    }

    const first = this.buffer[0];
    const last = this.buffer[this.buffer.length - 1];

    if (!first || !last) {
      return { samples: [], durationMs: 0 };
    }

    return {
      samples: [...this.buffer],
      durationMs: last.t - first.t,
    };
  }

  reset(): void {
    this.buffer.length = 0;
  }
}

export const project = (sample: MotionSample): ProjectedSample => {
  const gravityDir: Vec3 = normalize3(sample.gravity);
  const aVert = dot3(sample.accel, gravityDir);
  const horzVec = sub3(sample.accel, {
    x: gravityDir.x * aVert,
    y: gravityDir.y * aVert,
    z: gravityDir.z * aVert,
  });
  const aHorz = magnitude3(horzVec);
  const gyroMag = magnitude3(sample.gyro);
  return {
    t: sample.t,
    aVert,
    aHorz,
    gyroMag,
    gravityX: gravityDir.x,
    gravityY: gravityDir.y,
    gravityZ: gravityDir.z,
  };
};
