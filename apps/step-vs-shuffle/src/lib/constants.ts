export const SAMPLE_RATE_HZ = 50;
export const WINDOW_DURATION_MS = 2560;
export const WINDOW_HOP_MS = 1280;
export const WINDOW_SAMPLES = Math.round((WINDOW_DURATION_MS / 1000) * SAMPLE_RATE_HZ);

export const GRAVITY_LP_ALPHA = 0.92;

export const IMU_RULES = {
  cadenceMinHz: 1.0,
  cadenceMaxHz: 2.8,
  cadenceDriftMaxHz: 0.65,
  smallWalkPeakMagMin: 0.55,
  smallWalkRmsMin: 0.18,
  smallWalkVertRatioMin: 0.03,
  smallWalkVertRatioMax: 5.0,
  smallWalkJerkMin: 1.8,
  smallWalkJerkMax: 70,
  spectralEntropyMax: 0.86,
  stepPeakCountMin: 3,
  stepIntervalCvMax: 0.45,
  stepMinIntervalMs: 300,
  stepMaxIntervalMs: 950,
  handGyroPeakMax: 160,
  handGyroRmsMax: 70,
  handGyroAccelRatioMax: 80,
  singleAxisVertRatioMin: 8.0,
  singleAxisHorzRmsMax: 0.22,
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
  'peakMag',
  'rmsVert',
  'rmsMag',
  'meanAbsVert',
  'zeroCrossVert',
  'vertJerkPeak',
  'dominantFreqVert',
  'dominantFreqMag',
  'peakHorz',
  'rmsHorz',
  'vertRatio',
  'stepPeakCount',
  'stepIntervalMeanMs',
  'stepIntervalCv',
  'gyroPeak',
  'gyroRms',
  'gyroAccelRatio',
  'spectralEntropy',
  'cadenceDrift',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export const FEATURE_DIM = FEATURE_NAMES.length;
