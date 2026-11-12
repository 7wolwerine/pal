/**
 * The pipe puzzle behind the drowning rescue. Water enters at a source and
 * must reach the drain; the player rotates pipe pieces to connect them. No
 * DOM and no timers in here, so the connectivity rules can be unit tested.
 *
 * Directions are a 4-bit mask: N=1, E=2, S=4, W=8. A piece's `openings` is the
 * set of sides it is open on. Rotating a quarter turn clockwise moves every
 * open side one step: N->E->S->W->N.
 */

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export type Dir = typeof N | typeof E | typeof S | typeof W;

export const OPPOSITE: Record<Dir, Dir> = { [N]: S, [E]: W, [S]: N, [W]: E };
const STEP: Record<Dir, [number, number]> = { [N]: [0, -1], [E]: [1, 0], [S]: [0, 1], [W]: [-1, 0] };

/** Rotates an openings mask a quarter turn clockwise. */
export function rotateCW(openings: number): number {
  // Each bit shifts up one (N->E->S->W); W wraps back to N.
  return ((openings << 1) | (openings >> 3)) & 0b1111;
}

export interface Piece {
  readonly id: string;
  readonly col: number;
  readonly row: number;
  /** Current open sides. */
  openings: number;
  /** Fixed pieces (source, drain, walls) cannot be rotated. */
  readonly fixed?: boolean;
}

export interface PipeLayout {
  readonly cols: number;
  readonly rows: number;
  readonly pieces: Piece[];
  /** The cell water enters from, and the side it enters through. */
  readonly source: { col: number; row: number };
  /** The cell that drains the water away. */
  readonly drain: { col: number; row: number };
}

/** A fixed 3x3 layout. Elbows and straights start scrambled; the player sorts them. */
export function createLayout(): PipeLayout {
  const EL = N | E; // elbow
  const ST = N | S; // straight
  const TEE = N | E | S;
  const pieces: Piece[] = [
    { id: 'p00', col: 0, row: 0, openings: E | S, fixed: true }, // source corner
    { id: 'p10', col: 1, row: 0, openings: ST },
    { id: 'p20', col: 2, row: 0, openings: EL },
    { id: 'p01', col: 0, row: 1, openings: TEE },
    { id: 'p11', col: 1, row: 1, openings: EL },
    { id: 'p21', col: 2, row: 1, openings: ST },
    { id: 'p02', col: 0, row: 2, openings: EL },
    { id: 'p12', col: 1, row: 2, openings: ST },
    { id: 'p22', col: 2, row: 2, openings: N | W, fixed: true }, // drain corner
  ];
  return { cols: 3, rows: 3, pieces, source: { col: 0, row: 0 }, drain: { col: 2, row: 2 } };
}

function at(layout: PipeLayout, col: number, row: number): Piece | undefined {
  return layout.pieces.find((p) => p.col === col && p.row === row);
}

/** Rotates a non-fixed piece a quarter turn. Returns false if it could not be turned. */
export function rotatePiece(layout: PipeLayout, id: string): boolean {
  const piece = layout.pieces.find((p) => p.id === id);
  if (!piece || piece.fixed) return false;
  piece.openings = rotateCW(piece.openings);
  return true;
}

/**
 * True when water can flow from the source to the drain through connected,
 * mutually-open pipe sides. A flood fill across the grid.
 */
export function isConnected(layout: PipeLayout): boolean {
  const start = at(layout, layout.source.col, layout.source.row);
  const target = at(layout, layout.drain.col, layout.drain.row);
  if (!start || !target) return false;

  const seen = new Set<string>();
  const queue: Piece[] = [start];
  seen.add(start.id);
  while (queue.length > 0) {
    const cell = queue.shift();
    if (!cell) break;
    if (cell === target) return true;
    for (const dir of [N, E, S, W] as Dir[]) {
      if (!(cell.openings & dir)) continue;
      const [dx, dy] = STEP[dir];
      const next = at(layout, cell.col + dx, cell.row + dy);
      // Both sides must be open to each other for water to pass.
      if (!next || seen.has(next.id) || !(next.openings & OPPOSITE[dir])) continue;
      seen.add(next.id);
      queue.push(next);
    }
  }
  return false;
}
