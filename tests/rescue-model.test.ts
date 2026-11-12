import { describe, expect, it } from 'vitest';
import { E, N, S, W, createLayout, isConnected, rotateCW, rotatePiece, type PipeLayout } from '../src/scenes/rescue/model.ts';

describe('rotateCW', () => {
  it('moves every open side one quarter turn clockwise', () => {
    expect(rotateCW(N)).toBe(E);
    expect(rotateCW(E)).toBe(S);
    expect(rotateCW(S)).toBe(W);
    expect(rotateCW(W)).toBe(N);
    expect(rotateCW(N | S)).toBe(E | W);
    expect(rotateCW(N | E | S | W)).toBe(N | E | S | W);
  });

  it('returns to the start after four turns', () => {
    let o = N | E;
    for (let i = 0; i < 4; i++) o = rotateCW(o);
    expect(o).toBe(N | E);
  });
});

describe('pipe layout', () => {
  it('does not let fixed pieces rotate', () => {
    const layout = createLayout();
    expect(rotatePiece(layout, 'p00')).toBe(false);
    expect(rotatePiece(layout, 'p22')).toBe(false);
    expect(rotatePiece(layout, 'p10')).toBe(true);
  });

  it('starts unsolved', () => {
    expect(isConnected(createLayout())).toBe(false);
  });

  it('is solvable: some set of rotations connects source to drain', () => {
    const layout = createLayout();
    const movable = layout.pieces.filter((p) => !p.fixed);
    // Try every combination of 0-3 turns per movable piece (4^7).
    const base = layout.pieces.map((p) => p.openings);
    const solve = (i: number): boolean => {
      if (i === movable.length) return isConnected(layout);
      const piece = movable[i]!;
      for (let t = 0; t < 4; t++) {
        if (solve(i + 1)) return true;
        piece.openings = rotateCW(piece.openings);
      }
      return false;
    };
    expect(solve(0)).toBe(true);
    expect(base).toHaveLength(9);
  });

  it('counts a connected straight path as solved', () => {
    // A hand-built 2x1 layout: source opens E, drain opens W.
    const layout: PipeLayout = {
      cols: 2,
      rows: 1,
      pieces: [
        { id: 'a', col: 0, row: 0, openings: E, fixed: true },
        { id: 'b', col: 1, row: 0, openings: W, fixed: true },
      ],
      source: { col: 0, row: 0 },
      drain: { col: 1, row: 0 },
    };
    expect(isConnected(layout)).toBe(true);
  });

  it('is not solved when the neighbour is open on the wrong side', () => {
    const layout: PipeLayout = {
      cols: 2,
      rows: 1,
      pieces: [
        { id: 'a', col: 0, row: 0, openings: E, fixed: true },
        { id: 'b', col: 1, row: 0, openings: E, fixed: true },
      ],
      source: { col: 0, row: 0 },
      drain: { col: 1, row: 0 },
    };
    expect(isConnected(layout)).toBe(false);
  });
});
