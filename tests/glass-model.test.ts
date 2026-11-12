import { describe, expect, it } from 'vitest';
import { FLOOR_Y, GLASS_H, IMPACT_MS, SETTLE_MS, TABLE_SPOT, glassPose } from '../src/scenes/glass/model.ts';

describe('glassPose', () => {
  it('stands on the table before it falls', () => {
    const p = glassPose(0);
    expect(p.y).toBe(TABLE_SPOT[1]);
    expect(p.rot).toBe(0);
  });

  it('never sinks through the floor', () => {
    for (let t = 0; t < SETTLE_MS + 500; t += 7) {
      expect(glassPose(t).y).toBeLessThanOrEqual(FLOOR_Y - GLASS_H + 1e-6);
    }
  });

  it('lands, squashes like rubber, and bounces back up', () => {
    const land = glassPose(IMPACT_MS + 10);
    expect(land.sy).toBeLessThan(1);
    expect(land.sx).toBeGreaterThan(1);
    const up = glassPose(IMPACT_MS + 300);
    expect(up.y).toBeLessThan(FLOOR_Y - GLASS_H - 10);
  });

  it('ends upright and whole on the floor', () => {
    const p = glassPose(SETTLE_MS + 100);
    expect(p).toMatchObject({ y: FLOOR_Y - GLASS_H, rot: 0, sx: 1, sy: 1 });
  });

  it('moves continuously (no teleporting between frames)', () => {
    let prev = glassPose(0);
    for (let t = 5; t < SETTLE_MS + 200; t += 5) {
      const p = glassPose(t);
      expect(Math.abs(p.x - prev.x)).toBeLessThan(4);
      expect(Math.abs(p.y - prev.y)).toBeLessThan(5);
      prev = p;
    }
  });
});
