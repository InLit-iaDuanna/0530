export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MotionSample {
  readonly t: number;
  readonly accel: Vec3;
  readonly gyro: Vec3;
  readonly gravity: Vec3;
}

export interface FeatureVector {
  readonly values: readonly number[];
  readonly t: number;
}

export interface Classification {
  readonly label: 'smallWalk' | 'other';
  readonly confidence: number;
  readonly nearestDistance: number;
  readonly source: 'imu-rule' | 'knn' | 'healthkit-assisted' | 'fallback';
  readonly reason?: string;
}

export interface ClassifiedFrame {
  readonly classification: Classification;
  readonly features: FeatureVector;
  readonly stableLabel: 'smallWalk' | 'other';
  readonly stableSinceMs: number;
}

export interface HealthStepDelta {
  readonly steps: number;
  readonly available: boolean;
}

export interface HealthBridge {
  getStepDelta(startMs: number, endMs: number): Promise<HealthStepDelta>;
}

export type SensorStatus =
  | 'idle'
  | 'unsupported'
  | 'insecure'
  | 'permission-required'
  | 'requesting'
  | 'denied'
  | 'active';
