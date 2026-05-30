import type { HealthBridge, HealthStepDelta } from '../lib/types';

declare global {
  interface Window {
    healthBridge?: HealthBridge;
  }
}

export const readHealthStepDelta = async (
  startMs: number,
  endMs: number,
): Promise<HealthStepDelta> => {
  const bridge = window.healthBridge;
  if (!bridge) {
    return { steps: 0, available: false };
  }

  try {
    return await bridge.getStepDelta(startMs, endMs);
  } catch {
    return { steps: 0, available: false };
  }
};

export const hasHealthBridge = (): boolean => typeof window.healthBridge !== 'undefined';
