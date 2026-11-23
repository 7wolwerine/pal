import { describe, expect, it } from 'vitest';
import { GUTTER, WIN_W, layoutPc } from '../src/ui/pc-layout.ts';

const SIZES: readonly [number, number][] = [
  [1920, 1080],
  [1280, 800],
  [1000, 700],
  [768, 1024],
  [390, 760],
  [360, 640],
];

describe('layoutPc', () => {
  it('never makes the computer wider than the page', () => {
    for (const [w, h] of SIZES) {
      const L = layoutPc(w, h);
      expect(L.w * L.s + 6, `${w}x${h}`).toBeLessThanOrEqual(w - GUTTER * 2 + 0.01);
    }
  });

  it('keeps the whole desk on a laptop and only the monitor on a phone', () => {
    expect(layoutPc(1280, 800).mode).toBe('full');
    expect(layoutPc(1000, 700).mode).toBe('full');
    expect(layoutPc(390, 760).mode).toBe('compact');
    expect(layoutPc(390, 760).tower).toBeUndefined();
    expect(layoutPc(1280, 800).tower).toBeDefined();
  });

  it('gives the window a glass of its own size, with room for it', () => {
    for (const [w, h] of SIZES) {
      const L = layoutPc(w, h);
      const glassW = L.glass.w * L.s;
      // The window fits between its left offset and the right edge of the glass.
      expect(L.win.left + Math.min(WIN_W, glassW - 16) + 8, `${w}x${h}`).toBeLessThanOrEqual(glassW + 0.5);
      // One fixed height, which may stand over the taskbar but stays on the glass.
      expect(L.win.height, `${w}x${h}`).toBeGreaterThan(200);
      expect(L.win.top + L.win.height + L.win.bottom, `${w}x${h}`).toBeLessThanOrEqual(L.glass.h * L.s + 0.5);
      // The glass lies inside the bezel, the bezel inside the picture.
      expect(L.glass.x).toBeGreaterThan(L.bezel.x);
      expect(L.glass.x + L.glass.w).toBeLessThan(L.bezel.x + L.bezel.w);
      expect(L.deskTop).toBeLessThan(L.h);
    }
  });

  it('keeps the desktop icons clear of the window on a roomy screen', () => {
    const L = layoutPc(1280, 800);
    expect(L.win.left).toBeGreaterThanOrEqual(23 * L.u * L.s - 1);
  });

  it('gives a low page (a phone on its side) only the glass, with most of the height for the window', () => {
    for (const [w, h] of [[844, 390], [740, 360], [1024, 500]] as const) {
      const L = layoutPc(w, h);
      expect(L.mode, `${w}x${h}`).toBe('short');
      expect(L.tower).toBeUndefined();
      expect(L.keyboard).toBeUndefined();
      // The whole picture fits the page's height under the path of hearts.
      expect(L.h * L.s + 6, `${w}x${h}`).toBeLessThanOrEqual(h - 56 + 0.01);
      expect(L.w * L.s + 6, `${w}x${h}`).toBeLessThanOrEqual(w - GUTTER * 2 + 0.01);
      // The window gets nearly all of it: far more than the 131 px a desk round it would leave.
      expect(L.win.height, `${w}x${h}`).toBeGreaterThan(h * 0.65);
      expect(L.win.top + L.win.height + L.win.bottom).toBeLessThanOrEqual(L.glass.h * L.s + 0.5);
    }
    // A phone held upright is not a low page.
    expect(layoutPc(390, 844).mode).toBe('compact');
    expect(layoutPc(1366, 768).mode).toBe('full');
  });

  it('does not depend on anything but the size of the page', () => {
    expect(layoutPc(1280, 800)).toEqual(layoutPc(1280, 800));
  });
});
