import { PointerEvent, useCallback, useRef, useState } from 'react';
import { setTouchMove } from '../player/usePlayerInput';

const MAX_RADIUS = 42;

interface JoystickState {
  readonly activePointerId: number | null;
  readonly originX: number;
  readonly originY: number;
  readonly knobX: number;
  readonly knobY: number;
}

const idleJoystick: JoystickState = {
  activePointerId: null,
  originX: 0,
  originY: 0,
  knobX: 0,
  knobY: 0,
};

export const VirtualJoystick = (): JSX.Element => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<JoystickState>(idleJoystick);

  const updateMove = useCallback((clientX: number, clientY: number, currentState: JoystickState) => {
    const deltaX = clientX - currentState.originX;
    const deltaY = clientY - currentState.originY;
    const distance = Math.min(Math.hypot(deltaX, deltaY), MAX_RADIUS);
    const angle = Math.atan2(deltaY, deltaX);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;

    setTouchMove({
      x: knobX / MAX_RADIUS,
      y: -knobY / MAX_RADIUS,
    });

    setState((previous) => ({
      ...previous,
      knobX,
      knobY,
    }));
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const base = baseRef.current;

    if (!base) {
      return;
    }

    const rect = base.getBoundingClientRect();
    const nextState: JoystickState = {
      activePointerId: event.pointerId,
      originX: rect.left + rect.width / 2,
      originY: rect.top + rect.height / 2,
      knobX: 0,
      knobY: 0,
    };

    base.setPointerCapture(event.pointerId);
    setState(nextState);
    updateMove(event.clientX, event.clientY, nextState);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (state.activePointerId !== event.pointerId) {
      return;
    }

    updateMove(event.clientX, event.clientY, state);
  };

  const releasePointer = (event: PointerEvent<HTMLDivElement>): void => {
    if (state.activePointerId !== event.pointerId) {
      return;
    }

    baseRef.current?.releasePointerCapture(event.pointerId);
    setTouchMove({ x: 0, y: 0 });
    setState(idleJoystick);
  };

  return (
    <div
      ref={baseRef}
      className="virtual-joystick"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      aria-hidden="true"
    >
      <span
        className="virtual-joystick__knob"
        style={{
          transform: `translate(${state.knobX}px, ${state.knobY}px)`,
        }}
      />
    </div>
  );
};