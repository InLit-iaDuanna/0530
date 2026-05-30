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
  readonly label: 'idle' | 'shuffle' | 'step';
  readonly confidence: number;
  readonly nearestDistance: number;
  readonly source: 'hard-rule' | 'knn' | 'fallback';
}

export interface ClassifiedFrame {
  readonly classification: Classification;
  readonly features: FeatureVector;
  readonly stableLabel: 'idle' | 'shuffle' | 'step';
  readonly stableSinceMs: number;
}

export type SensorStatus =
  | 'idle'
  | 'unsupported'
  | 'insecure'
  | 'permission-required'
  | 'requesting'
  | 'denied'
  | 'active';
