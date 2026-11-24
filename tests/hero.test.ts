import { describe, expect, it } from 'vitest';
import { HERO_HEIGHT, paintHero, type HeroPose } from '../src/pixel/hero.ts';

/** A stand-in for a canvas that remembers how many pixels of each picture row got paint. */
function rowsPainted(pose: HeroPose, t: number, worn = false): Map<number, Set<number>> {
  const painted = new Map<number, Set<number>>();
  const g = {
    fillStyle: '',
    globalAlpha: 1,
    fillRect(x: number, y: number, w: number, h: number) {
      for (let r = Math.round(y); r < Math.round(y + h); r++) {
        const row = painted.get(r) ?? new Set<number>();
        for (let c = Math.round(x); c < Math.round(x + w); c++) row.add(c);
        painted.set(r, row);
      }
    },
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
  } as unknown as CanvasRenderingContext2D;
  paintHero(g, 0, 100, { pose, facing: 1, t, motion: true, worn });
  return painted;
}

describe('the character seen from the side', () => {
  for (const worn of [false, true]) {
    it(`has no see-through row between head and feet, standing or at any step of a walk${worn ? ' (worn out)' : ''}`, () => {
      const cases: [HeroPose, number][] = [['side', 0], ['walk', 0], ['walk', 130], ['walk', 260], ['walk', 390], ['walk', 520]];
      for (const [pose, t] of cases) {
        const painted = rowsPainted(pose, t, worn);
        // From the shoulders (row 14) down, every row is at least as wide as the hips.
        for (let r = 100 - HERO_HEIGHT + 15; r < 100; r++) expect(painted.get(r)?.size ?? 0, `${pose} at ${t} ms, row ${r - (100 - HERO_HEIGHT)}`).toBeGreaterThanOrEqual(4);
      }
    });
  }

  it('stands still in profile without bobbing', () => {
    expect(Math.min(...rowsPainted('side', 0).keys())).toBe(Math.min(...rowsPainted('side', 5000).keys()));
  });
});
