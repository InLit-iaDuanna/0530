export const SAMPLE_RATE_HZ = 50;
export const WINDOW_DURATION_MS = 2560;
export const WINDOW_HOP_MS = 1280;
export const WINDOW_SAMPLES = Math.round((WINDOW_DURATION_MS / 1000) * SAMPLE_RATE_HZ);

export const GRAVITY_LP_ALPHA = 0.92;

export const IMU_RULES = {
  cadenceMinHz: 1.0,
  cadenceMaxHz: 2.8,
  cadenceDriftMaxHz: 0.45,
  smallWalkPeakVertMin: 0.45,
  smallWalkPeakVertMax: 2.6,
  smallWalkRmsMin: 0.22,
  smallWalkVertRatioMin: 0.08,
  smallWalkVertRatioMax: 1.4,
  smallWalkJerkMin: 2.5,
  smallWalkJerkMax: 32,
  spectralEntropyMax: 0.72,
  handGyroPeakMax: 95,
  handGyroRmsMax: 42,
  handGyroAccelRatioMax: 42,
  singleAxisVertRatioMin: 2.2,
  stillRmsMax: 0.12,
} as const;

export const KNN_K = 5;
export const KNN_MIN_CONFIDENCE = 0.55;
export const SMALL_WALK_HOLD_MS = 1200;
export const OTHER_HOLD_MS = 350;

export const CALIBRATION_STEPS = [
  {
    key: 'still',
    label: 'other',
    durationMs: 5000,
  },
  {
    key: 'smallWalk',
    label: 'smallWalk',
    durationMs: 8000,
  },
  {
    key: 'handSpoof',
    label: 'other',
    durationMs: 8000,
  },
] as const;

export type CalibrationStepKey = (typeof CALIBRATION_STEPS)[number]['key'];
export type Label = 'smallWalk' | 'other';
export const CALIBRATION_LABELS = ['smallWalk', 'other'] as const;

export const FEATURE_NAMES = [
  'peakVert',
  'rmsVert',
  'meanAbsVert',
  'zeroCrossVert',
  'vertJerkPeak',
  'dominantFreqVert',
  'peakHorz',
  'rmsHorz',
  'vertRatio',
  'gyroPeak',
  'gyroRms',
  'gyroAccelRatio',
  'spectralEntropy',
  'cadenceDrift',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export const FEATURE_DIM = FEATURE_NAMES.length;
