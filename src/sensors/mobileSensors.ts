import { MathUtils } from 'three';
import {
  SensorControlStatus,
  SensorMoveState,
  setSensorMoveState,
} from '../player/usePlayerInput';

type PermissionEvent = EventTarget & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

type WebKitOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

export const WALK_CADENCE_MIN = 80;
export const WALK_CADENCE_FAST = 160;
export const PLAYER_SENSOR_MAX_SPEED = 2.6;
export const MOTION_STALE_AFTER_MS = 900;

const BASE_YAW = -Math.PI / 2;

const gravity = { x: 0, y: 0, z: 0 };
const samples: number[] = [];
const stepIntervalsMs: number[] = [];

let status: SensorControlStatus = 'idle';
let yawOffset = 0;
let rawYaw = 0;
let yaw = BASE_YAW;
let pitch = 0;
let lastMagnitude = 0;
let lastStepAt = 0;
let lastEventAt = 0;
let active = false;
let listening = false;

export const getSensorStatus = (): SensorControlStatus => status;

export const refreshSensorControls = (): void => {
  publish(performance.now());
};

export const resetSensorCalibration = (): void => {
  yawOffset = rawYaw;
  yaw = BASE_YAW;
  publish(performance.now());
};

export const resetSensorRuntime = (): void => {
  stepIntervalsMs.length = 0;
  samples.length = 0;
  Object.assign(gravity, { x: 0, y: 0, z: 0 });
  lastMagnitude = 0;
  lastStepAt = 0;
  lastEventAt = 0;
  active = false;
  publish(performance.now());
};

export const requestSensorControls = async (): Promise<SensorControlStatus> => {
  if (!window.isSecureContext) {
    status = 'insecure';
    publish(performance.now());
    return status;
  }

  if (!('DeviceMotionEvent' in window) || !('DeviceOrientationEvent' in window)) {
    status = 'unsupported';
    publish(performance.now());
    return status;
  }

  status = 'requesting';
  publish(performance.now());

  const motionEvent = DeviceMotionEvent as unknown as PermissionEvent | undefined;
  const orientationEvent = DeviceOrientationEvent as unknown as PermissionEvent | undefined;
  const requests: Array<Promise<'granted' | 'denied' | 'default'>> = [];

  if (typeof motionEvent?.requestPermission === 'function') {
    requests.push(motionEvent.requestPermission());
  }

  if (typeof orientationEvent?.requestPermission === 'function') {
    requests.push(orientationEvent.requestPermission());
  }

  const granted =
    requests.length === 0 || (await Promise.all(requests)).every((result) => result === 'granted');

  status = granted ? 'active' : 'denied';

  if (status === 'active' && !listening) {
    window.addEventListener('deviceorientation', handleOrientation, true);
    window.addEventListener('devicemotion', handleMotion, true);
    listening = true;
  }

  publish(performance.now());
  return status;
};

const handleOrientation = (event: DeviceOrientationEvent): void => {
  const reading = event as WebKitOrientationEvent;
  let yawDeg: number | null = null;

  if (typeof reading.webkitCompassHeading === 'number') {
    yawDeg = reading.webkitCompassHeading;
  } else if (typeof event.alpha === 'number') {
    yawDeg = 360 - event.alpha;
  }

  if (yawDeg === null) {
    return;
  }

  rawYaw = (yawDeg * Math.PI) / 180;
  const nextYaw = BASE_YAW - angleDelta(rawYaw, yawOffset);
  const pitchDeg = typeof event.beta === 'number' ? event.beta : 0;
  yaw += angleDelta(nextYaw, yaw) * 0.24;
  pitch += (MathUtils.clamp((pitchDeg * Math.PI) / 180, -0.4, 0.4) - pitch) * 0.16;
  publish(performance.now());
};

const handleMotion = (event: DeviceMotionEvent): void => {
  const source = event.accelerationIncludingGravity;

  if (!source || source.x === null || source.y === null || source.z === null) {
    return;
  }

  ingestAcceleration({ x: source.x, y: source.y, z: source.z }, performance.now());
};

const ingestAcceleration = (accel: { x: number; y: number; z: number }, now: number): void => {
  gravity.x = gravity.x * 0.92 + accel.x * 0.08;
  gravity.y = gravity.y * 0.92 + accel.y * 0.08;
  gravity.z = gravity.z * 0.92 + accel.z * 0.08;

  const magnitude = Math.hypot(accel.x - gravity.x, accel.y - gravity.y, accel.z - gravity.z);
  samples.push(magnitude);

  if (samples.length > 18) {
    samples.shift();
  }

  const crossedUp = lastMagnitude < 1.1 && magnitude >= 1.1;

  if (sampleVariance(samples) > 0.42 && crossedUp && now - lastStepAt > 280) {
    if (lastStepAt > 0) {
      stepIntervalsMs.push(now - lastStepAt);

      if (stepIntervalsMs.length > 5) {
        stepIntervalsMs.shift();
      }
    }

    lastStepAt = now;
  }

  lastMagnitude = magnitude;
  lastEventAt = now;
  active = true;
  publish(now);
};

const readCadenceSpm = (): number => {
  const now = performance.now();

  if (!active || now - lastStepAt > MOTION_STALE_AFTER_MS || stepIntervalsMs.length === 0) {
    return 0;
  }

  const sorted = [...stepIntervalsMs].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const medianMs =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

  return medianMs > 0 ? 60_000 / medianMs : 0;
};

const publish = (now: number): void => {
  const cadenceSpm = readCadenceSpm();
  const forwardSpeed =
    MathUtils.clamp((cadenceSpm - WALK_CADENCE_MIN) / (WALK_CADENCE_FAST - WALK_CADENCE_MIN), 0, 1) *
    PLAYER_SENSOR_MAX_SPEED;
  const nextState: SensorMoveState = {
    forwardSpeed,
    yaw,
    pitch,
    cadenceSpm,
    lastStepAt: lastStepAt || lastEventAt || now,
    status,
  };

  setSensorMoveState(nextState);
};

const sampleVariance = (values: number[]): number => {
  if (values.length < 4) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
};

const angleDelta = (next: number, current: number): number =>
  Math.atan2(Math.sin(next - current), Math.cos(next - current));
