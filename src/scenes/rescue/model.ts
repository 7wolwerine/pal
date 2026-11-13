/**
 * The pipe puzzle behind the drowning rescue. A tap fills the tank the
 * assistant is trapped in; the tank's outlet feeds into a grid of pipes and
 * the grid must lead the water down into the floor drain. The player turns
 * pipe pieces until the way out is open. No DOM and no timers in here, so the
 * flow rules can be unit tested.
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

export const DIRS: readonly Dir[] = [N, E, S, W];
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
  /** Fixed pieces (rusted-in blocks) cannot be rotated. */
  readonly fixed?: boolean;
}

/** Where water crosses the edge of the grid: a cell and the side it crosses. */
export interface Port {
  readonly col: number;
  readonly row: number;
  readonly side: Dir;
}

export interface PipeLayout {
  readonly cols: number;
  readonly rows: number;
  readonly pieces: Piece[];
  /** The tank's outlet pours in here. */
  readonly inlet: Port;
  /** The floor drain takes the water away here. */
  readonly outlet: Port;
}

const EL = N | E; // elbow
const ST = N | S; // straight
const TEE = N | E | S;

/**
 * A fixed 4x4 grid. The tank's outlet enters the bottom-left cell from the
 * west; the drain sits under the bottom-right cell. Two rusted blocks sit on
 * the short way along the bottom, so the water has to climb around them.
 */
export function createLayout(): PipeLayout {
  const shapes: Record<string, number> = {
    // row 0
    '0,0': EL, '1,0': ST, '2,0': TEE, '3,0': EL,
    // row 1
    '0,1': ST, '1,1': EL, '2,1': ST, '3,1': EL,
    // row 2
    '0,2': EL, '1,2': EL, '2,2': 0, '3,2': ST,
    // row 3
    '0,3': EL, '1,3': 0, '2,3': TEE, '3,3': ST,
  };
  const pieces: Piece[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const openings = shapes[`${col},${row}`] ?? 0;
      pieces.push({ id: `p${col}${row}`, col, row, openings, ...(openings === 0 ? { fixed: true } : {}) });
    }
  }
  return { cols: 4, rows: 4, pieces, inlet: { col: 0, row: 3, side: W }, outlet: { col: 3, row: 3, side: S } };
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
 * Every piece the water reaches from the inlet, in the order it gets there
 * (so the picture can let it run along the pipes). Empty when the first
 * piece does not even face the inlet.
 */
export function wetPieces(layout: PipeLayout): Piece[] {
  const start = at(layout, layout.inlet.col, layout.inlet.row);
  if (!start || !(start.openings & layout.inlet.side)) return [];
  const seen = new Set<string>([start.id]);
  const order: Piece[] = [start];
  for (let i = 0; i < order.length; i++) {
    const cell = order[i];
    if (!cell) break;
    for (const dir of DIRS) {
      if (!(cell.openings & dir)) continue;
      const [dx, dy] = STEP[dir];
      const next = at(layout, cell.col + dx, cell.row + dy);
      // Both sides must be open to each other for water to pass.
      if (!next || seen.has(next.id) || !(next.openings & OPPOSITE[dir])) continue;
      seen.add(next.id);
      order.push(next);
    }
  }
  return order;
}

/** True when water from the tank reaches the drain. */
export function isConnected(layout: PipeLayout): boolean {
  const end = at(layout, layout.outlet.col, layout.outlet.row);
  if (!end || !(end.openings & layout.outlet.side)) return false;
  return wetPieces(layout).includes(end);
}

/**
 * Where water would spill: every open side of a wet pipe that does not lead
 * into another pipe (or into the tank's outlet or the drain). Only a perfect
 * run of pipes, with no open ends at all, drains the tank.
 */
export function leaks(layout: PipeLayout): Port[] {
  const wet = wetPieces(layout);
  const out: Port[] = [];
  for (const piece of wet) {
    for (const dir of DIRS) {
      if (!(piece.openings & dir)) continue;
      const isInlet = piece.col === layout.inlet.col && piece.row === layout.inlet.row && dir === layout.inlet.side;
      const isOutlet = piece.col === layout.outlet.col && piece.row === layout.outlet.row && dir === layout.outlet.side;
      if (isInlet || isOutlet) continue;
      const [dx, dy] = STEP[dir];
      const next = at(layout, piece.col + dx, piece.row + dy);
      if (next && next.openings & OPPOSITE[dir]) continue;
      out.push({ col: piece.col, row: piece.row, side: dir });
    }
  }
  return out;
}

/** Drains only when the water reaches the drain and nothing spills on the way. */
export function isPerfect(layout: PipeLayout): boolean {
  return isConnected(layout) && leaks(layout).length === 0;
}
