import { describe, expect, it } from 'vitest';
import { ANSWER_POINTS, ChestModel, GOLD_GOAL, REWARDS, TREASURE } from '../src/scenes/chest-model.ts';

describe('ChestModel', () => {
  it('pays real, growing wins and then a near miss, leaving the goal just out of reach', () => {
    const m = new ChestModel();
    const got = [m.open(), m.open(), m.open()];
    expect(got).toEqual([...REWARDS]);
    expect(m.open()).toBeNull();
    expect(m.points).toBeLessThan(GOLD_GOAL);
    expect(m.missing).toBeGreaterThan(0);
    expect(m.missing).toBeLessThanOrEqual(ANSWER_POINTS);
    expect(m.canOpenGold).toBe(false);
  });

  it('opens the golden chest after an answer, and it really pays', () => {
    const m = new ChestModel();
    while (m.open() !== null) {
      /* open them all */
    }
    m.answer();
    expect(m.unlockedBy).toBe('answer');
    const before = m.points;
    expect(m.openGold()).toBe(true);
    expect(m.points).toBe(before + TREASURE);
    expect(m.openGold()).toBe(false);
  });

  it('opens with the code from the card straight away', () => {
    const m = new ChestModel();
    m.card();
    expect(m.progress).toBe(1);
    expect(m.openGold()).toBe(true);
    expect(m.unlockedBy).toBe('card');
  });

  it('ignores negative answers', () => {
    const m = new ChestModel();
    m.answer(-50);
    expect(m.points).toBe(0);
  });
});
