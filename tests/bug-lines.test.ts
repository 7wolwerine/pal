import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickLine } from '../src/content/bug.ts';

/** A small seeded random source (mulberry32), so every run shuffles the same way. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BUG picks his lines', () => {
  it('has nothing to say from an empty pool', () => {
    expect(pickLine([])).toBe('');
  });

  for (const size of [2, 3, 4, 6]) {
    it(`says every line of a ${size}-line pool once a round, never the same one twice in a row`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
        // A fresh pool each time: pickLine remembers its rounds per pool.
        const pool = Array.from({ length: size }, (_, i) => `line ${i}`);
        const picks = Array.from({ length: 3 * size }, () => pickLine(pool));
        for (let round = 0; round < 3; round++) {
          expect([...picks.slice(round * size, (round + 1) * size)].sort(), `seed ${seed}`).toEqual([...pool].sort());
        }
        for (let i = 1; i < picks.length; i++) expect(picks[i], `seed ${seed}, pick ${i}`).not.toBe(picks[i - 1]);
        vi.restoreAllMocks();
      }
    });
  }

  it('a one-line pool just says its line', () => {
    const pool = ['jen tohle'];
    expect([pickLine(pool), pickLine(pool)]).toEqual(['jen tohle', 'jen tohle']);
  });
});
