import { describe, expect, it } from 'vitest';
import { applyHealthAssistance } from '../src/classifier/healthkit';
import { evaluateImuRules } from '../src/classifier/hard-rules';
import { KnnModel } from '../src/classifier/knn';
import type { CalibrationSample } from '../src/classifier/normalize';
import { StatefulClassifier } from '../src/classifier/state';
import { extract } from '../src/features/extractor';
import { WindowBuffer } from '../src/features/window';
import type { Label } from '../src/lib/constants';
import type { Classification } from '../src/lib/types';
import {
  handSpoofSamples,
  idleSamples,
  rotationSpoofSamples,
  smallWalkSamples,
} from './fixtures/synth';

const featuresOf = (samples: ReturnType<typeof idleSamples>): readonly number[] => {
  const buffer = new WindowBuffer(2560);
  for (const sample of samples) {
    buffer.push(sample);
  }
  return extract(buffer.snapshot());
};

const calibrationSet = (label: Label, samples: ReturnType<typeof idleSamples>, count = 4) => {
  const out: CalibrationSample[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({ label, features: featuresOf(samples) });
  }
  return out;
};

const trainedKnn = (): KnnModel =>
  new KnnModel([
    ...calibrationSet('other', idleSamples()),
    ...calibrationSet('smallWalk', smallWalkSamples()),
    ...calibrationSet('other', handSpoofSamples()),
    ...calibrationSet('other', rotationSpoofSamples()),
  ]);

describe('IMU rules', () => {
  it('classifies synthetic small walk as smallWalk', () => {
    const result = evaluateImuRules(featuresOf(smallWalkSamples()));
    expect(result.label).toBe('smallWalk');
  });

  it('classifies idle as other', () => {
    const result = evaluateImuRules(featuresOf(idleSamples()));
    expect(result.label).toBe('other');
  });

  it('rejects single-axis phone swinging as other', () => {
    const result = evaluateImuRules(featuresOf(handSpoofSamples()));
    expect(result.label).toBe('other');
    expect(result.reason).toContain('single-axis');
  });

  it('rejects high-rotation phone motion as other', () => {
    const result = evaluateImuRules(featuresOf(rotationSpoofSamples()));
    expect(result.label).toBe('other');
    expect(result.reason).toContain('rotation');
  });
});

describe('KNN with calibration', () => {
  it('classifies matching activity correctly after calibration', () => {
    const knn = trainedKnn();

    expect(knn.classify(featuresOf(smallWalkSamples()))?.label).toBe('smallWalk');
    expect(knn.classify(featuresOf(idleSamples()))?.label).toBe('other');
    expect(knn.classify(featuresOf(handSpoofSamples()))?.label).toBe('other');
  });

  it('returns null with too few samples', () => {
    const knn = new KnnModel([{ label: 'other', features: featuresOf(idleSamples()) }]);
    expect(knn.classify(featuresOf(idleSamples()))).toBeNull();
  });
});

describe('HealthKit assistance', () => {
  const base: Classification = {
    label: 'smallWalk',
    confidence: 0.7,
    nearestDistance: 0.2,
    source: 'imu-rule',
    reason: 'cadence-energy-texture',
  };

  it('boosts smallWalk confidence when HealthKit steps increase', () => {
    const result = applyHealthAssistance(base, { available: true, steps: 2 });
    expect(result.source).toBe('healthkit-assisted');
    expect(result.confidence).toBeGreaterThan(base.confidence);
  });

  it('keeps IMU-only classification when HealthKit is unavailable', () => {
    const result = applyHealthAssistance(base, { available: false, steps: 0 });
    expect(result).toEqual(base);
  });

  it('discounts but does not reject smallWalk when HealthKit has no steps', () => {
    const result = applyHealthAssistance(base, { available: true, steps: 0 });
    expect(result.label).toBe('smallWalk');
    expect(result.confidence).toBeLessThan(base.confidence);
  });
});

describe('stateful classifier with hysteresis', () => {
  it('does not commit to smallWalk until 1.2s of consistent observation', () => {
    const classifier = new StatefulClassifier(trainedKnn());
    classifier.reset(0);

    const smallWalk = featuresOf(smallWalkSamples());
    const r1 = classifier.classify(smallWalk, { now: 100 });
    expect(r1.classification.label).toBe('smallWalk');
    expect(r1.state.stableLabel).toBe('other');

    const r2 = classifier.classify(smallWalk, { now: 900 });
    expect(r2.state.stableLabel).toBe('other');

    const r3 = classifier.classify(smallWalk, { now: 1400 });
    expect(r3.state.stableLabel).toBe('smallWalk');
  });

  it('short spoof bursts do not commit', () => {
    const classifier = new StatefulClassifier(trainedKnn());
    classifier.reset(0);

    const smallWalk = featuresOf(smallWalkSamples());
    const other = featuresOf(idleSamples());

    classifier.classify(smallWalk, { now: 100 });
    classifier.classify(other, { now: 500 });
    classifier.classify(smallWalk, { now: 800 });
    classifier.classify(other, { now: 1100 });
    const result = classifier.classify(smallWalk, { now: 1300 });

    expect(result.state.stableLabel).toBe('other');
  });
});
