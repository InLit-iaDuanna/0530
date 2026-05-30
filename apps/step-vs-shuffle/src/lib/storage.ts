import type { CalibrationSample } from '../classifier/normalize';

const STORAGE_KEY = 'step-vs-shuffle:calibration:v1';

interface StoredCalibration {
  readonly version: 1;
  readonly samples: readonly CalibrationSample[];
}

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
    if (parsed.version !== 1 || !Array.isArray(parsed.samples)) {
      return [];
    }
    return parsed.samples;
  } catch {
    return [];
  }
};

export const saveCalibration = (samples: readonly CalibrationSample[]): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const payload: StoredCalibration = { version: 1, samples };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearCalibration = (): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
};
