import type { CalibrationSample } from '../classifier/normalize';
import { FEATURE_DIM, type Label } from './constants';

const STORAGE_KEY = 'step-vs-shuffle:calibration:v2';

interface StoredCalibration {
  readonly version: 2;
  readonly samples: readonly CalibrationSample[];
}

const isLabel = (value: unknown): value is Label => value === 'smallWalk' || value === 'other';

export const loadCalibration = (): readonly CalibrationSample[] => {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredCalibration;
    if (parsed.version !== 2 || !Array.isArray(parsed.samples)) {
      return [];
    }
    return parsed.samples.filter(
      (sample) =>
        isLabel(sample.label) &&
        Array.isArray(sample.features) &&
        sample.features.length === FEATURE_DIM,
    );
  } catch {
    return [];
  }
};

export const saveCalibration = (samples: readonly CalibrationSample[]): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const payload: StoredCalibration = { version: 2, samples };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearCalibration = (): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
};
