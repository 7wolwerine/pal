import { describe, expect, it } from 'vitest';
import { RANK_CEILING, RANK_FLOOR, rankOf, scoreOf } from '../src/core/score.ts';

describe('score', () => {
  it('adds the collected points and a bonus per trick', () => {
    expect(scoreOf(1242, 0)).toBe(1242);
    expect(scoreOf(1242, 4)).toBeGreaterThan(1242);
  });

  it('ranks from the floor up to 97 % at most', () => {
    expect(rankOf(0, 20)).toBe(RANK_FLOOR);
    expect(rankOf(20, 20)).toBe(RANK_CEILING);
    expect(rankOf(40, 20)).toBe(RANK_CEILING);
    expect(rankOf(10, 20)).toBeGreaterThan(RANK_FLOOR);
    expect(rankOf(10, 20)).toBeLessThan(RANK_CEILING);
  });
});
