import { FEATURE_NAMES, HARD_RULES, type Label } from '../lib/constants';

export interface HardRuleResult {
  readonly label: Label;
  readonly reason: string;
}

const idx = (name: (typeof FEATURE_NAMES)[number]): number => FEATURE_NAMES.indexOf(name);

export const evaluateHardRules = (features: readonly number[]): HardRuleResult | null => {
  const peakVert = features[idx('peakVert')] ?? 0;
  const rmsVert = features[idx('rmsVert')] ?? 0;
  const rmsHorz = features[idx('rmsHorz')] ?? 0;
  const vertJerk = features[idx('vertJerkPeak')] ?? 0;
  const vertRatio = features[idx('vertRatio')] ?? 0;

  const totalRms = Math.hypot(rmsVert, rmsHorz);

  if (
    peakVert >= HARD_RULES.stepPeakVertMin &&
    vertJerk >= HARD_RULES.stepVertJerkMin &&
    vertRatio >= HARD_RULES.stepVertRatioMin
  ) {
    return { label: 'step', reason: 'peak+jerk+vertical-dominance' };
  }

  if (peakVert < HARD_RULES.shufflePeakVertMax && totalRms < HARD_RULES.idleRmsMax) {
    return { label: 'idle', reason: 'low-energy' };
  }

  if (
    peakVert < HARD_RULES.shufflePeakVertMax &&
    totalRms >= HARD_RULES.shuffleRmsMin
  ) {
    return { label: 'shuffle', reason: 'rms-only-no-impact' };
  }

  return null;
};
