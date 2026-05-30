export interface MoveInput {
  readonly x: number;
  readonly y: number;
}

export interface LookDelta {
  readonly x: number;
  readonly y: number;
}

export type SensorControlStatus =
  | 'idle'
  | 'unsupported'
  | 'insecure'
  | 'requesting'
  | 'denied'
  | 'active';

export interface SensorMoveState {
  readonly forwardSpeed: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly cadenceSpm: number;
  readonly lastStepAt: number;
  readonly status: SensorControlStatus;
}

const touchMove: MoveInput = { x: 0, y: 0 };
const touchLook: LookDelta = { x: 0, y: 0 };
const sensorMove: SensorMoveState = {
  forwardSpeed: 0,
  yaw: -Math.PI / 2,
  pitch: 0,
  cadenceSpm: 0,
  lastStepAt: 0,
  status: 'idle',
};

export const setTouchMove = (nextMove: MoveInput): void => {
  const length = Math.hypot(nextMove.x, nextMove.y);
  const scale = length > 1 ? 1 / length : 1;

  Object.assign(touchMove, {
    x: nextMove.x * scale,
    y: nextMove.y * scale,
  });
};

export const addTouchLookDelta = (delta: LookDelta): void => {
  Object.assign(touchLook, {
    x: touchLook.x + delta.x,
    y: touchLook.y + delta.y,
  });
};

export const getTouchMove = (): MoveInput => touchMove;

export const setSensorMoveState = (nextState: SensorMoveState): void => {
  Object.assign(sensorMove, nextState);
};

export const getSensorMoveState = (): SensorMoveState => sensorMove;

export const consumeTouchLookDelta = (): LookDelta => {
  const delta = { x: touchLook.x, y: touchLook.y };

  Object.assign(touchLook, { x: 0, y: 0 });

  return delta;
};

export const resetTouchInput = (): void => {
  Object.assign(touchMove, { x: 0, y: 0 });
  Object.assign(touchLook, { x: 0, y: 0 });
};

export const resetSensorInput = (): void => {
  Object.assign(sensorMove, {
    forwardSpeed: 0,
    yaw: -Math.PI / 2,
    pitch: 0,
    cadenceSpm: 0,
    lastStepAt: 0,
    status: 'idle',
  });
};
