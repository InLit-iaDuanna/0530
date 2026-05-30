import { KNN_K, type Label } from '../lib/constants';
import {
  type CalibrationSample,
  type NormalizationStats,
  computeNormalization,
  normalize,
} from './normalize';

export interface KnnResult {
  readonly label: Label;
  readonly confidence: number;
  readonly nearestDistance: number;
}

export interface KnnNeighbor {
  readonly label: Label;
  readonly distance: number;
}

export class KnnModel {
  private readonly samples: CalibrationSample[] = [];
  private stats: NormalizationStats;

  constructor(initial: readonly CalibrationSample[] = []) {
    this.samples.push(...initial);
    this.stats = computeNormalization(this.samples);
  }

  add(sample: CalibrationSample): void {
    this.samples.push(sample);
    this.stats = computeNormalization(this.samples);
  }

  size(): number {
    return this.samples.length;
  }

  getStats(): NormalizationStats {
    return this.stats;
  }

  classify(rawFeatures: readonly number[]): KnnResult | null {
    if (this.samples.length < KNN_K) {
      return null;
    }

    const query = normalize(rawFeatures, this.stats);
    const distances: KnnNeighbor[] = this.samples.map((sample) => ({
      label: sample.label,
      distance: cosineDistance(query, normalize(sample.features, this.stats)),
    }));

    distances.sort((a, b) => a.distance - b.distance);
    const top = distances.slice(0, KNN_K);

    const weights = new Map<Label, number>();
    for (const n of top) {
      const w = 1 / (1e-3 + n.distance);
      weights.set(n.label, (weights.get(n.label) ?? 0) + w);
    }

    let bestLabel: Label = 'idle';
    let bestWeight = -1;
    let total = 0;
    for (const [label, weight] of weights) {
      total += weight;
      if (weight > bestWeight) {
        bestLabel = label;
        bestWeight = weight;
      }
    }

    const nearest = top[0]?.distance ?? 1;
    const confidence = total > 0 ? bestWeight / total : 0;

    return { label: bestLabel, confidence, nearestDistance: nearest };
  }
}

const cosineDistance = (a: readonly number[], b: readonly number[]): number => {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    aMag += av * av;
    bMag += bv * bv;
  }

  const denom = Math.sqrt(aMag) * Math.sqrt(bMag);
  if (denom < 1e-6) {
    return 1;
  }

  const sim = dot / denom;
  return 1 - sim;
};
