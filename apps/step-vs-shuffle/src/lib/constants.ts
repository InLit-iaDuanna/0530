export const SAMPLE_RATE_HZ = 50;
export const WINDOW_DURATION_MS = 2560;
export const WINDOW_HOP_MS = 1280;
export const WINDOW_SAMPLES = Math.round((WINDOW_DURATION_MS / 1000) * SAMPLE_RATE_HZ);

export const GRAVITY_LP_ALPHA = 0.92;

export const HARD_RULES = {
  stepPeakVertMin: 2.5,
  stepVertJerkMin: 30,
  stepVertRatioMin: 0.9,
  shuffleRmsMin: 0.18,
  shufflePeakVertMax: 2.0,
  idleRmsMax: 0.12,
} as const;

export const KNN_K = 5;
export const KNN_MIN_CONFIDENCE = 0.55;
export const STATE_HOLD_MS = 600;

export const CALIBRATION_DURATION_MS = 5000;
export const CALIBRATION_LABELS = ['idle', 'shuffle', 'step'] as const;
export type Label = (typeof CALIBRATION_LABELS)[number];

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
  'spectralEntropy',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export const FEATURE_DIM = FEATURE_NAMES.length;
