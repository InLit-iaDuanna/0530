import { FEATURE_NAMES, IMU_RULES, type Label } from '../lib/constants';

export interface ImuRuleResult {
  readonly label: Label;
  readonly reason: string;
  readonly confidence: number;
}

const idx = (name: (typeof FEATURE_NAMES)[number]): number => FEATURE_NAMES.indexOf(name);

export const evaluateImuRules = (features: readonly number[]): ImuRuleResult => {
  const peakVert = features[idx('peakVert')] ?? 0;
  const peakMag = features[idx('peakMag')] ?? 0;
  const rmsVert = features[idx('rmsVert')] ?? 0;
  const rmsMag = features[idx('rmsMag')] ?? 0;
  const rmsHorz = features[idx('rmsHorz')] ?? 0;
  const vertJerk = features[idx('vertJerkPeak')] ?? 0;
  const vertRatio = features[idx('vertRatio')] ?? 0;
  const dominantFreq = features[idx('dominantFreqVert')] ?? 0;
  const dominantFreqMag = features[idx('dominantFreqMag')] ?? dominantFreq;
  const stepPeakCount = features[idx('stepPeakCount')] ?? 0;
  const stepIntervalMeanMs = features[idx('stepIntervalMeanMs')] ?? 0;
  const stepIntervalCv = features[idx('stepIntervalCv')] ?? 1;
  const gyroPeak = features[idx('gyroPeak')] ?? 0;
  const gyroRms = features[idx('gyroRms')] ?? 0;
  const gyroAccelRatio = features[idx('gyroAccelRatio')] ?? 0;
  const spectralEntropy = features[idx('spectralEntropy')] ?? 0;
  const cadenceDrift = features[idx('cadenceDrift')] ?? 0;

  const totalRms = Math.max(rmsMag, Math.hypot(rmsVert, rmsHorz));

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
    vertJerk > IMU_RULES.smallWalkJerkMax ||
    (vertRatio > IMU_RULES.singleAxisVertRatioMin && rmsHorz < IMU_RULES.singleAxisHorzRmsMax)
  ) {
    return { label: 'other', reason: 'single-axis-or-impact-spoof', confidence: 0.84 };
  }

  const bestCadence = dominantFreqMag > 0 ? dominantFreqMag : dominantFreq;
  const cadenceOk =
    bestCadence >= IMU_RULES.cadenceMinHz && bestCadence <= IMU_RULES.cadenceMaxHz;
  const energyOk =
    totalRms >= IMU_RULES.smallWalkRmsMin &&
    peakMag >= IMU_RULES.smallWalkPeakMagMin &&
    peakVert <= Math.max(peakMag * 1.4, IMU_RULES.smallWalkPeakMagMin);
  const balanceOk =
    vertRatio >= IMU_RULES.smallWalkVertRatioMin &&
    vertRatio <= IMU_RULES.smallWalkVertRatioMax;
  const peakRhythmOk =
    stepPeakCount >= IMU_RULES.stepPeakCountMin &&
    stepIntervalMeanMs >= IMU_RULES.stepMinIntervalMs &&
    stepIntervalMeanMs <= IMU_RULES.stepMaxIntervalMs &&
    stepIntervalCv <= IMU_RULES.stepIntervalCvMax;
  const textureOk =
    vertJerk >= IMU_RULES.smallWalkJerkMin &&
    vertJerk <= IMU_RULES.smallWalkJerkMax &&
    spectralEntropy <= IMU_RULES.spectralEntropyMax &&
    cadenceDrift <= IMU_RULES.cadenceDriftMaxHz;

  if (cadenceOk && energyOk && balanceOk && peakRhythmOk && textureOk) {
    return { label: 'smallWalk', reason: 'peak-rhythm-cadence', confidence: 0.8 };
  }

  return { label: 'other', reason: 'missing-small-walk-gates', confidence: 0.62 };
};
