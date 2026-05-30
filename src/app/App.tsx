import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { MazeScene } from '../maze/MazeScene';
import { mazeLayout } from '../maze/layout';
import { Player } from '../player/Player';
import { resetTouchInput } from '../player/usePlayerInput';
import { VirtualJoystick } from '../controls/VirtualJoystick';
import { TouchLook } from '../controls/TouchLook';
import { KeyboardControls, KeyboardControlsEntry } from '../controls/keyboard';
import { Hud } from '../hud/Hud';

export enum Controls {
  Forward = 'forward',
  Backward = 'backward',
  Left = 'left',
  Right = 'right',
}

export type GameState =
  | { kind: 'playing'; startedAt: number }
  | { kind: 'won'; startedAt: number; finishedAt: number };

const createPlayingState = (): GameState => ({
  kind: 'playing',
  startedAt: performance.now(),
});

const useCoarsePointer = (): boolean => {
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const narrowViewportQuery = window.matchMedia('(max-width: 720px)');
    const update = (): void => {
      setIsCoarse(mediaQuery.matches || narrowViewportQuery.matches);
    };

    update();
    mediaQuery.addEventListener('change', update);
    narrowViewportQuery.addEventListener('change', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
      narrowViewportQuery.removeEventListener('change', update);
    };
  }, []);

  return isCoarse;
};

export const App = (): JSX.Element => {
  const [gameState, setGameState] = useState<GameState>(() => createPlayingState());
  const [resetSignal, setResetSignal] = useState(0);
  const [pointerLocked, setPointerLocked] = useState(false);
  const isCoarsePointer = useCoarsePointer();

  const keyboardMap = useMemo<KeyboardControlsEntry<Controls>[]>(
    () => [
      { name: Controls.Forward, keys: ['KeyW', 'ArrowUp'] },
      { name: Controls.Backward, keys: ['KeyS', 'ArrowDown'] },
      { name: Controls.Left, keys: ['KeyA', 'ArrowLeft'] },
      { name: Controls.Right, keys: ['KeyD', 'ArrowRight'] },
    ],
    [],
  );

  const restart = useCallback(() => {
    resetTouchInput();
    setPointerLocked(false);
    setResetSignal((current) => current + 1);
    setGameState(createPlayingState());
  }, []);

  const completeMaze = useCallback(() => {
    setGameState((current) => {
      if (current.kind === 'won') {
        return current;
      }

      return {
        kind: 'won',
        startedAt: current.startedAt,
        finishedAt: performance.now(),
      };
    });
  }, []);

  return (
    <KeyboardControls map={keyboardMap}>
      <main className="app-shell">
        <Canvas
          shadows={false}
          dpr={[1, 1.75]}
          camera={{ fov: 70, near: 0.1, far: 100 }}
          className="maze-canvas"
          aria-label="3D 迷宫场景，使用 WASD 移动，鼠标拖拽视角"
        >
          <color attach="background" args={['#07090f']} />
          <fog attach="fog" args={['#07090f', 18, 48]} />
          <ambientLight intensity={0.45} />
          <directionalLight position={[4, 8, 4]} intensity={1.2} />
          <Suspense fallback={null}>
            <Physics gravity={[0, -9.81, 0]} timeStep="vary">
              <MazeScene
                layout={mazeLayout}
                onComplete={completeMaze}
                onPointerLockChange={setPointerLocked}
                showDesktopPointerLock={!isCoarsePointer}
              />
              <Player
                layout={mazeLayout}
                resetSignal={resetSignal}
                useTouchLook={isCoarsePointer}
                enabled={gameState.kind === 'playing'}
              />
            </Physics>
          </Suspense>
        </Canvas>
        <Hud gameState={gameState} onRestart={restart} />
        {isCoarsePointer && gameState.kind === 'playing' ? (
          <>
            <VirtualJoystick />
            <TouchLook />
          </>
        ) : null}
        {!isCoarsePointer && !pointerLocked && gameState.kind === 'playing' ? (
          <div className="pointer-lock-hint" aria-hidden="false">
            <button id="pointer-lock-button" className="pointer-lock-button" type="button">
              点击开始
            </button>
          </div>
        ) : null}
      </main>
    </KeyboardControls>
  );
};