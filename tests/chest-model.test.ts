import { describe, expect, it } from 'vitest';
import { ANSWER_POINTS, CHEST_COST, ChestModel, GOLD_COST, REWARDS, START_POINTS } from '../src/scenes/chest-model.ts';

describe('ChestModel', () => {
  it('affords exactly the small chests, and they give almost nothing, then a key', () => {
    const m = new ChestModel();
    expect(m.points).toBe(START_POINTS);
    const got = [m.open(), m.open(), m.open()];
    expect(got).toEqual([...REWARDS]);
    expect(m.hasKey).toBe(true);
    expect(m.points).toBe(START_POINTS - REWARDS.length * CHEST_COST + 1);
    expect(m.open()).toBeNull();
  });

  it('leaves the gold chest out of reach until the player pays with an answer', () => {
    const m = new ChestModel();
    while (m.open()) {
      /* open them all */
    }
    expect(m.canOpenGold).toBe(false);
    expect(m.openGold()).toBe(false);
    m.earn(ANSWER_POINTS);
    expect(m.canOpenGold).toBe(true);
    expect(m.openGold()).toBe(true);
    expect(m.goldOpened).toBe(true);
    expect(m.points).toBe(1 + ANSWER_POINTS - GOLD_COST);
    expect(m.openGold()).toBe(false);
  });

  it('needs the key for the gold chest', () => {
    const m = new ChestModel();
    m.earn(1000);
    expect(m.canOpenGold).toBe(false);
  });

  it('ignores negative earnings', () => {
    const m = new ChestModel();
    m.earn(-50);
    expect(m.points).toBe(START_POINTS);
  });
});
