import { PointerEvent, useRef } from 'react';
import { addTouchLookDelta } from '../player/usePlayerInput';

interface LookPointer {
  readonly pointerId: number;
  readonly lastX: number;
  readonly lastY: number;
}

export const TouchLook = (): JSX.Element => {
  const lookPointer = useRef<LookPointer | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    surfaceRef.current?.setPointerCapture(event.pointerId);
    lookPointer.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const current = lookPointer.current;

    if (!current || current.pointerId !== event.pointerId) {
      return;
    }

    addTouchLookDelta({
      x: event.clientX - current.lastX,
      y: event.clientY - current.lastY,
    });

    lookPointer.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const releasePointer = (event: PointerEvent<HTMLDivElement>): void => {
    if (lookPointer.current?.pointerId !== event.pointerId) {
      return;
    }

    surfaceRef.current?.releasePointerCapture(event.pointerId);
    lookPointer.current = null;
  };

  return (
    <div
      ref={surfaceRef}
      className="touch-look"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      aria-hidden="true"
    />
  );
};