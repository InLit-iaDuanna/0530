import { extract } from '../features/extractor';
import { WindowBuffer } from '../features/window';
import {
  CALIBRATION_STEPS,
  type CalibrationStepKey,
  WINDOW_DURATION_MS,
  type Label,
} from '../lib/constants';
import type { CalibrationSample } from '../classifier/normalize';
import type { MotionSample } from '../lib/types';

export type CalibrationPhase = 'pending' | 'recording' | 'between' | 'done';

export interface CalibrationState {
  readonly phase: CalibrationPhase;
  readonly currentLabel: Label | null;
  readonly currentStepKey: CalibrationStepKey | null;
  readonly currentIndex: number;
  readonly durationMs: number;
  readonly remainingMs: number;
  readonly samples: readonly CalibrationSample[];
}

export const LABEL_COPY: Record<Label, { title: string; instruction: string; color: string }> = {
  smallWalk: {
    title: '小步走',
    instruction: '手持手机，自然小步走。不要刻意上下摆手机。',
    color: '#d8a32a',
  },
  other: {
    title: '其他',
    instruction: '静止、非小步走或手动伪造都会归为其他。',
    color: '#5b6470',
  },
};

export const STEP_COPY: Record<
  CalibrationStepKey,
  { title: string; instruction: string; color: string }
> = {
  still: {
    title: '静止',
    instruction: '手持手机站定 5 秒，尽量不要移动手腕。',
    color: '#5b6470',
  },
  smallWalk: {
    title: '小步走',
    instruction: '手持手机自然小步走 8 秒，保持正常姿态，不要刻意摆手机。',
    color: '#d8a32a',
  },
  handSpoof: {
    title: '手动伪造',
    instruction: '站在原地，尝试上下摆、左右晃或旋转手机 8 秒，作为负样本。',
    color: '#d24960',
  },
};

export class CalibrationController {
  private buffer = new WindowBuffer(WINDOW_DURATION_MS);
  private samples: CalibrationSample[] = [];
  private phase: CalibrationPhase = 'pending';
  private currentIndex = 0;
  private startedAt = 0;
  private snapshotAt = 0;

  start(now: number): void {
    this.samples = [];
    this.currentIndex = 0;
    this.phase = 'recording';
    this.startedAt = now;
    this.snapshotAt = now;
    this.buffer.reset();
  }

  beginNext(now: number): void {
    if (this.currentIndex >= CALIBRATION_STEPS.length) {
      this.phase = 'done';
      return;
    }
    this.phase = 'recording';
    this.startedAt = now;
    this.snapshotAt = now;
    this.buffer.reset();
  }

  ingest(sample: MotionSample): void {
    if (this.phase !== 'recording') {
      return;
    }

    this.buffer.push(sample);

    if (sample.t - this.snapshotAt >= 600) {
      const features = extract(this.buffer.snapshot());
      if (features.some((v) => v !== 0)) {
        const step = CALIBRATION_STEPS[this.currentIndex];
        if (step) {
          this.samples.push({ label: step.label, features, source: step.key });
        }
      }
      this.snapshotAt = sample.t;
    }

    const step = CALIBRATION_STEPS[this.currentIndex];
    const durationMs = step?.durationMs ?? 0;
    if (sample.t - this.startedAt >= durationMs) {
      this.currentIndex += 1;
      this.phase = this.currentIndex >= CALIBRATION_STEPS.length ? 'done' : 'between';
    }
  }

  redoCurrent(now: number): void {
    if (this.currentIndex >= CALIBRATION_STEPS.length) {
      this.currentIndex = CALIBRATION_STEPS.length - 1;
    }

    const targetStep = CALIBRATION_STEPS[this.currentIndex];
    if (targetStep) {
      this.samples = this.samples.filter((s) =>
        s.source ? s.source !== targetStep.key : s.label !== targetStep.label,
      );
    }
    this.beginNext(now);
  }

  state(now: number): CalibrationState {
    const step = CALIBRATION_STEPS[this.currentIndex] ?? null;
    const elapsed = now - this.startedAt;
    const durationMs = step?.durationMs ?? 0;
    const remaining =
      this.phase === 'recording' ? Math.max(durationMs - elapsed, 0) : 0;

    return {
      phase: this.phase,
      currentLabel: step?.label ?? null,
      currentStepKey: step?.key ?? null,
      currentIndex: this.currentIndex,
      durationMs,
      remainingMs: remaining,
      samples: [...this.samples],
    };
  }

  load(samples: readonly CalibrationSample[]): void {
    this.samples = [...samples];
    this.currentIndex = CALIBRATION_STEPS.length;
    this.phase = samples.length > 0 ? 'done' : 'pending';
  }
}
