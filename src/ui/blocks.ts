/**
 * The PAL Pro download as falling four-square blocks: ten pieces drop one by
 * one and stack into a 10 x 4 well that is exactly full at 100 %. Pure layout
 * and timing here; drawing is a small canvas helper below.
 */

export const WELL_W = 10;
export const WELL_H = 4;

export interface Piece {
  /** Cells as [col, row] in the well, row 0 at the top. */
  readonly cells: readonly (readonly [number, number])[];
  readonly colour: string;
}

const I = '#7ec8f0';
const O = '#ffd75e';
const L = '#f5a65a';
const J = '#7f8be0';

/** In drop order: everything lands on the floor or on a piece that is already there. */
export const PIECES: readonly Piece[] = [
  { colour: O, cells: [[1, 2], [2, 2], [1, 3], [2, 3]] },
  { colour: O, cells: [[5, 2], [6, 2], [5, 3], [6, 3]] },
  { colour: L, cells: [[3, 1], [3, 2], [3, 3], [4, 3]] },
  { colour: L, cells: [[8, 1], [8, 2], [8, 3], [9, 3]] },
  { colour: I, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { colour: I, cells: [[7, 0], [7, 1], [7, 2], [7, 3]] },
  { colour: O, cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  { colour: O, cells: [[5, 0], [6, 0], [5, 1], [6, 1]] },
  { colour: J, cells: [[3, 0], [4, 0], [4, 1], [4, 2]] },
  { colour: J, cells: [[8, 0], [9, 0], [9, 1], [9, 2]] },
];

export interface PlacedPiece extends Piece {
  /** Rows above its resting place, 0 once it has landed. */
  readonly lift: number;
}

/** Which pieces show at a given progress (0..1), and how high the falling one still is. */
export function blocksAt(progress: number): PlacedPiece[] {
  const p = Math.min(1, Math.max(0, progress)) * PIECES.length;
  const landed = Math.floor(p);
  const out: PlacedPiece[] = PIECES.slice(0, landed).map((piece) => ({ ...piece, lift: 0 }));
  const falling = PIECES[landed];
  if (falling && p > landed) {
    const top = Math.min(...falling.cells.map(([, r]) => r));
    // Starts just above the well and drops into place.
    out.push({ ...falling, lift: (1 - (p - landed)) * (top + 4) });
  }
  return out;
}

/** Draws the well at a given progress. `cell` is the size of one square in canvas pixels. */
export function drawBlocks(g: CanvasRenderingContext2D, progress: number, cell: number): void {
  const w = WELL_W * cell;
  const h = WELL_H * cell;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#f6eef2';
  g.fillRect(0, 0, w, h);
  for (const piece of blocksAt(progress)) {
    for (const [c, r] of piece.cells) {
      const y = (r - piece.lift) * cell;
      if (y + cell <= 0) continue;
      g.fillStyle = piece.colour;
      g.fillRect(c * cell, y, cell, cell);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(c * cell + 1, y + 1, cell - 2, 2);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(c * cell, y + cell - 2, cell, 2);
    }
  }
}
