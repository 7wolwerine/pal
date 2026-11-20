import { describe, expect, it } from 'vitest';
import { CHEW_MAX, EATEN_MS, EAT_FROM, FlowerModel, KNOCKS_TO_BREAK, PESTS_MS, PEST_COUNT, PEST_PATH, chewAt, eatenAt, pestArrives, pestPose } from '../src/scenes/flower/model.ts';
import { BLOOM_SIZE, DRIED_ROWS, FLOWER_PALETTE, bloomRows, chewedRows } from '../src/scenes/flower/sprites.ts';

describe('FlowerModel', () => {
  it('cracks the glass a little with each knock, then shatters it', () => {
    const m = new FlowerModel();
    for (let i = 1; i < KNOCKS_TO_BREAK; i++) {
      expect(m.knock()).toBe('crack');
      expect(m.cracks).toBe(i);
    }
    expect(m.knock()).toBe('shatter');
    expect(m.state).toBe('broken');
    expect(m.knock()).toBe('none');
  });

  it('cannot be watered through the glass', () => {
    const m = new FlowerModel();
    expect(m.water()).toBe(false);
    expect(m.state).toBe('domed');
  });

  it('blooms once watered, and only once', () => {
    const m = new FlowerModel();
    for (let i = 0; i < KNOCKS_TO_BREAK; i++) m.knock();
    expect(m.water()).toBe(true);
    expect(m.state).toBe('blooming');
    expect(m.water()).toBe(false);
  });
});

describe('flower sprites', () => {
  it('use only colours from the palette', () => {
    for (const row of [...DRIED_ROWS, ...bloomRows(), ...chewedRows(0.5), ...chewedRows(1)]) {
      for (const ch of row) if (ch !== '.') expect(FLOWER_PALETTE[ch]).toBeDefined();
    }
  });

  it('have even rows', () => {
    const bloom = bloomRows();
    for (const row of bloom) expect(row).toHaveLength(BLOOM_SIZE);
    const w = DRIED_ROWS[0]?.length ?? 0;
    for (const row of DRIED_ROWS) expect(row).toHaveLength(w);
  });

  it('give the bloom a stem that reaches the face', () => {
    const bloom = bloomRows();
    const c = (BLOOM_SIZE - 1) / 2;
    let y = bloom.length - 1;
    while (bloom[y]?.[c] === 'g') y--;
    expect(['f', 'F', 'm']).toContain(bloom[y]?.[c]);
  });
});

describe('once the glass is gone', () => {
  it('lets the crawlers in one after another, along the sill', () => {
    const start = PEST_PATH[0] ?? [0, 0];
    expect(pestPose(0, 0)).toMatchObject({ x: start[0], y: start[1], visible: true, settled: false });
    expect(pestPose(1, 0).visible).toBe(false);
    for (let i = 1; i < PEST_COUNT; i++) expect(pestArrives(i)).toBeGreaterThan(pestArrives(i - 1));
    expect(PESTS_MS).toBe(pestArrives(PEST_COUNT - 1));
  });

  it('walks them without jumps and settles every one of them on the bloom', () => {
    for (let i = 0; i < PEST_COUNT; i++) {
      let prev = pestPose(i, 0);
      for (let t = 10; t <= PESTS_MS + 200; t += 10) {
        const p = pestPose(i, t);
        if (prev.visible && p.visible) expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(1.5);
        prev = p;
      }
      expect(prev.settled).toBe(true);
      expect(prev.y).toBeLessThan(55);
    }
  });

  it('nibbles the bloom only a little, and only ever more', () => {
    expect(chewAt(0)).toBe(0);
    let prev = 0;
    for (let t = 0; t < PESTS_MS + 8000; t += 100) {
      const chew = chewAt(t);
      expect(chew).toBeGreaterThanOrEqual(prev);
      expect(chew).toBeLessThanOrEqual(CHEW_MAX);
      prev = chew;
    }
    expect(prev).toBe(CHEW_MAX);
  });

  it('then the flower eats the crawlers, one after another, until none is left', () => {
    expect(EAT_FROM).toBeGreaterThan(PESTS_MS);
    for (let i = 0; i < PEST_COUNT; i++) {
      expect(pestPose(i, eatenAt(i) - 1).visible).toBe(true);
      expect(pestPose(i, eatenAt(i)).visible).toBe(false);
    }
    for (let i = 0; i < PEST_COUNT; i++) expect(pestPose(i, EATEN_MS).visible).toBe(false);
  });

  it('leaves a bitten flower that is still a flower, with a frown', () => {
    const whole = bloomRows().join('');
    const eaten = chewedRows(1).join('');
    const petals = (s: string): number => [...s].filter((ch) => 'pPq'.includes(ch)).length;
    expect(petals(eaten)).toBeLessThan(petals(whole));
    expect(petals(eaten)).toBeGreaterThan(petals(whole) * 0.4);
    expect(chewedRows(1)).toHaveLength(bloomRows().length);
    expect(chewedRows(0)).toEqual(bloomRows());
  });
});
