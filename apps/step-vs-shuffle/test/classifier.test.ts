import { describe, expect, it } from 'vitest';
import { extract } from '../src/features/extractor';
import { WindowBuffer } from '../src/features/window';
import { evaluateHardRules } from '../src/classifier/hard-rules';
import { KnnModel } from '../src/classifier/knn';
import { StatefulClassifier } from '../src/classifier/state';
import type { CalibrationSample } from '../src/classifier/normalize';
import type { Label } from '../src/lib/constants';
import { idleSamples, shuffleSamples, stepSamples } from './fixtures/synth';

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

describe('hard rules', () => {
  it('idle features → idle', () => {
    const result = evaluateHardRules(featuresOf(idleSamples()));
    expect(result?.label).toBe('idle');
  });

  it('shuffle features → shuffle (not step)', () => {
    const result = evaluateHardRules(featuresOf(shuffleSamples()));
    expect(result?.label).toBe('shuffle');
  });

  it('step features → step', () => {
    const result = evaluateHardRules(featuresOf(stepSamples()));
    expect(result?.label).toBe('step');
  });
});

describe('KNN with calibration', () => {
  it('classifies matching activity correctly after calibration', () => {
    const knn = new KnnModel([
      ...calibrationSet('idle', idleSamples()),
      ...calibrationSet('shuffle', shuffleSamples()),
      ...calibrationSet('step', stepSamples()),
    ]);

    expect(knn.classify(featuresOf(idleSamples()))?.label).toBe('idle');
    expect(knn.classify(featuresOf(shuffleSamples()))?.label).toBe('shuffle');
    expect(knn.classify(featuresOf(stepSamples()))?.label).toBe('step');
  });

  it('returns null with too few samples', () => {
    const knn = new KnnModel([{ label: 'idle', features: featuresOf(idleSamples()) }]);
    expect(knn.classify(featuresOf(idleSamples()))).toBeNull();
  });
});

describe('stateful classifier with hysteresis', () => {
  it('does not commit to step until 600ms of consistent observation', () => {
    const knn = new KnnModel([
      ...calibrationSet('idle', idleSamples()),
      ...calibrationSet('shuffle', shuffleSamples()),
      ...calibrationSet('step', stepSamples()),
    ]);
    const classifier = new StatefulClassifier(knn);
    classifier.reset(0);

    const stepF = featuresOf(stepSamples());
    const r1 = classifier.classify(stepF, { now: 100 });
    expect(r1.classification.label).toBe('step');
    expect(r1.state.stableLabel).toBe('idle');

    const r2 = classifier.classify(stepF, { now: 400 });
    expect(r2.state.stableLabel).toBe('idle');

    const r3 = classifier.classify(stepF, { now: 800 });
    expect(r3.state.stableLabel).toBe('step');
  });

  it('flickering observations do not commit', () => {
    const knn = new KnnModel([
      ...calibrationSet('idle', idleSamples()),
      ...calibrationSet('shuffle', shuffleSamples()),
      ...calibrationSet('step', stepSamples()),
    ]);
    const classifier = new StatefulClassifier(knn);
    classifier.reset(0);

    const stepF = featuresOf(stepSamples());
    const idleF = featuresOf(idleSamples());

    classifier.classify(stepF, { now: 100 });
    classifier.classify(idleF, { now: 300 });
    classifier.classify(stepF, { now: 500 });
    classifier.classify(idleF, { now: 700 });
    const result = classifier.classify(stepF, { now: 900 });

    expect(result.state.stableLabel).toBe('idle');
  });
});
