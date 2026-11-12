import { describe, expect, it } from 'vitest';
import { FlowerModel, KNOCKS_TO_BREAK } from '../src/scenes/flower/model.ts';
import { BLOOM_SIZE, DRIED_ROWS, FLOWER_PALETTE, bloomRows } from '../src/scenes/flower/sprites.ts';

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
    for (const row of [...DRIED_ROWS, ...bloomRows()]) {
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
