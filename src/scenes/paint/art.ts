import { px, type Rect } from '../../pixel/stage.ts';
import { HOLE, PAINTING_H, PAINTING_W, type Painting } from './model.ts';

type G = CanvasRenderingContext2D;

export const STAGE_W = 160;
export const STAGE_H = 100;
/** The painting is shown close up, every painted pixel two pixels wide. */
export const ZOOM = 2;

/** Where the painting sits on the stage. */
export const PAINTING_RECT: Rect = { x: 6, y: 4, w: PAINTING_W * ZOOM, h: PAINTING_H * ZOOM };
export const BUCKET_RECT: Rect = { x: 138, y: 62, w: 22, h: 34 };
export const PENCIL_RECT: Rect = { x: 18, y: 84, w: 24, h: 8 };
/** The loose right side of the frame. */
export const LOOSE_RECT: Rect = { x: 128, y: 0, w: 14, h: 92 };

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
  x: '#79c2ea',
};

export type Held = 'brush' | 'pencil' | null;

export interface PaintLook {
  readonly painting: Painting;
  readonly held: Held;
  /** 0 = no frame yet, 1 = frame on. */
  readonly framed: number;
  /** How loose the right side still is: 0 = fixed, 1 = hanging. */
  readonly loose: number;
  /** Stage time the loose side was last knocked, for a little bounce. */
  readonly knockedAt?: number;
  /** Stage time of the subtle glitch, if it has happened. */
  readonly glitchAt?: number;
  /** Where to twinkle a hint, if anywhere. */
  readonly hint?: { x: number; y: number };
  readonly motion: boolean;
}

export function paintScene(g: G, t: number, s: PaintLook): void {
  paintWall(g);
  paintEasel(g);
  paintPainting(g, t, s);
  if (s.framed > 0) paintFrame(g, t, s);
  if (s.held !== 'pencil') paintPencil(g);
  paintBucket(g, s.held === 'brush');
  if (s.hint && s.motion) twinkle(g, s.hint.x, s.hint.y, t);
}

function paintWall(g: G): void {
  px(g, '#f6e7d8', 0, 0, STAGE_W, STAGE_H);
  for (let x = 2; x < STAGE_W; x += 10) px(g, '#f1dfcd', x, 0, 3, STAGE_H);
  // a patch of sunlight from a window off to the side
  px(g, '#fbf1e6', 140, 0, 20, 40);
  px(g, '#d8b48c', 0, 94, STAGE_W, 6);
}

function paintEasel(g: G): void {
  const wood = '#a8743f';
  const dark = '#7a5230';
  // legs behind the painting
  for (let i = 0; i < 12; i++) {
    px(g, dark, 22 - i, 84 + i, 3, 1);
    px(g, dark, 118 + i, 84 + i, 3, 1);
  }
  px(g, dark, 69, 0, 4, 4);
  // the ledge the painting rests on
  px(g, dark, 4, 84, 136, 5);
  px(g, wood, 4, 84, 136, 3);
  px(g, '#c48f58', 4, 84, 136, 1);
}

function paintPainting(g: G, t: number, s: PaintLook): void {
  const { x, y } = PAINTING_RECT;
  // canvas edge and a soft shadow
  px(g, '#d9cbb5', x - 1, y - 1, PAINTING_W * ZOOM + 2, PAINTING_H * ZOOM + 2);
  const glitch = s.glitchAt !== undefined && t >= s.glitchAt && t < s.glitchAt + 170;
  for (let py = 0; py < s.painting.height; py++) {
    // The glitch: for a blink, one band of the picture slips sideways.
    const slip = glitch && py >= 12 && py <= 14 ? 2 : 0;
    for (let pxl = 0; pxl < s.painting.width; pxl++) {
      const c = s.painting.at(pxl, py) ?? 's';
      let colour = PAINT_COLOURS[c] ?? '#ff00ff';
      if (glitch && c === 'x') colour = '#ff2bd6';
      px(g, colour, x + (pxl + slip) * ZOOM, y + py * ZOOM, ZOOM, ZOOM);
    }
  }
  // The raw canvas shows through the hole, with a little weave.
  for (let py = 0; py < s.painting.height; py++) {
    for (let pxl = 0; pxl < s.painting.width; pxl++) {
      if (s.painting.at(pxl, py) !== HOLE) continue;
      if ((pxl + py) % 2 === 0) px(g, '#f1ece2', x + pxl * ZOOM, y + py * ZOOM, 1, 1);
    }
  }
}

/** A gilded frame around the painting; its right side hangs loose until fixed. */
function paintFrame(g: G, t: number, s: PaintLook): void {
  const { x, y, w, h } = PAINTING_RECT;
  const k = 4;
  const gold = '#d9a43a';
  const hi = '#f2cf6a';
  const lo = '#a6741c';
  g.globalAlpha = Math.min(1, s.framed);
  // top, bottom, left
  px(g, lo, x - k, y - k, w + k * 2, k);
  px(g, gold, x - k, y - k, w + k * 2, k - 1);
  px(g, hi, x - k, y - k, w + k * 2, 1);
  px(g, lo, x - k, y + h, w + k * 2, k);
  px(g, gold, x - k, y + h, w + k * 2, k - 1);
  px(g, lo, x - k, y - k, k, h + k * 2);
  px(g, gold, x - k, y - k, k - 1, h + k * 2);
  px(g, hi, x - k, y - k, 1, h + k * 2);
  // right side: pivots on its top corner and swings back into place
  const bounce = s.knockedAt !== undefined && s.motion ? Math.max(0, 1 - (t - s.knockedAt) / 220) : 0;
  const angle = (s.loose * 0.32 + bounce * 0.06) * (s.motion ? 1 : 1);
  g.save();
  g.translate(x + w, y - k);
  g.rotate(-angle);
  px(g, lo, 0, 0, k, h + k * 2);
  px(g, gold, 0, 0, k - 1, h + k * 2);
  px(g, hi, 0, 0, 1, h + k * 2);
  g.restore();
  // the nail it should be fixed with, sticking out until then
  if (s.loose > 0) {
    px(g, '#8a96a3', x + w + 1, y + h + 1, 2, 2);
  }
  g.globalAlpha = 1;
}

function paintPencil(g: G): void {
  const { x, y } = PENCIL_RECT;
  px(g, '#3b2a3a', x + 2, y + 2, 20, 4);
  px(g, '#ffd23f', x + 3, y + 2, 15, 3);
  px(g, '#f7b6c6', x + 18, y + 2, 3, 3);
  px(g, '#e9c79a', x, y + 3, 3, 2);
  px(g, '#3b2a3a', x - 1, y + 3, 1, 1);
}

function paintBucket(g: G, brushTaken: boolean): void {
  const { x, y } = BUCKET_RECT;
  // the brush standing in the bucket, handle up
  if (!brushTaken) {
    px(g, '#8a5a3b', x + 12, y, 3, 16);
    px(g, '#b07a48', x + 12, y, 1, 16);
    px(g, '#c9c9d1', x + 11, y + 14, 5, 3);
  }
  // bucket
  px(g, '#5b6b7a', x + 1, y + 12, 20, 22);
  px(g, '#8a9aaa', x + 2, y + 12, 18, 21);
  px(g, '#a8b6c4', x + 3, y + 13, 3, 18);
  px(g, '#5b6b7a', x, y + 11, 22, 3);
  // the blue inside and a drip down the side
  px(g, '#7ec8f0', x + 2, y + 12, 18, 2);
  px(g, '#7ec8f0', x + 15, y + 14, 2, 6);
  px(g, '#7ec8f0', x + 15, y + 20, 1, 2);
  // handle
  px(g, '#3b4552', x + 1, y + 6, 1, 7);
  px(g, '#3b4552', x + 20, y + 6, 1, 7);
  px(g, '#3b4552', x + 2, y + 5, 18, 1);
}

/** A four-pointed twinkle that grows and fades, saying "here". */
function twinkle(g: G, x: number, y: number, t: number): void {
  const cycle = t % 1400;
  if (cycle > 800) return;
  const size = cycle < 400 ? Math.round((cycle / 400) * 4) : Math.round(((800 - cycle) / 400) * 4);
  if (size <= 0) return;
  px(g, '#fff6c8', x, y - size, 1, size * 2 + 1);
  px(g, '#fff6c8', x - size, y, size * 2 + 1, 1);
  px(g, '#ffd23f', x, y - 1, 1, 3);
  px(g, '#ffd23f', x - 1, y, 3, 1);
  px(g, '#ffffff', x, y, 1, 1);
}
