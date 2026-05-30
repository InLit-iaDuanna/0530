import { FEATURE_DIM, type Label } from '../lib/constants';

export interface CalibrationSample {
  readonly label: Label;
  readonly features: readonly number[];
}

export interface NormalizationStats {
  readonly mean: readonly number[];
  readonly std: readonly number[];
}

export const computeNormalization = (
  samples: readonly CalibrationSample[],
): NormalizationStats => {
  if (samples.length === 0) {
    return {
      mean: new Array<number>(FEATURE_DIM).fill(0),
      std: new Array<number>(FEATURE_DIM).fill(1),
    };
  }

  const sum = new Array<number>(FEATURE_DIM).fill(0);
  for (const s of samples) {
    for (let i = 0; i < FEATURE_DIM; i += 1) {
      sum[i] = (sum[i] ?? 0) + (s.features[i] ?? 0);
    }
  }
  const meanArr = sum.map((v) => v / samples.length);

  const variance = new Array<number>(FEATURE_DIM).fill(0);
  for (const s of samples) {
    for (let i = 0; i < FEATURE_DIM; i += 1) {
      const d = (s.features[i] ?? 0) - (meanArr[i] ?? 0);
      variance[i] = (variance[i] ?? 0) + d * d;
    }
  }
  const stdArr = variance.map((v) => Math.max(Math.sqrt(v / samples.length), 1e-3));

  return { mean: meanArr, std: stdArr };
};

export const normalize = (
  vec: readonly number[],
  stats: NormalizationStats,
): readonly number[] => {
  const out = new Array<number>(FEATURE_DIM).fill(0);
  for (let i = 0; i < FEATURE_DIM; i += 1) {
    out[i] = ((vec[i] ?? 0) - (stats.mean[i] ?? 0)) / (stats.std[i] ?? 1);
  }
  return out;
};
