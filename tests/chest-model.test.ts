import { describe, expect, it } from 'vitest';
import { ChestModel, GOLD_GOAL, GOLD_PRIZE, REWARDS, XP_PER_LEVEL, XP_PRIZE } from '../src/scenes/chest-model.ts';

function openAll(m: ChestModel): void {
  while (m.open() !== null) {
    /* open them all */
  }
}

describe('ChestModel', () => {
  it('pays real, growing wins and then a near miss, leaving the goal just out of reach', () => {
    const m = new ChestModel();
    const got = [m.open(), m.open(), m.open()];
    expect(got).toEqual([...REWARDS]);
    expect(m.open()).toBeNull();
    expect(m.points).toBeLessThan(GOLD_GOAL);
    expect(m.missing).toBeGreaterThan(0);
    expect(m.canOpenGold).toBe(false);
    expect(m.unlockedBy).toBeNull();
  });

  it('opens the golden chest with the card after the free ones, and nothing is paid before the choice', () => {
    const m = new ChestModel();
    openAll(m);
    m.card();
    expect(m.unlockedBy).toBe('card');
    const before = m.points;
    expect(m.openGold()).toBe(true);
    expect(m.points).toBe(before);
    expect(m.openGold()).toBe(false);
    expect(m.pay()).toBe(0);
  });

  it('pays the gold once it is picked', () => {
    const m = new ChestModel();
    openAll(m);
    m.card();
    m.openGold();
    const before = m.points;
    expect(m.choose('gold')).toBe(true);
    expect(m.choose('xp')).toBe(false);
    expect(m.picked).toBe('gold');
    expect(m.pay()).toBe(GOLD_PRIZE);
    expect(m.points).toBe(before + GOLD_PRIZE);
    expect(m.level).toBe(1);
    expect(m.pay()).toBe(0);
    expect(m.paid).toBe(true);
  });

  it('pays the experience as levels, and it counts towards the score too', () => {
    const m = new ChestModel();
    m.card();
    m.openGold();
    expect(m.choose('xp')).toBe(true);
    expect(m.pay()).toBe(XP_PRIZE);
    expect(m.xp).toBe(XP_PRIZE);
    expect(m.level).toBe(1 + Math.floor(XP_PRIZE / XP_PER_LEVEL));
    expect(m.points).toBe(XP_PRIZE);
  });

  it('cannot pick before the golden chest is open', () => {
    const m = new ChestModel();
    expect(m.choose('gold')).toBe(false);
    m.card();
    expect(m.choose('gold')).toBe(false);
  });

  it('opens with the code from the card straight away', () => {
    const m = new ChestModel();
    m.card();
    expect(m.progress).toBe(1);
    expect(m.openGold()).toBe(true);
    expect(m.unlockedBy).toBe('card');
  });
});
