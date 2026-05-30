import { FEATURE_DIM, FEATURE_NAMES, type FeatureName } from '../lib/constants';
import { mean, rms } from '../lib/math';
import type { ProjectedSample, RingState } from './window';

export const EMPTY_FEATURES: readonly number[] = new Array<number>(FEATURE_DIM).fill(0);

export const extract = (window: RingState): readonly number[] => {
  if (window.samples.length < 8 || window.durationMs < 800) {
    return EMPTY_FEATURES;
  }

  const aVerts = window.samples.map((s) => s.aVert);
  const aVertCentered = centered(aVerts);
  const aHorz = window.samples.map((s) => s.aHorz);
  const gyro = window.samples.map((s) => s.gyroMag);

  const peakVert = absMax(aVertCentered);
  const rmsVert = rms(aVertCentered);
  const meanAbsVert = mean(aVertCentered.map((v) => Math.abs(v)));
  const zeroCrossVert = zeroCrossings(aVertCentered);

  const vertJerkPeak = jerkPeak(window.samples);
  const dominantFreqVert = dominantFreqHz(aVertCentered, window.durationMs);

  const peakHorz = absMax(aHorz);
  const rmsHorz = rms(aHorz);
  const energyVert = aVertCentered.reduce((sum, v) => sum + v * v, 0);
  const energyHorz = aHorz.reduce((sum, v) => sum + v * v, 0);
  const vertRatio = energyHorz < 1e-3 ? 4 : energyVert / energyHorz;

  const gyroPeak = absMax(gyro);
  const gyroRmsValue = rms(gyro);
  const spectralEntropy = welchEntropy(aVertCentered);

  const valuesByName: Record<FeatureName, number> = {
    peakVert,
    rmsVert,
    meanAbsVert,
    zeroCrossVert,
    vertJerkPeak,
    dominantFreqVert,
    peakHorz,
    rmsHorz,
    vertRatio,
    gyroPeak,
    gyroRms: gyroRmsValue,
    spectralEntropy,
  };

  return FEATURE_NAMES.map((name) => valuesByName[name]);
};

const centered = (xs: readonly number[]): readonly number[] => {
  const m = mean(xs);
  return xs.map((x) => x - m);
};

const absMax = (xs: readonly number[]): number => {
  let max = 0;
  for (const value of xs) {
    const a = Math.abs(value);
    if (a > max) {
      max = a;
    }
  }
  return max;
};

const zeroCrossings = (xs: readonly number[]): number => {
  let count = 0;
  for (let i = 1; i < xs.length; i += 1) {
    const prev = xs[i - 1] ?? 0;
    const curr = xs[i] ?? 0;
    if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
      count += 1;
    }
  }
  return count;
};

const jerkPeak = (samples: readonly ProjectedSample[]): number => {
  let peak = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const curr = samples[i];

    if (!prev || !curr) {
      continue;
    }

    const dt = (curr.t - prev.t) / 1000;
    if (dt <= 1e-3) {
      continue;
    }

    const j = Math.abs((curr.aVert - prev.aVert) / dt);
    if (j > peak) {
      peak = j;
    }
  }

  return peak;
};

const dominantFreqHz = (xs: readonly number[], durationMs: number): number => {
  if (xs.length < 8 || durationMs < 500) {
    return 0;
  }

  const fs = (xs.length * 1000) / durationMs;
  const minHz = 0.7;
  const maxHz = 5.0;
  const stepHz = 0.1;

  let bestHz = 0;
  let bestPower = 0;

  for (let f = minHz; f <= maxHz + 1e-6; f += stepHz) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < xs.length; n += 1) {
      const x = xs[n] ?? 0;
      const phase = (2 * Math.PI * f * n) / fs;
      re += x * Math.cos(phase);
      im -= x * Math.sin(phase);
    }
    const power = re * re + im * im;
    if (power > bestPower) {
      bestPower = power;
      bestHz = f;
    }
  }

  return bestHz;
};

const welchEntropy = (xs: readonly number[]): number => {
  if (xs.length < 8) {
    return 0;
  }

  const fs = 50;
  const minHz = 0.7;
  const maxHz = 6.0;
  const stepHz = 0.5;
  const bins: number[] = [];

  for (let f = minHz; f <= maxHz + 1e-6; f += stepHz) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < xs.length; n += 1) {
      const x = xs[n] ?? 0;
      const phase = (2 * Math.PI * f * n) / fs;
      re += x * Math.cos(phase);
      im -= x * Math.sin(phase);
    }
    bins.push(re * re + im * im);
  }

  const total = bins.reduce((sum, v) => sum + v, 0);
  if (total < 1e-6) {
    return 0;
  }

  let entropy = 0;
  for (const power of bins) {
    const p = power / total;
    if (p > 1e-9) {
      entropy -= p * Math.log2(p);
    }
  }

  const maxEntropy = Math.log2(bins.length);
  return maxEntropy < 1e-6 ? 0 : entropy / maxEntropy;
};
