import { describe, expect, it } from 'vitest';
import { E, MERCY_AFTER, N, RISE_PER_S, S, START_LEVEL, W, createLayout, isConnected, riseRate, rise, rotateCW, rotatePiece, secondsOfAir, wetPieces, type PipeLayout } from '../src/scenes/rescue/model.ts';

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
  it('does not let the rusted blocks rotate', () => {
    const layout = createLayout();
    expect(rotatePiece(layout, 'p13')).toBe(false);
    expect(rotatePiece(layout, 'p22')).toBe(false);
    expect(rotatePiece(layout, 'p00')).toBe(true);
  });

  it('feeds the bottom-left cell from the tank and drains under the bottom-right one', () => {
    const layout = createLayout();
    expect(layout.inlet).toEqual({ col: 0, row: 3, side: W });
    expect(layout.outlet).toEqual({ col: 3, row: 3, side: S });
  });

  it('is solvable by turning pieces, and the water climbs around the rust', () => {
    const layout = createLayout();
    const turn = (id: string, openings: number): void => {
      const piece = layout.pieces.find((p) => p.id === id)!;
      for (let i = 0; i < 4 && piece.openings !== openings; i++) rotatePiece(layout, id);
      expect(piece.openings).toBe(openings);
    };
    turn('p03', W | N);
    turn('p02', S | E);
    turn('p12', W | N);
    turn('p11', S | E);
    turn('p21', W | E);
    turn('p31', W | S);
    turn('p32', N | S);
    turn('p33', N | S);
    expect(isConnected(layout)).toBe(true);
    expect(wetPieces(layout).map((p) => p.id)).toEqual(['p03', 'p02', 'p12', 'p11', 'p21', 'p31', 'p32', 'p33']);
  });

  it('is dry when the first pipe does not face the tank', () => {
    const layout: PipeLayout = {
      cols: 1,
      rows: 1,
      pieces: [{ id: 'a', col: 0, row: 0, openings: N | S }],
      inlet: { col: 0, row: 0, side: W },
      outlet: { col: 0, row: 0, side: S },
    };
    expect(wetPieces(layout)).toEqual([]);
    expect(isConnected(layout)).toBe(false);
  });

  it('is not solved when the neighbour is open on the wrong side', () => {
    const layout: PipeLayout = {
      cols: 2,
      rows: 1,
      pieces: [
        { id: 'a', col: 0, row: 0, openings: W | E },
        { id: 'b', col: 1, row: 0, openings: N | S },
      ],
      inlet: { col: 0, row: 0, side: W },
      outlet: { col: 1, row: 0, side: S },
    };
    expect(isConnected(layout)).toBe(false);
    layout.pieces[1]!.openings = W | S;
    expect(isConnected(layout)).toBe(true);
  });
});

import { isPerfect, leaks } from '../src/scenes/rescue/model.ts';

describe('leaks', () => {
  it('finds open ends that spill, and passes a perfect run', () => {
    const layout: PipeLayout = {
      cols: 2,
      rows: 1,
      pieces: [
        { id: 'a', col: 0, row: 0, openings: W | E | N },
        { id: 'b', col: 1, row: 0, openings: W | S },
      ],
      inlet: { col: 0, row: 0, side: W },
      outlet: { col: 1, row: 0, side: S },
    };
    expect(isConnected(layout)).toBe(true);
    expect(leaks(layout)).toEqual([{ col: 0, row: 0, side: N }]);
    expect(isPerfect(layout)).toBe(false);
    layout.pieces[0]!.openings = W | E;
    expect(isPerfect(layout)).toBe(true);
  });

  it('the solved game layout spills nowhere', () => {
    const layout = createLayout();
    const want: [string, number][] = [['p03', W | N], ['p02', S | E], ['p12', W | N], ['p11', S | E], ['p21', W | E], ['p31', W | S], ['p32', N | S], ['p33', N | S]];
    for (const [id, o] of want) {
      const p = layout.pieces.find((x) => x.id === id)!;
      for (let i = 0; i < 4 && p.openings !== o; i++) rotatePiece(layout, id);
    }
    expect(isPerfect(layout)).toBe(true);
  });
});

describe('the water', () => {
  it('rises half as fast as it used to: about 25 seconds of air per attempt', () => {
    expect(RISE_PER_S).toBeCloseTo(1 / 30, 6);
    expect(secondsOfAir(0)).toBeGreaterThan(23);
    expect(secondsOfAir(0)).toBeLessThan(26);
    expect(riseRate(MERCY_AFTER - 1)).toBe(RISE_PER_S);
  });

  it('slows down after three drownings, so nobody gets stuck', () => {
    expect(riseRate(MERCY_AFTER)).toBeLessThan(RISE_PER_S);
    expect(riseRate(MERCY_AFTER + 4)).toBe(riseRate(MERCY_AFTER));
    expect(secondsOfAir(MERCY_AFTER)).toBeGreaterThan(secondsOfAir(0) * 1.5);
    expect(secondsOfAir(MERCY_AFTER)).toBeLessThan(60);
  });

  it('climbs steadily from the starting level and never over the brim', () => {
    expect(rise(START_LEVEL, 0, 0)).toBe(START_LEVEL);
    expect(rise(START_LEVEL, 0, 3)).toBeCloseTo(START_LEVEL + 0.1, 6);
    expect(rise(0.99, 0, 5)).toBe(1);
    let level = START_LEVEL;
    for (let i = 0; i < Math.ceil(secondsOfAir(0)); i++) level = rise(level, 0, 1);
    expect(level).toBe(1);
  });
});
