import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { gridToWorld, MazeLayout } from './layout';

interface ExitTriggerProps {
  readonly layout: MazeLayout;
  readonly onComplete: () => void;
}

export const ExitTrigger = ({ layout, onComplete }: ExitTriggerProps): JSX.Element => {
  const markerRef = useRef<Group>(null);
  const exitPosition = useMemo(() => gridToWorld(layout, layout.exit), [layout]);
  const [x, , z] = exitPosition;

  useFrame(({ clock }) => {
    const marker = markerRef.current;

    if (!marker || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    marker.position.y = 1.1 + Math.sin(clock.elapsedTime * 1.6) * 0.12;
  });

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[layout.cellSize * 0.35, 1.2, layout.cellSize * 0.35]}
          position={[x, 1.1, z]}
          sensor
          onIntersectionEnter={onComplete}
        />
      </RigidBody>
      <group ref={markerRef} position={[x, 1.1, z]}>
        <mesh>
          <cylinderGeometry args={[0.55, 0.55, 2.2, 24, 1, true]} />
          <meshBasicMaterial color="#f6c45c" opacity={0.2} transparent wireframe />
        </mesh>
        <pointLight color="#f6c45c" intensity={1.5} distance={8} />
      </group>
    </>
  );
};