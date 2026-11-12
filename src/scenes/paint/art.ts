import { px, type Rect } from '../../pixel/stage.ts';
import { palFaceImage, type PalMood } from '../../ui/pal-face.ts';
import { PAINTING_H, PAINTING_W, type Painting } from './model.ts';

type G = CanvasRenderingContext2D;

export const STAGE_W = 160;
export const STAGE_H = 100;

/** Where the painting sits on the stage. */
export const PAINTING_RECT: Rect = { x: 48, y: 12, w: PAINTING_W, h: PAINTING_H };
export const BUCKET_RECT: Rect = { x: 11, y: 63, w: 20, h: 24 };
export const BRUSH_RECT: Rect = { x: 32, y: 64, w: 10, h: 22 };
export const PAL_RECT: Rect = { x: 132, y: 74, w: 20, h: 21 };

/** The painting's colours, one per palette character. */
export const PAINT_COLOURS: Readonly<Record<string, string>> = {
  s: '#7ec8f0',
  S: '#a6dbf5',
  y: '#ffd75e',
  w: '#f3f7fa',
  o: '#ffffff',
  h: '#9fd49a',
  g: '#6cbf5f',
  t: '#8a5a3b',
  T: '#3f9a4f',
  b: '#f2d3a6',
  r: '#d9624f',
  d: '#8a5a3b',
  n: '#7ec8f0',
  x: '#ff2bd6',
};

export interface PaintState {
  readonly painting: Painting;
  readonly held: 'bucket' | 'brush' | null;
  readonly bucketEmpty: boolean;
  /** Stage time the glitch started, if it has. */
  readonly glitchAt: number | undefined;
  readonly palMood: PalMood;
  readonly motion: boolean;
}

const GLITCH_MS = 700;

/** Cheap repeatable noise in 0..1. */
function noise(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function isGlitching(t: number, glitchAt: number | undefined): boolean {
  return glitchAt !== undefined && t >= glitchAt && t < glitchAt + GLITCH_MS;
}

export function paintScene(g: G, t: number, s: PaintState): void {
  paintRoom(g);
  paintEasel(g);
  paintPainting(g, t, s);
  paintBucket(g, t, s);
  paintBrushes(g, s.held === 'brush');
  paintTent(g);
  const face = isGlitching(t, s.glitchAt) ? 'dark' : s.palMood;
  const bob = s.motion ? Math.round(Math.sin(t / 600)) : 0;
  g.drawImage(palFaceImage(face), PAL_RECT.x + 2, PAL_RECT.y + 4 + bob);
  if (isGlitching(t, s.glitchAt)) paintStatic(g, t);
}

function paintRoom(g: G): void {
  px(g, '#f6e7d8', 0, 0, STAGE_W, 80);
  for (let x = 4; x < STAGE_W; x += 10) px(g, '#f1dfcd', x, 0, 3, 80);
  px(g, '#d8b48c', 0, 78, STAGE_W, 3);
  px(g, '#c89a6a', 0, 81, STAGE_W, 19);
  for (let y = 84; y < STAGE_H; y += 5) px(g, '#b5875a', 0, y, STAGE_W, 1);
  for (let y = 81, i = 0; y < STAGE_H; y += 5, i++) {
    for (let x = (i % 2) * 13; x < STAGE_W; x += 26) px(g, '#b5875a', x, y, 1, 5);
  }
}

/** A line of whole pixels from (x0, y0) to (x1, y1). */
function line(g: G, colour: string, x0: number, y0: number, x1: number, y1: number, width = 2): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const u = steps === 0 ? 0 : i / steps;
    px(g, colour, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, width, 1);
  }
}

function paintEasel(g: G): void {
  line(g, '#6e4529', 79, 8, 79, 88, 3);
  line(g, '#8a5a3b', 62, 50, 52, 93, 3);
  line(g, '#8a5a3b', 97, 50, 107, 93, 3);
  px(g, '#8a5a3b', 44, 53, 72, 3);
  px(g, '#6e4529', 44, 56, 72, 1);
  // The frame around the canvas.
  px(g, '#8a5a3b', 46, 10, 68, 44);
  px(g, '#a8744d', 47, 11, 66, 42);
}

function paintPainting(g: G, t: number, s: PaintState): void {
  const glitch = isGlitching(t, s.glitchAt);
  const slot = Math.floor(t / 60);
  const { x: ox, y: oy } = PAINTING_RECT;
  for (let y = 0; y < s.painting.height; y++) {
    const shift = glitch && noise(y * 3.1 + slot) < 0.3 ? Math.round(noise(y + slot * 7) * 6) - 3 : 0;
    for (let x = 0; x < s.painting.width; x++) {
      const sx = (x - shift + s.painting.width) % s.painting.width;
      const cell = s.painting.at(sx, y) ?? 's';
      let c = PAINT_COLOURS[cell] ?? '#000';
      // Bare canvas shows its weave; clouds have a soft shaded underside.
      if (cell === 'o') c = (sx + y) % 2 ? '#fffdf8' : '#e9e2d4';
      else if (cell === 'w' && s.painting.at(sx, y + 1) !== 'w') c = '#d3e4ef';
      if (glitch && noise(x * 13.7 + y * 7.3 + slot) < 0.02) c = noise(x + slot) < 0.5 ? '#ff2bd6' : '#2bfff0';
      px(g, c, ox + x, oy + y, 1, 1);
    }
  }
}

function paintBucket(g: G, t: number, s: PaintState): void {
  const lift = s.held === 'bucket' ? 3 : 0;
  const x = 14;
  const y = 72 - lift;
  // Handle.
  line(g, '#5d646b', x, y, x + 6, y - 6, 1);
  line(g, '#5d646b', x + 7, y - 6, x + 13, y, 1);
  // Body, narrowing towards the floor.
  for (let row = 0; row < 13; row++) {
    const inset = Math.floor(row / 6);
    px(g, '#9aa3ad', x + inset, y + 1 + row, 14 - inset * 2, 1);
    px(g, '#7b838c', x + 14 - inset - 3, y + 1 + row, 3, 1);
  }
  px(g, '#c3cad1', x - 1, y, 16, 2);
  px(g, s.bucketEmpty ? '#4b5259' : PAINT_COLOURS.s ?? '#7ec8f0', x, y, 14, 1);
  if (!s.bucketEmpty) px(g, PAINT_COLOURS.s ?? '#7ec8f0', x + 3, y + 2, 1, 4);
  // A blinking dotted outline while the bucket is in hand.
  if (s.held === 'bucket' && Math.floor(t / 300) % 2 === 0) {
    for (let i = 0; i < 18; i += 2) {
      px(g, '#3a3a46', x - 2 + i, y - 8, 1, 1);
      px(g, '#3a3a46', x - 2 + i, y + 15, 1, 1);
    }
  }
}

function paintBrushes(g: G, held: boolean): void {
  const x = 34;
  const y = 76;
  // Handles sticking out of the jar; the one in hand is lifted.
  line(g, '#d9a066', x + 1, y - 9 - (held ? 4 : 0), x + 1, y, 1);
  px(g, PAINT_COLOURS.s ?? '#7ec8f0', x + 1, y - 11 - (held ? 4 : 0), 1, 2);
  line(g, '#c98b4f', x + 4, y - 7, x + 4, y, 1);
  px(g, '#d9624f', x + 4, y - 9, 1, 2);
  px(g, '#cfe7f0', x - 1, y, 7, 9);
  px(g, '#a9cfdc', x + 4, y, 2, 9);
  px(g, '#eef8fb', x - 1, y, 7, 1);
}

function paintTent(g: G): void {
  const apex = 143;
  for (let y = 66; y <= 94; y++) {
    const half = Math.round(((y - 66) / 28) * 16);
    px(g, '#f2a65a', apex - half, y, half, 1);
    px(g, '#d98b40', apex, y, half, 1);
  }
  for (let y = 76; y <= 94; y++) {
    const half = Math.round(((y - 76) / 18) * 9);
    px(g, '#5a3a2a', apex - half, y, half * 2, 1);
  }
  line(g, '#8a5a3b', apex, 63, apex, 66, 1);
}

/** Interference over the whole stage while the picture glitches. */
function paintStatic(g: G, t: number): void {
  const slot = Math.floor(t / 50);
  for (let i = 0; i < 6; i++) {
    const y = Math.floor(noise(slot * 5 + i) * STAGE_H);
    g.globalAlpha = 0.35;
    px(g, i % 2 ? '#2bfff0' : '#ff2bd6', 0, y, STAGE_W, 1);
    g.globalAlpha = 1;
  }
}
