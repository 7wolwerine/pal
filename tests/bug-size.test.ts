import { describe, expect, it } from 'vitest';
import { bugPx } from '../src/ui/beetle.ts';

describe('BUG’s size on screen', () => {
  it('is a whole multiple of half his drawing, never more than a fifth of a picture', () => {
    for (const [w, h] of [[320, 568], [360, 640], [390, 844], [844, 390], [640, 360], [1366, 768], [1920, 1080]] as const) {
      const px = bugPx(w, h);
      expect([64, 80, 96], `${w}x${h}`).toContain(px);
      const scene = Math.min(w - 32, 760, (h - 88) * 1.6);
      expect(px / scene, `${w}x${h}`).toBeLessThanOrEqual(0.23);
    }
  });
});
