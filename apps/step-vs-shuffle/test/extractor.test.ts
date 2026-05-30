import { describe, expect, it } from 'vitest';
import { extract } from '../src/features/extractor';
import { WindowBuffer } from '../src/features/window';
import { FEATURE_DIM, FEATURE_NAMES } from '../src/lib/constants';
import {
  handSpoofSamples,
  idleSamples,
  rotationSpoofSamples,
  smallWalkSamples,
} from './fixtures/synth';

const featuresFor = (samples: ReturnType<typeof idleSamples>): readonly number[] => {
  const buffer = new WindowBuffer(2560);
  for (const sample of samples) {
    buffer.push(sample);
  }
  return extract(buffer.snapshot());
};

const get = (vec: readonly number[], name: (typeof FEATURE_NAMES)[number]): number => {
  const i = FEATURE_NAMES.indexOf(name);
  return vec[i] ?? 0;
};

describe('feature extractor', () => {
  it('returns the right dimension', () => {
    const f = featuresFor(smallWalkSamples());
    expect(f).toHaveLength(FEATURE_DIM);
  });

  it('idle has low peak vert and low rms', () => {
    const f = featuresFor(idleSamples());
    expect(get(f, 'peakVert')).toBeLessThan(0.6);
    expect(get(f, 'rmsVert')).toBeLessThan(0.2);
  });

  it('small walk has stable cadence and mixed energy', () => {
    const f = featuresFor(smallWalkSamples());
    expect(get(f, 'dominantFreqVert')).toBeGreaterThanOrEqual(1.0);
    expect(get(f, 'dominantFreqVert')).toBeLessThanOrEqual(2.8);
    expect(get(f, 'rmsHorz')).toBeGreaterThan(0.3);
    expect(get(f, 'vertRatio')).toBeGreaterThan(0.08);
    expect(get(f, 'vertRatio')).toBeLessThan(1.4);
  });

  it('hand spoof is dominated by one vertical axis', () => {
    const f = featuresFor(handSpoofSamples());
    expect(get(f, 'vertRatio')).toBeGreaterThan(2.2);
  });

  it('rotation spoof has high gyro acceleration ratio', () => {
    const f = featuresFor(rotationSpoofSamples());
    expect(get(f, 'gyroPeak')).toBeGreaterThan(95);
    expect(get(f, 'gyroAccelRatio')).toBeGreaterThan(42);
  });
});
