import { INK, paintDrive } from '../../pixel/cast.ts';
import { px } from '../../pixel/stage.ts';

type G = CanvasRenderingContext2D;

export const STAGE_WIDTH = 160;
export const STAGE_HEIGHT = 100;

/** Where things are, in picture pixels. */
export const MAILBOX_RECT = { x: 112, y: 54, w: 28, h: 32 };
export const MAIL_SLOT = { x: 121, y: 66 };
/** The character's feet rest on the path at this height. */
export const FEET_Y = 91;
export const CHARACTER_HOME = { x: 62 };
export const CHARACTER_AT_MAILBOX = { x: 98 };
export const CHARACTER_AT_DOOR = { x: 42 };
/** The strip of path the character can be sent along by clicking it. */
export const PATH_RECT = { x: 44, y: 84, w: 86, h: 9 };
export const DOOR_RECT = { x: 42, y: 47, w: 16, h: 26 };

/** The close-up envelope, seen from the back: body, flap and the heart seal on it. */
export const ENVELOPE = { x: 36, y: 50, w: 88, h: 44 };
export const SEAL = { x: 80, y: 74 };
export const SEAL_RECT = { x: 68, y: 62, w: 24, h: 22 };

const C = {
  sky: '#bfe6f5',
  skyLow: '#dff3f7',
  cloud: '#ffffff',
  hill: '#a9dba6',
  grass: '#7cc66b',
  grassDark: '#5fae57',
  grassLight: '#93d67f',
  path: '#ecd6a4',
  pathEdge: '#d4b67c',
  wall: '#f8e6c6',
  wallShade: '#e9cfa4',
  roof: '#d9624f',
  roofDark: '#b84a3c',
  roofLight: '#e98572',
  door: '#8a5a3c',
  doorDark: '#6b4428',
  glass: '#a6dcef',
  glassLight: '#d6f1f8',
  white: '#ffffff',
  chimney: '#b96a5a',
  smoke: '#f4f4f4',
  fence: '#fbf5e6',
  fenceShade: '#e2d8c0',
  box: '#4f8fd6',
  boxDark: '#3a6fb0',
  red: '#e24b4a',
  leaf: '#4fa25a',
  leafLight: '#6cc070',
  pink: '#ed93b1',
  yellow: '#ffd23f',
  paper: '#fff6e0',
  paperShade: '#eedfba',
  paperLine: '#c9a66b',
} as const;

const TUFTS = [
  [8, 64],
  [30, 94],
  [96, 62],
  [142, 94],
  [152, 66],
  [20, 80],
  [118, 97],
  [78, 96],
] as const;

const FLOWERS = [
  [10, 90, C.pink],
  [100, 96, C.yellow],
  [148, 82, C.pink],
  [34, 66, C.yellow],
  [90, 80, C.pink],
] as const;

function cloud(g: G, x: number, y: number): void {
  px(g, C.cloud, x + 4, y - 2, 7, 2);
  px(g, C.cloud, x + 2, y, 12, 2);
  px(g, C.cloud, x, y + 2, 17, 3);
}

function windowWithFlowers(g: G, x: number, y: number): void {
  px(g, C.white, x, y, 14, 12);
  px(g, C.glass, x + 1, y + 1, 12, 10);
  px(g, C.glassLight, x + 2, y + 2, 3, 3);
  px(g, C.white, x + 6, y + 1, 2, 10);
  px(g, C.white, x + 1, y + 5, 12, 2);
  px(g, C.door, x - 1, y + 12, 16, 3);
  px(g, C.pink, x + 1, y + 10, 2, 2);
  px(g, C.yellow, x + 6, y + 10, 2, 2);
  px(g, C.pink, x + 11, y + 10, 2, 2);
}

function fence(g: G, from: number, to: number): void {
  px(g, C.fenceShade, from, 71, to - from, 1);
  px(g, C.fenceShade, from, 75, to - from, 1);
  for (let x = from; x < to - 1; x += 4) {
    px(g, C.fence, x, 67, 2, 11);
    px(g, C.fence, x, 66, 1, 1);
  }
}

/** Sky, hills, garden, tree and cottage. `motion` false keeps clouds and smoke still. */
export function paintBackdrop(g: G, t: number, motion: boolean): void {
  const time = motion ? t : 0;
  px(g, C.sky, 0, 0, 160, 60);
  px(g, C.skyLow, 0, 44, 160, 16);
  cloud(g, ((20 + time * 0.004) % 200) - 20, 10);
  cloud(g, ((120 + time * 0.0025) % 200) - 20, 22);

  px(g, C.hill, 0, 50, 160, 10);
  px(g, C.hill, 96, 46, 44, 4);
  px(g, C.hill, 106, 43, 24, 3);
  px(g, C.hill, 0, 47, 30, 3);

  px(g, C.grass, 0, 58, 160, 42);
  for (const [x, y] of TUFTS) {
    px(g, C.grassDark, x, y, 1, 2);
    px(g, C.grassDark, x + 2, y - 1, 1, 3);
    px(g, C.grassLight, x + 4, y, 1, 2);
  }

  // Path from the door to the mailbox.
  px(g, C.path, 44, 72, 14, 14);
  px(g, C.path, 44, 84, 86, 8);
  px(g, C.pathEdge, 44, 92, 86, 1);
  px(g, C.pathEdge, 58, 83, 72, 1);

  for (const [x, y, colour] of FLOWERS) {
    px(g, C.grassDark, x, y + 2, 1, 2);
    px(g, colour, x - 1, y, 3, 2);
    px(g, C.white, x, y, 1, 1);
  }

  // Tree behind the fence.
  px(g, C.door, 148, 40, 5, 24);
  px(g, C.leaf, 138, 14, 22, 24);
  px(g, C.leaf, 142, 10, 16, 4);
  px(g, C.leaf, 135, 20, 3, 12);
  px(g, C.leafLight, 141, 14, 9, 3);
  px(g, C.leafLight, 139, 19, 5, 2);
  px(g, C.red, 145, 26, 2, 2);
  px(g, C.red, 153, 20, 2, 2);
  px(g, C.red, 151, 32, 2, 2);

  fence(g, 88, 110);
  fence(g, 140, 160);

  // Chimney and smoke.
  px(g, C.chimney, 66, 8, 8, 14);
  px(g, C.roofDark, 65, 7, 10, 2);
  for (let i = 0; i < 3; i++) {
    const phase = (time / 2400 + i / 3) % 1;
    const size = 2 + Math.round(phase * 3);
    px(g, C.smoke, 69 + Math.sin(phase * 6 + i) * 2, 4 - phase * 16, size, size);
  }

  // Roof, drawn as rows of shingles that widen towards the eaves.
  for (let row = 0; row < 11; row++) {
    const colour = row === 0 ? C.roofLight : row % 2 ? C.roof : C.roofDark;
    px(g, colour, 26 - row * 1.4, 14 + row * 2, 48 + row * 2.8, 2);
  }

  px(g, C.wall, 18, 36, 64, 36);
  px(g, C.wallShade, 18, 36, 64, 2);
  px(g, C.wallShade, 18, 70, 64, 2);
  windowWithFlowers(g, 24, 44);
  windowWithFlowers(g, 62, 44);

  px(g, C.doorDark, 43, 49, 14, 23);
  px(g, C.door, 44, 50, 12, 22);
  px(g, C.yellow, 53, 61, 2, 2);
  px(g, C.pathEdge, 42, 72, 16, 2);
  // A little heart over the door.
  px(g, C.pink, 48, 42, 2, 1);
  px(g, C.pink, 51, 42, 2, 1);
  px(g, C.pink, 48, 43, 5, 1);
  px(g, C.pink, 49, 44, 3, 1);
  px(g, C.pink, 50, 45, 1, 1);
}

/** A mailbox on a post that stands on the top edge of the path. */
export function paintMailbox(g: G, flagUp: boolean): void {
  // post, planted at the path's upper edge, with a little shadow
  px(g, C.grassDark, 120, 84, 10, 1);
  px(g, C.doorDark, 123, 72, 4, 13);
  px(g, C.door, 124, 72, 2, 12);
  // box with a rounded top and a darker rim
  px(g, INK, 117, 61, 16, 1);
  px(g, INK, 116, 62, 18, 11);
  px(g, C.boxDark, 117, 63, 16, 9);
  px(g, C.box, 117, 62, 15, 9);
  px(g, '#7fb2e5', 118, 62, 13, 1);
  px(g, INK, 119, 66, 8, 1);
  // flag
  if (flagUp) {
    px(g, INK, 134, 56, 2, 11);
    px(g, C.red, 136, 56, 5, 3);
  } else {
    px(g, INK, 134, 66, 7, 2);
    px(g, C.red, 135, 66, 5, 1);
  }
}

const ARROW = ['..kkk..', '..kpk..', '..kpk..', 'kkkpkkk', '.kpppk.', '..kpk..', '...k...'];

/** A chunky pink arrow bobbing over something to click. (x, y) is its tip. */
export function paintPointer(g: G, x: number, y: number, t: number): void {
  const b = Math.round(Math.abs(Math.sin(t / 220)) * 3);
  const ox = Math.round(x) - 3;
  const oy = Math.round(y) - ARROW.length - b;
  for (const [hx, hy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    ARROW.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] !== '.') px(g, C.white, ox + rx + hx, oy + ry + hy, 1, 1);
    });
  }
  ARROW.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === 'k') px(g, INK, ox + rx, oy + ry, 1, 1);
      else if (ch === 'p') px(g, '#ff6fa3', ox + rx, oy + ry, 1, 1);
    }
  });
}

/** A four-pointed twinkle, for "this is worth a look". */
export function paintTwinkle(g: G, x: number, y: number, size: number, colour: string = C.yellow): void {
  px(g, colour, x, y - size, 1, size * 2 + 1);
  px(g, colour, x - size, y, size * 2 + 1, 1);
  px(g, C.white, x, y, 1, 1);
}

/** A little potted plant on the grass, bottom-left. */
export function paintPlant(g: G): void {
  px(g, C.doorDark, 9, 90, 10, 2);
  px(g, '#c56a4a', 9, 85, 10, 6);
  px(g, '#b05638', 9, 85, 2, 6);
  px(g, C.leaf, 11, 78, 6, 8);
  px(g, C.leaf, 8, 81, 4, 5);
  px(g, C.leaf, 16, 80, 4, 6);
  px(g, C.leafLight, 12, 79, 3, 2);
  px(g, C.leafLight, 17, 82, 2, 2);
  px(g, C.pink, 10, 77, 2, 2);
  px(g, C.yellow, 15, 76, 2, 2);
}

const BIRD = '#6c7b88';

/** A few birds gliding across the sky, wings flapping. */
export function paintBirds(g: G, t: number): void {
  for (let i = 0; i < 3; i++) {
    const span = STAGE_WIDTH + 40;
    const bx = Math.round(STAGE_WIDTH + 16 - ((t * 0.013 + i * 58) % span));
    const by = 5 + i * 5 + Math.round(Math.sin(t / 700 + i) * 2);
    const up = Math.floor(t / 180 + i) % 2 === 0;
    const wing = up ? -1 : 0;
    px(g, BIRD, bx, by + wing, 2, 1);
    px(g, BIRD, bx + 2, by - 1, 1, 1);
    px(g, BIRD, bx + 3, by + wing, 2, 1);
  }
}

type Part = readonly [number, number, number, number];

/** Draws a small glyph with a soft one-pixel halo so it reads on any background. */
function mark(g: G, parts: readonly Part[], x: number, y: number): void {
  for (const [ox, oy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    for (const [dx, dy, w, h] of parts) px(g, C.white, x + dx + ox, y + dy + oy, w, h);
  }
  for (const [dx, dy, w, h] of parts) px(g, INK, x + dx, y + dy, w, h);
}

// A compact "!" and "?": small, clean, and clearly not buttons.
const BANG: readonly Part[] = [
  [0, 0, 2, 4],
  [0, 5, 2, 2],
];
const QUESTION: readonly Part[] = [
  [0, 0, 3, 1],
  [2, 1, 1, 1],
  [1, 2, 2, 1],
  [1, 3, 1, 1],
  [1, 5, 1, 2],
];

/** A small "!" that bobs over whatever wants attention. */
export function paintAlert(g: G, x: number, y: number, t: number): void {
  mark(g, BANG, x, y + Math.round(Math.sin(t / 240)));
}

/** A small "?" shown over the character before the surprise sinks in. */
export function paintQuestion(g: G, x: number, y: number, t: number): void {
  mark(g, QUESTION, x, y + Math.round(Math.sin(t / 240)));
}

export function paintSmallEnvelope(g: G, x: number, y: number): void {
  px(g, C.paperLine, x - 1, y - 1, 10, 8);
  px(g, C.paper, x, y, 8, 6);
  for (let i = 0; i < 3; i++) {
    px(g, C.paperLine, x + 1 + i, y + 1 + i, 1, 1);
    px(g, C.paperLine, x + 6 - i, y + 1 + i, 1, 1);
  }
  px(g, C.red, x + 3, y + 3, 2, 2);
}

/**
 * The close-up: a big envelope opens and the drive slides out of it.
 * `p` runs from 0 to 1 over the whole close-up.
 */
/**
 * The close-up: the envelope from the back. The heart is a wax seal on the
 * point of the flap and beats while it waits. `open` (0..1) folds the flap up
 * over the top edge, taking the seal with it.
 */
export function paintCloseUp(g: G, t: number, dim: number, open: number, beat: boolean): void {
  g.globalAlpha = Math.min(0.6, dim);
  px(g, INK, 0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  g.globalAlpha = 1;
  const { x, y, w, h } = ENVELOPE;
  const flapH = 24;

  // Flap folded up above the top edge.
  if (open > 0) {
    const up = Math.max(1, Math.round(flapH * open));
    for (let i = 0; i < up; i++) {
      const half = Math.round((w / 2) * (1 - i / up));
      px(g, C.paperShade, x + w / 2 - half, y - 1 - i, half * 2, 1);
      px(g, C.paperLine, x + w / 2 - half, y - 1 - i, 1, 1);
      px(g, C.paperLine, x + w / 2 + half - 1, y - 1 - i, 1, 1);
    }
  }
  // Body.
  px(g, C.paperLine, x - 1, y - 1, w + 2, h + 2);
  px(g, C.paper, x, y, w, h);
  // the folded side and bottom panels
  for (let i = 0; i < 20; i++) {
    px(g, C.paperShade, x + i, y + h - 1 - Math.round(i * 0.9), 1, Math.round(i * 0.9) + 1);
    px(g, C.paperShade, x + w - 1 - i, y + h - 1 - Math.round(i * 0.9), 1, Math.round(i * 0.9) + 1);
  }
  px(g, C.paperLine, x, y + h - 1, w, 1);

  let sealX = SEAL.x;
  let sealY = SEAL.y;
  if (open <= 0) {
    // Flap still closed: a triangle pointing down with the seal on its tip.
    for (let i = 0; i < flapH; i++) {
      const half = Math.round((w / 2) * (1 - i / flapH));
      if (half <= 0) break;
      px(g, C.paperShade, x + w / 2 - half, y + i, half * 2, 1);
      px(g, C.paperLine, x + w / 2 - half, y + i, 1, 1);
      px(g, C.paperLine, x + w / 2 + half - 1, y + i, 1, 1);
    }
  } else {
    sealX = x + w / 2;
    sealY = y - Math.round(flapH * open) + 3;
  }
  const pulse = beat ? Math.max(0, Math.sin(t / 130)) * Math.max(0, Math.sin(t / 520)) : 0;
  paintSeal(g, sealX, sealY, pulse > 0.35);
}

const HEART_SMALL = ['.rr...rr.', 'rRrr.rrrr', 'rRrrrrrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'];
const HEART_BIG = ['.rrr...rrr.', 'rRrrr.rrrrr', 'rRrrrrrrrrr', 'rrrrrrrrrrr', 'rrrrrrrrrrr', '.rrrrrrrrr.', '..rrrrrrr..', '...rrrrr...', '....rrr....', '.....r.....'];

/** The wax heart seal centred on (cx, cy); `big` is the beat. */
function paintSeal(g: G, cx: number, cy: number, big: boolean): void {
  const heart = big ? HEART_BIG : HEART_SMALL;
  const w = heart[0]?.length ?? 0;
  const ox = Math.round(cx - w / 2);
  const oy = Math.round(cy - heart.length / 2);
  // a wax puddle under the heart
  px(g, '#9e2c35', ox - 2, oy, w + 4, heart.length);
  px(g, '#9e2c35', ox - 1, oy - 2, w + 2, heart.length + 4);
  px(g, '#c13a45', ox - 1, oy - 1, w + 2, heart.length + 1);
  heart.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === 'r') px(g, '#ef5566', ox + rx, oy + ry, 1, 1);
      else if (ch === 'R') px(g, '#ffc2ca', ox + rx, oy + ry, 1, 1);
    }
  });
}

/** The drive rising out of the opened envelope; `u` 0..1. */
export function paintDriveOut(g: G, u: number, t: number): void {
  const { x, y, w } = ENVELOPE;
  const dx = x + w / 2 - 9;
  const dy = y + 4 - Math.round(u * 34);
  paintDrive(g, dx, dy, 3);
  // the envelope's front pocket hides the rest of the drive
  px(g, C.paperLine, x - 1, y - 1, w + 2, 1);
  px(g, C.paper, x, y, w, 14);
  for (let i = 0; i < 14; i++) {
    px(g, C.paperShade, x + i, y + 13 - i, 1, 1);
    px(g, C.paperShade, x + w - 1 - i, y + 13 - i, 1, 1);
  }
  if (u >= 1) {
    const on = Math.floor(t / 220) % 2 === 0;
    paintTwinkle(g, dx - 7, dy + 6, on ? 3 : 2);
    paintTwinkle(g, dx + 26, dy + 14, on ? 2 : 3);
    paintTwinkle(g, dx + 22, dy - 3, on ? 1 : 2, C.white);
  }
}
