import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { MazeLayout } from './layout';
import { Walls } from './Walls';
import { ExitTrigger } from './ExitTrigger';
import { PointerLockControls } from '../controls/PointerLockControls';
import { GridFloor } from './GridFloor';

interface MazeSceneProps {
  readonly layout: MazeLayout;
  readonly onComplete: () => void;
  readonly onPointerLockChange: (isLocked: boolean) => void;
  readonly showDesktopPointerLock: boolean;
}

export const MazeScene = ({
  layout,
  onComplete,
  onPointerLockChange,
  showDesktopPointerLock,
}: MazeSceneProps): JSX.Element => {
  const width = layout.cols * layout.cellSize;
  const depth = layout.rows * layout.cellSize;

  return (
    <>
      {showDesktopPointerLock ? (
        <PointerLockControls
          selector="#pointer-lock-button"
          onLock={() => onPointerLockChange(true)}
          onUnlock={() => onPointerLockChange(false)}
        />
      ) : null}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[width / 2, 0.1, depth / 2]} position={[0, -0.1, 0]} />
      </RigidBody>
      <GridFloor layout={layout} />
      <Walls layout={layout} />
      <ExitTrigger layout={layout} onComplete={onComplete} />
    </>
  );
};