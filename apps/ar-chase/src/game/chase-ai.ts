import { clamp } from '../lib/lowpass';

export interface ChaseConfig {
  INITIAL_DISTANCE: number;
  CATCH_RADIUS: number;
  BASE_CHASE_SPEED: number;
  CHASE_SPEED_RAMP: number;
  LOOK_AT_PENALTY_MUL: number;
  PLAYER_STEP_GAIN: number;
  JOYSTICK_FORWARD_SPEED: number;
  MAX_CHASE_SPEED: number;
}

export interface ChaseSnapshot {
  distance: number;
  azimuth: number;
  speed: number;
  caught: boolean;
  danger: number;
}

export interface ChaseInput {
  dt: number;
  elapsed: number;
  playerYaw: number;
  stepCount: number;
  joystickForward: number;
}

export const DEFAULT_CHASE_CONFIG: ChaseConfig = {
  INITIAL_DISTANCE: 12,
  CATCH_RADIUS: 1.2,
  BASE_CHASE_SPEED: 1.4,
  CHASE_SPEED_RAMP: 0.05,
  LOOK_AT_PENALTY_MUL: 1.3,
  PLAYER_STEP_GAIN: 0.6,
  JOYSTICK_FORWARD_SPEED: 2,
  MAX_CHASE_SPEED: 4.4,
};

export class ChaseAI {
  private distance: number;
  private azimuth = Math.PI;

  constructor(private readonly config: ChaseConfig = DEFAULT_CHASE_CONFIG) {
    this.distance = config.INITIAL_DISTANCE;
  }

  reset(): ChaseSnapshot {
    this.distance = this.config.INITIAL_DISTANCE;
    this.azimuth = Math.PI;
    return this.snapshot(0);
  }

  update(input: ChaseInput): ChaseSnapshot {
    const lookPenalty = this.isLookingAtChaser(input.playerYaw)
      ? this.config.LOOK_AT_PENALTY_MUL
      : 1;
    const speed = clamp(
      (this.config.BASE_CHASE_SPEED + this.config.CHASE_SPEED_RAMP * input.elapsed) * lookPenalty,
      0,
      this.config.MAX_CHASE_SPEED,
    );

    const stepEscape = input.stepCount * this.config.PLAYER_STEP_GAIN;
    const joystickEscape =
      Math.max(0, input.joystickForward) * this.config.JOYSTICK_FORWARD_SPEED * input.dt;

    this.distance += stepEscape + joystickEscape - speed * input.dt;
    this.distance = Math.max(0, this.distance);

    const turnDrift = Math.sin(input.playerYaw - this.azimuth) * 0.35 * input.dt;
    this.azimuth += turnDrift;

    return this.snapshot(speed);
  }

  private isLookingAtChaser(playerYaw: number): boolean {
    const chaserDirection = this.azimuth;
    const angle = Math.abs(Math.atan2(Math.sin(playerYaw - chaserDirection), Math.cos(playerYaw - chaserDirection)));
    return angle < Math.PI / 6;
  }

  private snapshot(speed: number): ChaseSnapshot {
    const danger = clamp(
      (this.config.INITIAL_DISTANCE - this.distance) /
        (this.config.INITIAL_DISTANCE - this.config.CATCH_RADIUS),
      0,
      1,
    );

    return {
      distance: this.distance,
      azimuth: this.azimuth,
      speed,
      caught: this.distance <= this.config.CATCH_RADIUS,
      danger,
    };
  }
}
