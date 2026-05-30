import { KNN_MIN_CONFIDENCE, OTHER_HOLD_MS, SMALL_WALK_HOLD_MS, type Label } from '../lib/constants';
import type { Classification } from '../lib/types';
import { evaluateImuRules } from './hard-rules';
import { KnnModel } from './knn';

export interface ClassifyOptions {
  readonly now: number;
}

export interface ClassifierState {
  readonly stableLabel: Label;
  readonly stableSinceMs: number;
}

export class StatefulClassifier {
  private readonly knn: KnnModel;
  private candidate: Label = 'other';
  private candidateSince = 0;
  private committedLabel: Label = 'other';
  private committedSince = 0;

  constructor(knn: KnnModel) {
    this.knn = knn;
  }

  classify(
    features: readonly number[],
    opts: ClassifyOptions,
  ): { classification: Classification; state: ClassifierState } {
    const imu = evaluateImuRules(features);
    let classification: Classification;

    if (imu.label === 'smallWalk' || imu.confidence >= 0.8) {
      classification = {
        label: imu.label,
        confidence: imu.confidence,
        nearestDistance: 0,
        source: 'imu-rule',
        reason: imu.reason,
      };
    } else {
      const knn = this.knn.classify(features);
      if (knn && knn.confidence >= KNN_MIN_CONFIDENCE) {
        classification = {
          label: knn.label,
          confidence: knn.confidence,
          nearestDistance: knn.nearestDistance,
          source: 'knn',
          reason: imu.reason,
        };
      } else {
        classification = {
          label: this.committedLabel,
          confidence: knn?.confidence ?? 0,
          nearestDistance: knn?.nearestDistance ?? 1,
          source: 'fallback',
          reason: imu.reason,
        };
      }
    }

    this.advance(classification.label, opts.now);
    return {
      classification,
      state: {
        stableLabel: this.committedLabel,
        stableSinceMs: this.committedSince,
      },
    };
  }

  reset(now: number): void {
    this.candidate = 'other';
    this.candidateSince = now;
    this.committedLabel = 'other';
    this.committedSince = now;
  }

  private advance(observed: Label, now: number): void {
    if (this.committedSince === 0) {
      this.committedSince = now;
      this.candidateSince = now;
    }

    if (observed === this.committedLabel) {
      this.candidate = observed;
      this.candidateSince = now;
      return;
    }

    if (observed !== this.candidate) {
      this.candidate = observed;
      this.candidateSince = now;
      return;
    }

    const holdMs = observed === 'smallWalk' ? SMALL_WALK_HOLD_MS : OTHER_HOLD_MS;
    if (now - this.candidateSince >= holdMs) {
      this.committedLabel = observed;
      this.committedSince = now;
    }
  }
}
