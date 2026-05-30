import { clamp } from '../lib/lowpass';

export interface Vec2 {
  x: number;
  z: number;
}

export interface ChaseConfig {
  INITIAL_DISTANCE: number;
  CATCH_RADIUS: number;
  BASE_CHASE_SPEED: number;
  CHASE_SPEED_RAMP: number;
  LOOK_AT_PENALTY_MUL: number;
  PLAYER_STEP_GAIN: number;
  PLAYER_FORWARD_SPEED: number;
  MAX_CHASE_SPEED: number;
  ROOM_HALF_SIZE: number;
}

export interface ChaseSnapshot {
  distance: number;
  player: Vec2;
  chaser: Vec2;
  chaserBearing: number;
  speed: number;
  caught: boolean;
  danger: number;
}

export interface ChaseInput {
  dt: number;
  elapsed: number;
  playerYaw: number;
  forwardAxis: number;
  stepCount: number;
}

export const DEFAULT_CHASE_CONFIG: ChaseConfig = {
  INITIAL_DISTANCE: 14,
  CATCH_RADIUS: 1.2,
  BASE_CHASE_SPEED: 1.4,
  CHASE_SPEED_RAMP: 0.05,
  LOOK_AT_PENALTY_MUL: 1.3,
  PLAYER_STEP_GAIN: 0.6,
  PLAYER_FORWARD_SPEED: 4.2,
  MAX_CHASE_SPEED: 4.4,
  ROOM_HALF_SIZE: 34,
};

export class ChaseAI {
  private player: Vec2 = { x: 0, z: 0 };
  private chaser: Vec2 = { x: 0, z: DEFAULT_CHASE_CONFIG.INITIAL_DISTANCE };

  constructor(private readonly config: ChaseConfig = DEFAULT_CHASE_CONFIG) {
    this.reset();
  }

  reset(): ChaseSnapshot {
    this.player = { x: 0, z: 0 };
    this.chaser = { x: 0, z: this.config.INITIAL_DISTANCE };
    return this.snapshot(0);
  }

  update(input: ChaseInput): ChaseSnapshot {
    this.movePlayer(input);
    const lookPenalty = this.isLookingAtChaser(input.playerYaw)
      ? this.config.LOOK_AT_PENALTY_MUL
      : 1;
    const speed = clamp(
      (this.config.BASE_CHASE_SPEED + this.config.CHASE_SPEED_RAMP * input.elapsed) * lookPenalty,
      0,
      this.config.MAX_CHASE_SPEED,
    );

    this.moveChaser(speed, input.dt);

    return this.snapshot(speed);
  }

  private isLookingAtChaser(playerYaw: number): boolean {
    const chaserDirection = this.bearingToChaser();
    const angle = Math.abs(Math.atan2(Math.sin(playerYaw - chaserDirection), Math.cos(playerYaw - chaserDirection)));
    return angle < Math.PI / 6;
  }

  private movePlayer(input: ChaseInput): void {
    const stepBoost = input.stepCount * this.config.PLAYER_STEP_GAIN;
    const moveDistance =
      Math.max(0, input.forwardAxis) * this.config.PLAYER_FORWARD_SPEED * input.dt + stepBoost;

    this.player.x -= Math.sin(input.playerYaw) * moveDistance;
    this.player.z -= Math.cos(input.playerYaw) * moveDistance;
    this.player.x = clamp(this.player.x, -this.config.ROOM_HALF_SIZE, this.config.ROOM_HALF_SIZE);
    this.player.z = clamp(this.player.z, -this.config.ROOM_HALF_SIZE, this.config.ROOM_HALF_SIZE);
  }

  private moveChaser(speed: number, dt: number): void {
    const dx = this.player.x - this.chaser.x;
    const dz = this.player.z - this.chaser.z;
    const distance = Math.max(0.0001, Math.hypot(dx, dz));
    const moveDistance = Math.min(distance, speed * dt);
    this.chaser.x += (dx / distance) * moveDistance;
    this.chaser.z += (dz / distance) * moveDistance;
  }

  private bearingToChaser(): number {
    const dx = this.chaser.x - this.player.x;
    const dz = this.chaser.z - this.player.z;
    return Math.atan2(-dx, -dz);
  }

  private snapshot(speed: number): ChaseSnapshot {
    const distance = Math.hypot(this.player.x - this.chaser.x, this.player.z - this.chaser.z);
    const danger = clamp(
      (this.config.INITIAL_DISTANCE - distance) /
        (this.config.INITIAL_DISTANCE - this.config.CATCH_RADIUS),
      0,
      1,
    );

    return {
      distance,
      player: { ...this.player },
      chaser: { ...this.chaser },
      chaserBearing: this.bearingToChaser(),
      speed,
      caught: distance <= this.config.CATCH_RADIUS,
      danger,
    };
  }
}
