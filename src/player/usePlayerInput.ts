export interface MoveInput {
  readonly x: number;
  readonly y: number;
}

export interface LookDelta {
  readonly x: number;
  readonly y: number;
}

const touchMove: MoveInput = { x: 0, y: 0 };
const touchLook: LookDelta = { x: 0, y: 0 };

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

export const consumeTouchLookDelta = (): LookDelta => {
  const delta = { x: touchLook.x, y: touchLook.y };

  Object.assign(touchLook, { x: 0, y: 0 });

  return delta;
};

export const resetTouchInput = (): void => {
  Object.assign(touchMove, { x: 0, y: 0 });
  Object.assign(touchLook, { x: 0, y: 0 });
};