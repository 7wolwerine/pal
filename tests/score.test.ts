import { describe, expect, it } from 'vitest';
import { POINTS_PER_TRICK, RANK_CEILING, RANK_FLOOR, rankOf, scoreOf } from '../src/core/score.ts';

describe('score', () => {
  it('adds the collected points and a bonus per trick', () => {
    expect(scoreOf(1242, 0)).toBe(1242);
    expect(scoreOf(1242, 4)).toBe(1242 + 4 * POINTS_PER_TRICK);
    expect(POINTS_PER_TRICK).toBeGreaterThan(0);
  });

  it('never goes below zero and shows whole points', () => {
    expect(scoreOf(-5, -1)).toBe(0);
    expect(scoreOf(10.6, 0)).toBe(11);
    expect(scoreOf(10.4, 1)).toBe(10 + POINTS_PER_TRICK);
  });

  it('ranks from the floor up to 97 % at most', () => {
    expect(rankOf(0, 20)).toBe(RANK_FLOOR);
    expect(rankOf(20, 20)).toBe(RANK_CEILING);
    expect(rankOf(40, 20)).toBe(RANK_CEILING);
    expect(rankOf(10, 20)).toBeGreaterThan(RANK_FLOOR);
    expect(rankOf(10, 20)).toBeLessThan(RANK_CEILING);
    expect(rankOf(-3, 20)).toBe(RANK_FLOOR);
  });

  it('stays on the floor when there were no tricks to count', () => {
    expect(rankOf(3, 0)).toBe(RANK_FLOOR);
    expect(rankOf(0, -1)).toBe(RANK_FLOOR);
  });
});
