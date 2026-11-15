import { describe, expect, it } from 'vitest';
import { PIECES, WELL_H, WELL_W, blocksAt } from '../src/ui/blocks.ts';
import { splitTitle } from '../src/ui/certificate.ts';

describe('download blocks', () => {
  it('are pieces of four that fill the well exactly once', () => {
    const seen = new Set<string>();
    for (const p of PIECES) {
      expect(p.cells).toHaveLength(4);
      for (const [c, r] of p.cells) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(WELL_W);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(WELL_H);
        const key = `${c},${r}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(WELL_W * WELL_H);
  });

  it('each piece lands on the floor or on pieces already placed', () => {
    const filled = new Set<string>();
    for (const p of PIECES) {
      const own = new Set(p.cells.map(([c, r]) => `${c},${r}`));
      const supported = p.cells.some(([c, r]) => r === WELL_H - 1 || (filled.has(`${c},${r + 1}`) && !own.has(`${c},${r + 1}`)));
      expect(supported).toBe(true);
      for (const k of own) filled.add(k);
    }
  });

  it('is empty at 0 %, full and still at 100 %', () => {
    expect(blocksAt(0)).toEqual([]);
    const full = blocksAt(1);
    expect(full).toHaveLength(PIECES.length);
    expect(full.every((p) => p.lift === 0)).toBe(true);
  });

  it('drops the next piece from above while it is coming', () => {
    const mid = blocksAt(0.25);
    expect(mid.at(-1)?.lift).toBeGreaterThan(0);
  });
});

describe('certificate title', () => {
  it('splits a long title near its middle', () => {
    expect(splitTitle('Nejvěrnější přítel umělé inteligence')).toEqual(['Nejvěrnější přítel', 'umělé inteligence']);
    expect(splitTitle('Profík')).toEqual(['Profík', '']);
  });
});
