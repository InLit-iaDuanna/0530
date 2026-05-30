import { KNN_MIN_CONFIDENCE, STATE_HOLD_MS, type Label } from '../lib/constants';
import type { Classification } from '../lib/types';
import { evaluateHardRules } from './hard-rules';
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
  private candidate: Label = 'idle';
  private candidateSince = 0;
  private committedLabel: Label = 'idle';
  private committedSince = 0;

  constructor(knn: KnnModel) {
    this.knn = knn;
  }

  classify(
    features: readonly number[],
    opts: ClassifyOptions,
  ): { classification: Classification; state: ClassifierState } {
    const hard = evaluateHardRules(features);
    let classification: Classification;

    if (hard) {
      classification = {
        label: hard.label,
        confidence: 1,
        nearestDistance: 0,
        source: 'hard-rule',
      };
    } else {
      const knn = this.knn.classify(features);
      if (knn && knn.confidence >= KNN_MIN_CONFIDENCE) {
        classification = {
          label: knn.label,
          confidence: knn.confidence,
          nearestDistance: knn.nearestDistance,
          source: 'knn',
        };
      } else {
        classification = {
          label: this.committedLabel,
          confidence: knn?.confidence ?? 0,
          nearestDistance: knn?.nearestDistance ?? 1,
          source: 'fallback',
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
    this.candidate = 'idle';
    this.candidateSince = now;
    this.committedLabel = 'idle';
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

    if (now - this.candidateSince >= STATE_HOLD_MS) {
      this.committedLabel = observed;
      this.committedSince = now;
    }
  }
}
