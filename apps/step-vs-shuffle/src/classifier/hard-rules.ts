import { FEATURE_NAMES, IMU_RULES, type Label } from '../lib/constants';

export interface ImuRuleResult {
  readonly label: Label;
  readonly reason: string;
  readonly confidence: number;
}

const idx = (name: (typeof FEATURE_NAMES)[number]): number => FEATURE_NAMES.indexOf(name);

export const evaluateImuRules = (features: readonly number[]): ImuRuleResult => {
  const peakVert = features[idx('peakVert')] ?? 0;
  const rmsVert = features[idx('rmsVert')] ?? 0;
  const rmsHorz = features[idx('rmsHorz')] ?? 0;
  const vertJerk = features[idx('vertJerkPeak')] ?? 0;
  const vertRatio = features[idx('vertRatio')] ?? 0;
  const dominantFreq = features[idx('dominantFreqVert')] ?? 0;
  const gyroPeak = features[idx('gyroPeak')] ?? 0;
  const gyroRms = features[idx('gyroRms')] ?? 0;
  const gyroAccelRatio = features[idx('gyroAccelRatio')] ?? 0;
  const spectralEntropy = features[idx('spectralEntropy')] ?? 0;
  const cadenceDrift = features[idx('cadenceDrift')] ?? 0;

  const totalRms = Math.hypot(rmsVert, rmsHorz);

  if (totalRms < IMU_RULES.stillRmsMax) {
    return { label: 'other', reason: 'still-low-energy', confidence: 0.92 };
  }

  if (
    gyroPeak > IMU_RULES.handGyroPeakMax ||
    gyroRms > IMU_RULES.handGyroRmsMax ||
    gyroAccelRatio > IMU_RULES.handGyroAccelRatioMax
  ) {
    return { label: 'other', reason: 'hand-rotation-too-high', confidence: 0.86 };
  }

  if (
    peakVert > IMU_RULES.smallWalkPeakVertMax ||
    vertJerk > IMU_RULES.smallWalkJerkMax ||
    vertRatio > IMU_RULES.singleAxisVertRatioMin
  ) {
    return { label: 'other', reason: 'single-axis-or-impact-spoof', confidence: 0.84 };
  }

  const cadenceOk =
    dominantFreq >= IMU_RULES.cadenceMinHz && dominantFreq <= IMU_RULES.cadenceMaxHz;
  const energyOk =
    totalRms >= IMU_RULES.smallWalkRmsMin &&
    peakVert >= IMU_RULES.smallWalkPeakVertMin &&
    peakVert <= IMU_RULES.smallWalkPeakVertMax;
  const balanceOk =
    vertRatio >= IMU_RULES.smallWalkVertRatioMin &&
    vertRatio <= IMU_RULES.smallWalkVertRatioMax;
  const textureOk =
    vertJerk >= IMU_RULES.smallWalkJerkMin &&
    vertJerk <= IMU_RULES.smallWalkJerkMax &&
    spectralEntropy <= IMU_RULES.spectralEntropyMax &&
    cadenceDrift <= IMU_RULES.cadenceDriftMaxHz;

  if (cadenceOk && energyOk && balanceOk && textureOk) {
    return { label: 'smallWalk', reason: 'cadence-energy-texture', confidence: 0.76 };
  }

  return { label: 'other', reason: 'missing-small-walk-gates', confidence: 0.62 };
};
