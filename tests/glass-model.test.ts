import { describe, expect, it } from 'vitest';
import { HERO_TABLE_X, handDrop } from '../src/scenes/glass/art.ts';
import { GLASS_H, dropTimes, glassPose } from '../src/scenes/glass/model.ts';

// The fall the player sees: the glass slips out of the raised hand at the table.
const from = handDrop(HERO_TABLE_X);
const { impact, settle } = dropTimes(from);
const rest = from.floor - GLASS_H;

describe('glassPose', () => {
  it('starts in the hand, upright', () => {
    const p = glassPose(0, from);
    expect(p).toMatchObject({ x: from.x, y: from.y, rot: 0 });
  });

  it('never sinks through the floor', () => {
    for (let t = 0; t < settle + 500; t += 7) {
      expect(glassPose(t, from).y).toBeLessThanOrEqual(rest + 1e-6);
    }
  });

  it('lands, squashes like rubber, and bounces back up', () => {
    const land = glassPose(impact + 10, from);
    expect(land.sy).toBeLessThan(1);
    expect(land.sx).toBeGreaterThan(1);
    const up = glassPose(impact + 300, from);
    expect(up.y).toBeLessThan(rest - 10);
  });

  it('ends upright and whole on the floor', () => {
    const p = glassPose(settle + 100, from);
    expect(p).toMatchObject({ y: rest, rot: 0, sx: 1, sy: 1 });
  });

  it('moves continuously (no teleporting between frames)', () => {
    let prev = glassPose(0, from);
    for (let t = 5; t < settle + 200; t += 5) {
      const p = glassPose(t, from);
      expect(Math.abs(p.x - prev.x)).toBeLessThan(4);
      expect(Math.abs(p.y - prev.y)).toBeLessThan(5);
      prev = p;
    }
  });
});
