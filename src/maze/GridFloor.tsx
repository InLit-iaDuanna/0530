import { LineSegments, BufferGeometry, Float32BufferAttribute } from 'three';
import { useMemo, useRef } from 'react';
import { MazeLayout } from './layout';

interface GridFloorProps {
  readonly layout: MazeLayout;
}

export const GridFloor = ({ layout }: GridFloorProps): JSX.Element => {
  const gridRef = useRef<LineSegments>(null);
  const geometry = useMemo(() => {
    const width = layout.cols * layout.cellSize;
    const depth = layout.rows * layout.cellSize;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const vertices: number[] = [];

    for (let col = 0; col <= layout.cols; col += 1) {
      const x = -halfWidth + col * layout.cellSize;
      vertices.push(x, 0.015, -halfDepth, x, 0.015, halfDepth);
    }

    for (let row = 0; row <= layout.rows; row += 1) {
      const z = -halfDepth + row * layout.cellSize;
      vertices.push(-halfWidth, 0.015, z, halfWidth, 0.015, z);
    }

    const nextGeometry = new BufferGeometry();
    nextGeometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));

    return nextGeometry;
  }, [layout]);

  return (
    <lineSegments ref={gridRef} geometry={geometry}>
      <lineBasicMaterial color="#5a7486" transparent opacity={0.72} />
    </lineSegments>
  );
};