import { describe, expect, it } from 'vitest';
import { hiddenPayload } from '../src/content/prize.ts';
import { capacity, hide, reveal, type Pixels } from '../src/core/stego.ts';

function image(width: number, height: number, fill = 200): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill;
    data[i + 1] = (fill + 17) % 256;
    data[i + 2] = (fill + 101) % 256;
    data[i + 3] = 255;
  }
  return { data, width, height };
}

describe('steganography', () => {
  it('round-trips text, including Czech and emoji', () => {
    const img = image(40, 40);
    const text = 'Tenhle obrázek nebyl jen obrázek. Příliš žluťoučký kůň <3 ✉';
    hide(img, text);
    expect(reveal(img)).toBe(text);
  });

  it('changes each colour value by at most one and never touches alpha', () => {
    const before = image(30, 30);
    const after = image(30, 30);
    hide(after, 'hello there');
    for (let i = 0; i < before.data.length; i++) {
      const diff = Math.abs((after.data[i] ?? 0) - (before.data[i] ?? 0));
      expect(diff).toBeLessThanOrEqual(1);
      if (i % 4 === 3) expect(after.data[i]).toBe(255);
    }
  });

  it('finds nothing in an ordinary image', () => {
    expect(reveal(image(20, 20))).toBeNull();
    expect(reveal(image(20, 20, 0))).toBeNull();
  });

  it('refuses text that does not fit', () => {
    const img = image(4, 4);
    expect(capacity(img)).toBeLessThan(20);
    expect(() => hide(img, 'x'.repeat(100))).toThrow();
  });

  it('accepts exactly capacity bytes and refuses one more', () => {
    const n = capacity(image(20, 20));
    expect(n).toBeGreaterThan(10);
    const a = image(20, 20);
    hide(a, 'a'.repeat(n));
    expect(reveal(a)).toBe('a'.repeat(n));
    expect(() => hide(image(20, 20), 'a'.repeat(n + 1))).toThrow();
  });

  it('counts the capacity in bytes, not letters', () => {
    // 'ž' takes two bytes in UTF-8: half the capacity in letters fits, one more does not.
    const k = Math.floor(capacity(image(20, 20)) / 2);
    const b = image(20, 20);
    hide(b, 'ž'.repeat(k));
    expect(reveal(b)).toBe('ž'.repeat(k));
    expect(() => hide(image(20, 20), 'ž'.repeat(k + 1))).toThrow();
  });

  it('carries the real certificate payload there and back', () => {
    const payload = hiddenPayload({
      name: 'Tester Testovič',
      assistant: 'Pal',
      email: 'tester@example.test',
      memory: 'Příliš žluťoučký kůň úpěl ďábelské ódy. '.repeat(8),
    });
    const img = image(120, 120);
    expect(capacity(img)).toBeGreaterThan(new TextEncoder().encode(payload).length);
    hide(img, payload);
    expect(reveal(img)).toBe(payload);
  });
});
