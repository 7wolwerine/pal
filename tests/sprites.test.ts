import { describe, expect, it } from 'vitest';
import { FRAMES, SPRITES, SPRITE_SIZE, frameRows, type SpriteId } from '../src/ui/sprites.ts';

const ids = Object.keys(SPRITES) as SpriteId[];

describe('sprites', () => {
  it.each(ids)('%s is a full 12x12 grid in every frame', (id) => {
    for (const frame of ['base', 'blink', 'quirk'] as const) {
      const rows = frameRows(id, frame);
      expect(rows).toHaveLength(SPRITE_SIZE);
      for (const row of rows) expect(row).toHaveLength(SPRITE_SIZE);
    }
  });

  it.each(ids)('%s really changes when it blinks and when it does its gesture', (id) => {
    const base = frameRows(id, 'base').join('\n');
    expect(frameRows(id, 'blink').join('\n')).not.toBe(base);
    expect(frameRows(id, 'quirk').join('\n')).not.toBe(base);
  });

  it.each(ids)('%s only patches rows that exist and only uses characters of the base palette', (id) => {
    const known = new Set(Object.values(SPRITES).join(''));
    for (const patch of Object.values(FRAMES[id])) {
      for (const [index, row] of Object.entries(patch)) {
        expect(Number(index)).toBeGreaterThanOrEqual(0);
        expect(Number(index)).toBeLessThan(SPRITE_SIZE);
        for (const char of row) expect(known.has(char)).toBe(true);
      }
    }
  });

  it('leaves the base grid untouched when building a frame', () => {
    const before = SPRITES.cat.join('\n');
    frameRows('cat', 'quirk');
    expect(SPRITES.cat.join('\n')).toBe(before);
  });
});
