import type { Classification, HealthStepDelta } from '../lib/types';

export const applyHealthAssistance = (
  classification: Classification,
  delta: HealthStepDelta,
): Classification => {
  if (!delta.available || classification.label !== 'smallWalk') {
    return classification;
  }

  if (delta.steps > 0) {
    return {
      ...classification,
      confidence: Math.min(1, classification.confidence + 0.16),
      source: 'healthkit-assisted',
      reason: `${classification.reason ?? 'small-walk'}+healthkit-step-delta`,
    };
  }

  return {
    ...classification,
    confidence: Math.max(0, classification.confidence * 0.82),
    reason: `${classification.reason ?? 'small-walk'}+healthkit-no-step-delta`,
  };
};
