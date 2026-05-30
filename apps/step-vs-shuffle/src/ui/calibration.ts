import { extract } from '../features/extractor';
import { WindowBuffer } from '../features/window';
import {
  CALIBRATION_DURATION_MS,
  CALIBRATION_LABELS,
  WINDOW_DURATION_MS,
  type Label,
} from '../lib/constants';
import type { CalibrationSample } from '../classifier/normalize';
import type { MotionSample } from '../lib/types';

export type CalibrationPhase = 'pending' | 'recording' | 'between' | 'done';

export interface CalibrationState {
  readonly phase: CalibrationPhase;
  readonly currentLabel: Label | null;
  readonly currentIndex: number;
  readonly remainingMs: number;
  readonly samples: readonly CalibrationSample[];
}

export const LABEL_COPY: Record<Label, { title: string; instruction: string; color: string }> = {
  idle: {
    title: '静止',
    instruction: '把手机拿在手里，站定 5 秒不动。',
    color: '#5b6470',
  },
  shuffle: {
    title: '小步移动',
    instruction: '原地小幅挪动 / 拖步 / 轻微抖手机，5 秒。脚不要离地。',
    color: '#d8a32a',
  },
  step: {
    title: '踏步',
    instruction: '原地踏步，膝盖正常抬起、脚有落地感。不用快跑。5 秒。',
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
    if (this.currentIndex >= CALIBRATION_LABELS.length) {
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
        const label = CALIBRATION_LABELS[this.currentIndex];
        if (label) {
          this.samples.push({ label, features });
        }
      }
      this.snapshotAt = sample.t;
    }

    if (sample.t - this.startedAt >= CALIBRATION_DURATION_MS) {
      this.currentIndex += 1;
      this.phase = this.currentIndex >= CALIBRATION_LABELS.length ? 'done' : 'between';
    }
  }

  redoCurrent(now: number): void {
    if (this.currentIndex >= CALIBRATION_LABELS.length) {
      this.currentIndex = CALIBRATION_LABELS.length - 1;
    }

    const target = CALIBRATION_LABELS[this.currentIndex];
    if (target) {
      this.samples = this.samples.filter((s) => s.label !== target);
    }
    this.beginNext(now);
  }

  state(now: number): CalibrationState {
    const label = CALIBRATION_LABELS[this.currentIndex] ?? null;
    const elapsed = now - this.startedAt;
    const remaining =
      this.phase === 'recording' ? Math.max(CALIBRATION_DURATION_MS - elapsed, 0) : 0;

    return {
      phase: this.phase,
      currentLabel: label,
      currentIndex: this.currentIndex,
      remainingMs: remaining,
      samples: [...this.samples],
    };
  }

  load(samples: readonly CalibrationSample[]): void {
    this.samples = [...samples];
    this.currentIndex = CALIBRATION_LABELS.length;
    this.phase = samples.length > 0 ? 'done' : 'pending';
  }
}
