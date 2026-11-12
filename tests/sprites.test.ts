import { describe, expect, it } from 'vitest';
import { SPRITE_IDS, SPRITE_SIZE, drawSprite, type Frame, type SpriteMood } from '../src/ui/sprites.ts';

/** A stand-in canvas that records what gets painted where. */
function fakeCanvas(): { canvas: HTMLCanvasElement; pixels: () => string } {
  const cells = new Map<string, string>();
  let fill = '';
  const g = {
    set fillStyle(c: string) {
      fill = c;
    },
    get fillStyle() {
      return fill;
    },
    clearRect: () => cells.clear(),
    fillRect: (x: number, y: number, w: number, h: number) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells.set(`${xx},${yy}`, fill);
    },
  };
  const canvas = { getContext: () => g } as unknown as HTMLCanvasElement;
  const pixels = (): string =>
    [...cells.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(';');
  return { canvas, pixels };
}

function render(id: (typeof SPRITE_IDS)[number], frame: Frame, mood: SpriteMood): string {
  const { canvas, pixels } = fakeCanvas();
  drawSprite(canvas, id, frame, mood);
  return pixels();
}

describe('sprites', () => {
  it.each(SPRITE_IDS)('%s paints a good part of its 24x24 square', (id) => {
    const { canvas, pixels } = fakeCanvas();
    drawSprite(canvas, id);
    const cells = pixels().split(';').filter(Boolean);
    expect(cells.length).toBeGreaterThan(SPRITE_SIZE * SPRITE_SIZE * 0.3);
  });

  it.each(SPRITE_IDS.filter((id) => id !== 'palDark'))('%s really changes when it blinks, and when it is sad', (id) => {
    const base = render(id, 'base', 'happy');
    expect(render(id, 'blink', 'happy')).not.toBe(base);
    expect(render(id, 'base', 'sad')).not.toBe(base);
  });
});
