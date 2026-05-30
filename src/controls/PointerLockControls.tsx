import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls as PointerLockControlsImpl } from 'three/examples/jsm/controls/PointerLockControls.js';

interface PointerLockControlsProps {
  readonly selector: string;
  readonly onLock: () => void;
  readonly onUnlock: () => void;
}

export const PointerLockControls = ({
  selector,
  onLock,
  onUnlock,
}: PointerLockControlsProps): null => {
  const { camera, gl } = useThree();

  useEffect(() => {
    const controls = new PointerLockControlsImpl(camera, gl.domElement);
    const lockButton = document.querySelector<HTMLElement>(selector);
    const lock = (): void => controls.lock();

    lockButton?.addEventListener('click', lock);
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);

    return () => {
      lockButton?.removeEventListener('click', lock);
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      controls.disconnect();
    };
  }, [camera, gl.domElement, onLock, onUnlock, selector]);

  useFrame(() => undefined);

  return null;
};