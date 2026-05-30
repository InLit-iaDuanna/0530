import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Matrix4 } from 'three';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { getWallCells, gridToWorld, MazeLayout } from './layout';
import { createWallTexture } from './wallTexture';

interface WallsProps {
  readonly layout: MazeLayout;
}

export const Walls = ({ layout }: WallsProps): JSX.Element => {
  const meshRef = useRef<InstancedMesh>(null);
  const edgeRef = useRef<InstancedMesh>(null);
  const wallCells = useMemo(() => getWallCells(layout), [layout]);
  const matrix = useMemo(() => new Matrix4(), []);
  const wallTexture = useMemo(() => createWallTexture(), []);
  const halfCell = layout.cellSize / 2;
  const halfHeight = layout.wallHeight / 2;

  useEffect(() => {
    return () => wallTexture.dispose();
  }, [wallTexture]);

  useLayoutEffect(() => {
    if (!meshRef.current) {
      return;
    }

    wallCells.forEach((cell, index) => {
      const [x, y, z] = gridToWorld(layout, cell, halfHeight);
      matrix.makeTranslation(x, y, z);
      meshRef.current?.setMatrixAt(index, matrix);
      edgeRef.current?.setMatrixAt(index, matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (edgeRef.current) {
      edgeRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [halfHeight, layout, matrix, wallCells]);

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, wallCells.length]}>
        <boxGeometry args={[layout.cellSize, layout.wallHeight, layout.cellSize]} />
        <meshBasicMaterial map={wallTexture} color="#ffffff" opacity={0.96} transparent />
      </instancedMesh>
      <instancedMesh ref={edgeRef} args={[undefined, undefined, wallCells.length]}>
        <boxGeometry args={[layout.cellSize + 0.015, layout.wallHeight + 0.015, layout.cellSize + 0.015]} />
        <meshBasicMaterial
          color="#d9fbff"
          opacity={0.48}
          transparent
          wireframe
          depthWrite={false}
        />
      </instancedMesh>
      <RigidBody type="fixed" colliders={false}>
        {wallCells.map((cell) => {
          const [x, y, z] = gridToWorld(layout, cell, halfHeight);

          return (
            <CuboidCollider
              key={`${cell[0]}-${cell[1]}`}
              args={[halfCell, halfHeight, halfCell]}
              position={[x, y, z]}
            />
          );
        })}
      </RigidBody>
    </>
  );
};
