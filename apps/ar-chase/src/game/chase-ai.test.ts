import { describe, expect, it } from 'vitest';
import { ChaseAI, DEFAULT_CHASE_CONFIG } from './chase-ai';

describe('ChaseAI', () => {
  it('moves the chaser closer over time', () => {
    const ai = new ChaseAI();
    const initial = ai.reset();

    const next = ai.update({
      dt: 1,
      elapsed: 0,
      playerYaw: 0,
      stepCount: 0,
      joystickForward: 0,
    });

    expect(next.distance).toBeLessThan(initial.distance);
  });

  it('applies speed ramp as survival time increases', () => {
    const ai = new ChaseAI();
    ai.reset();

    const early = ai.update({
      dt: 0,
      elapsed: 0,
      playerYaw: 0,
      stepCount: 0,
      joystickForward: 0,
    });
    const late = ai.update({
      dt: 0,
      elapsed: 30,
      playerYaw: 0,
      stepCount: 0,
      joystickForward: 0,
    });

    expect(late.speed).toBeGreaterThan(early.speed);
  });

  it('marks the player caught at the catch radius', () => {
    const ai = new ChaseAI({
      ...DEFAULT_CHASE_CONFIG,
      INITIAL_DISTANCE: 1.3,
      CATCH_RADIUS: 1.2,
    });
    ai.reset();

    const next = ai.update({
      dt: 1,
      elapsed: 0,
      playerYaw: 0,
      stepCount: 0,
      joystickForward: 0,
    });

    expect(next.caught).toBe(true);
  });

  it('lets detected steps temporarily increase distance', () => {
    const ai = new ChaseAI();
    const initial = ai.reset();

    const next = ai.update({
      dt: 0.1,
      elapsed: 0,
      playerYaw: 0,
      stepCount: 2,
      joystickForward: 0,
    });

    expect(next.distance).toBeGreaterThan(initial.distance);
  });
});
