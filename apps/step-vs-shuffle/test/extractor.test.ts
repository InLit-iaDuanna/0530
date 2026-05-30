import { describe, expect, it } from 'vitest';
import { extract } from '../src/features/extractor';
import { WindowBuffer } from '../src/features/window';
import { FEATURE_DIM, FEATURE_NAMES } from '../src/lib/constants';
import { idleSamples, shuffleSamples, stepSamples } from './fixtures/synth';

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
    const f = featuresFor(stepSamples());
    expect(f).toHaveLength(FEATURE_DIM);
  });

  it('idle has low peak vert and low rms', () => {
    const f = featuresFor(idleSamples());
    expect(get(f, 'peakVert')).toBeLessThan(0.6);
    expect(get(f, 'rmsVert')).toBeLessThan(0.2);
  });

  it('shuffle has moderate energy but low vertical impact', () => {
    const f = featuresFor(shuffleSamples());
    expect(get(f, 'peakVert')).toBeLessThan(2.0);
    expect(get(f, 'rmsVert')).toBeGreaterThan(0.18);
    expect(get(f, 'vertJerkPeak')).toBeLessThan(30);
  });

  it('step has high peakVert and high vertJerk', () => {
    const f = featuresFor(stepSamples());
    expect(get(f, 'peakVert')).toBeGreaterThan(2.5);
    expect(get(f, 'vertJerkPeak')).toBeGreaterThan(30);
  });

  it('step is clearly separated from shuffle on peakVert', () => {
    const fStep = featuresFor(stepSamples());
    const fShuf = featuresFor(shuffleSamples());
    expect(get(fStep, 'peakVert')).toBeGreaterThan(get(fShuf, 'peakVert') * 1.5);
  });
});
