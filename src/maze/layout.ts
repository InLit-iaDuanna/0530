export type MazeCell = 0 | 1;
export type Vec2 = readonly [number, number];

export interface MazeLayout {
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly wallHeight: number;
  readonly grid: readonly (readonly MazeCell[])[];
  readonly start: Vec2;
  readonly exit: Vec2;
}

export const mazeLayout: MazeLayout = {
  cols: 12,
  rows: 12,
  cellSize: 2,
  wallHeight: 2.5,
  start: [1, 1],
  exit: [10, 10],
  grid: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
};

export const gridToWorld = (
  layout: MazeLayout,
  [col, row]: Vec2,
  y = 0,
): readonly [number, number, number] => [
  (col - (layout.cols - 1) / 2) * layout.cellSize,
  y,
  (row - (layout.rows - 1) / 2) * layout.cellSize,
];

export const getWallCells = (layout: MazeLayout): Vec2[] => {
  const cells: Vec2[] = [];

  layout.grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === 1) {
        cells.push([colIndex, rowIndex]);
      }
    });
  });

  return cells;
};