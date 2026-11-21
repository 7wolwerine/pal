import { px, type Rect } from '../../pixel/stage.ts';
import { HOLE, PAINTING_H, PAINTING_W, type Painting } from './model.ts';

type G = CanvasRenderingContext2D;

/** A little taller than the other scenes: the easel stands in the room, with floor under it. */
export const STAGE_W = 176;
export const STAGE_H = 112;
/** The painting is shown close up, every painted pixel two pixels wide. */
export const ZOOM = 2;
const FLOOR_Y = 98;

/** Where the painting sits on the stage. */
export const PAINTING_RECT: Rect = { x: 18, y: 8, w: PAINTING_W * ZOOM, h: PAINTING_H * ZOOM };
/** The paint tin on the floor, with the brush standing in it. */
export const BUCKET_RECT: Rect = { x: 150, y: 70, w: 26, h: 40 };
/** The inkwell with its quill, on the floor by the easel's leg. */
export const QUILL_RECT: Rect = { x: 0, y: 72, w: 22, h: 38 };
/** The frame, once it is on: the painting and a bit round it. */
export const FRAME_RECT: Rect = { x: PAINTING_RECT.x - 6, y: PAINTING_RECT.y - 6, w: PAINTING_RECT.w + 12, h: PAINTING_RECT.h + 12 };
/** Where the brush rests in the tin, in stage pixels (its bristles' tip). */
export const BRUSH_HOME: readonly [number, number] = [BUCKET_RECT.x + 14, BUCKET_RECT.y + 4];

/** The painting's colours, one per palette character. */
const PAINT_COLOURS: Readonly<Record<string, string>> = {
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

export type Held = 'brush' | 'quill' | null;

export interface PaintLook {
  readonly painting: Painting;
  readonly held: Held;
  /** 0 = no frame yet, 1 = frame on. */
  readonly framed: number;
  /** How crooked the frame still hangs, in radians (0 = straight). */
  readonly tilt: number;
  /** Stage time of the subtle glitch, if it has happened. */
  readonly glitchAt?: number;
  /** Where to twinkle a hint, if anywhere. */
  readonly hint?: { x: number; y: number };
  /** The brush on its way (on a touch screen it flies to the tap and back); its bristles' tip. */
  readonly brushAt?: readonly [number, number];
  readonly motion: boolean;
}

export function paintScene(g: G, t: number, s: PaintLook): void {
  paintRoom(g);
  paintEasel(g);
  paintPainting(g, t, s);
  if (s.framed > 0) paintFrame(g, s);
  paintInkwell(g, s.held !== 'quill');
  paintBucket(g, s.held === 'brush' || s.brushAt !== undefined);
  if (s.brushAt) paintBrush(g, s.brushAt[0], s.brushAt[1]);
  if (s.hint && s.motion) twinkle(g, s.hint.x, s.hint.y, t);
}

function paintRoom(g: G): void {
  px(g, '#f6e7d8', 0, 0, STAGE_W, FLOOR_Y);
  for (let x = 2; x < STAGE_W; x += 10) px(g, '#f1dfcd', x, 0, 3, FLOOR_Y);
  // a patch of sunlight from a window off to the side
  px(g, '#fbf1e6', 152, 0, 24, 46);
  // the skirting board and the wooden floor
  px(g, '#d8b48c', 0, FLOOR_Y - 3, STAGE_W, 3);
  px(g, '#c89a6a', 0, FLOOR_Y, STAGE_W, STAGE_H - FLOOR_Y);
  for (let y = FLOOR_Y + 4; y < STAGE_H; y += 5) px(g, '#b5875a', 0, y, STAGE_W, 1);
  for (let y = FLOOR_Y, i = 0; y < STAGE_H; y += 5, i++) {
    for (let x = (i % 2) * 17; x < STAGE_W; x += 34) px(g, '#b5875a', x, y, 1, 5);
  }
}

function paintEasel(g: G): void {
  const wood = '#a8743f';
  const dark = '#7a5230';
  // the back leg and the top peg
  px(g, dark, 81, 2, 4, 6);
  for (let i = 0; i < 16; i++) px(g, dark, 82, 88 + i, 3, 1);
  // front legs, splayed onto the floor
  for (let i = 0; i < 18; i++) {
    px(g, wood, 30 - Math.round(i * 0.7), 88 + i, 3, 1);
    px(g, wood, 134 + Math.round(i * 0.7), 88 + i, 3, 1);
  }
  // the ledge the painting rests on
  px(g, dark, 14, 88, 138, 5);
  px(g, wood, 14, 88, 138, 3);
  px(g, '#c48f58', 14, 88, 138, 1);
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

/** A gilded frame around the painting. It lands crooked; clicks straighten it, like a picture on a wall. */
function paintFrame(g: G, s: PaintLook): void {
  const { x, y, w, h } = PAINTING_RECT;
  const k = 5;
  const gold = '#d9a43a';
  const hi = '#f2cf6a';
  const lo = '#a6741c';
  g.save();
  g.globalAlpha = Math.min(1, s.framed);
  // It drops into place from a little above.
  const drop = (1 - Math.min(1, s.framed)) * -10;
  g.translate(x + w / 2, y + h / 2 + drop);
  g.rotate(s.tilt);
  const L = -w / 2 - k;
  const T = -h / 2 - k;
  const W = w + k * 2;
  const H = h + k * 2;
  const side = (sx: number, sy: number, sw: number, sh: number): void => {
    g.fillStyle = lo;
    g.fillRect(sx, sy, sw, sh);
    g.fillStyle = gold;
    g.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
  };
  side(L, T, W, k);
  side(L, -T - k, W, k);
  side(L, T, k, H);
  side(-L - k, T, k, H);
  g.fillStyle = hi;
  g.fillRect(L + 1, T + 1, W - 2, 1);
  g.fillRect(L + 1, T + 1, 1, H - 2);
  // little ornaments in the corners
  g.fillStyle = hi;
  for (const [cx, cy] of [[L + 2, T + 2], [-L - 4, T + 2], [L + 2, -T - 4], [-L - 4, -T - 4]] as const) g.fillRect(cx, cy, 2, 2);
  g.restore();
}

/** An inkwell on the floor with a white quill standing in it. */
function paintInkwell(g: G, withQuill: boolean): void {
  const { x, y } = QUILL_RECT;
  const base = y + 36;
  // the well: a squat dark glass pot with a shine
  px(g, '#2b2b3a', x + 4, base - 8, 12, 8);
  px(g, '#3f3f55', x + 5, base - 8, 10, 7);
  px(g, '#2b2b3a', x + 6, base - 10, 8, 2);
  px(g, '#6b6b85', x + 6, base - 7, 2, 4);
  px(g, '#1b1b26', x + 7, base - 10, 6, 1);
  if (!withQuill) return;
  // the quill: shaft from the ink up and to the right, a white feather along it
  for (let i = 0; i < 26; i++) {
    const qx = x + 10 + Math.round(i * 0.35);
    const qy = base - 10 - i;
    px(g, i < 3 ? '#2b2b3a' : '#d8cfc2', qx, qy, 1, 1);
    if (i > 6) {
      const vane = Math.round(Math.sin(((i - 6) / 20) * Math.PI) * 4);
      px(g, '#fffdf8', qx - vane, qy, vane, 1);
      px(g, '#ece4d8', qx + 1, qy, Math.max(1, vane - 1), 1);
    }
  }
}

/** The paint tin: a round can with a rim, a bail handle, blue paint over its lip, and the brush. */
function paintBucket(g: G, brushTaken: boolean): void {
  const { x, y } = BUCKET_RECT;
  const top = y + 16;
  const bottom = y + 38;
  // the brush standing in the paint, handle up
  if (!brushTaken) paintBrush(g, BRUSH_HOME[0], BRUSH_HOME[1] + 10, true);
  // shadow on the floor
  px(g, 'rgba(90, 60, 30, 0.25)', x + 2, bottom - 1, 22, 2);
  // body with a rounded light
  px(g, '#6b7a8a', x + 2, top + 2, 22, bottom - top - 2);
  px(g, '#9fb0c0', x + 3, top + 2, 20, bottom - top - 3);
  px(g, '#c3d0dc', x + 5, top + 3, 3, bottom - top - 6);
  px(g, '#7d8c9c', x + 19, top + 3, 3, bottom - top - 6);
  // a label band
  px(g, '#f7b6c6', x + 3, top + 9, 20, 7);
  px(g, '#ed93b1', x + 3, top + 15, 20, 1);
  px(g, '#ffffff', x + 9, top + 11, 8, 1);
  px(g, '#ffffff', x + 10, top + 13, 6, 1);
  // the rim and the blue inside, spilling over
  px(g, '#5b6b7a', x + 1, top, 24, 3);
  px(g, '#d5dee8', x + 2, top, 22, 1);
  px(g, '#4f9fd8', x + 3, top + 1, 20, 1);
  px(g, '#7ec8f0', x + 6, top + 2, 3, 6);
  px(g, '#7ec8f0', x + 7, top + 8, 2, 2);
  // the bail handle, an arc over the top
  for (let i = 0; i <= 22; i++) {
    const hx = x + 2 + i;
    const hy = top - Math.round(Math.sin((i / 22) * Math.PI) * 7);
    px(g, '#3b4552', hx, hy, 1, 1);
  }
}

/** A paintbrush with its blue bristles at (tx, ty); `upright` stands it handle-up in the tin. */
function paintBrush(g: G, tx: number, ty: number, upright = false): void {
  const tipX = Math.round(tx);
  const tipY = Math.round(ty);
  if (upright) {
    px(g, '#7ec8f0', tipX - 1, tipY - 2, 3, 3);
    px(g, '#c9c9d1', tipX - 1, tipY - 6, 3, 4);
    px(g, '#8a5a3b', tipX, tipY - 22, 2, 16);
    px(g, '#b07a48', tipX, tipY - 22, 1, 16);
    return;
  }
  // held: tilted, bristles down-left, handle up-right
  px(g, '#4f9fd8', tipX, tipY, 2, 2);
  px(g, '#7ec8f0', tipX + 1, tipY - 2, 3, 3);
  px(g, '#c9c9d1', tipX + 3, tipY - 5, 3, 3);
  for (let i = 0; i < 12; i++) px(g, i % 4 === 0 ? '#b07a48' : '#8a5a3b', tipX + 5 + Math.round(i * 0.6), tipY - 6 - i, 2, 1);
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
