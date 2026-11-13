import { INK } from '../../pixel/cast.ts';
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
/** The grass and the path: anywhere here the character can be sent by a click. */
export const GROUND_RECT = { x: 0, y: 78, w: 160, h: 22 };
/** How far up and down the garden the feet may go. */
export const FEET_MIN_Y = 81;
export const FEET_MAX_Y = 99;
export const TREE_RECT = { x: 132, y: 8, w: 28, h: 30 };
export const BUSH_RECT = { x: 138, y: 83, w: 20, h: 13 };
export const POT_RECT = { x: 7, y: 75, w: 14, h: 18 };
export const CHIMNEY_RECT = { x: 64, y: 0, w: 12, h: 14 };
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
  lilac: '#b79be8',
  redDark: '#b8322f',
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
  [28, 88, C.pink],
  [100, 96, C.yellow],
  [132, 96, C.pink],
  [34, 66, C.yellow],
  [90, 80, C.pink],
  [6, 97, C.lilac],
  [22, 96, C.yellow],
  [38, 82, C.white],
  [64, 97, C.lilac],
  [72, 80, C.yellow],
  [110, 80, C.lilac],
  [150, 78, C.yellow],
  [86, 97, C.white],
  [4, 70, C.pink],
  [154, 99, C.lilac],
  [48, 97, C.pink],
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
export function paintBackdrop(g: G, t: number, motion: boolean, picked = 0): void {
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

  FLOWERS.forEach(([x, y, colour], i) => {
    // Each one nods a pixel in the breeze, in its own time.
    const nod = motion && Math.floor(t / 900 + i * 0.37) % 4 === 0 ? 1 : 0;
    px(g, C.grassDark, x, y + 2, 1, 2);
    px(g, colour, x - 1 + nod, y, 3, 2);
    px(g, colour === C.white ? C.yellow : C.white, x + nod, y, 1, 1);
  });

  paintTree(g, time, motion, picked);

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

/** The apple tree behind the fence: a round crown sitting square on its trunk. */
export const APPLES = [
  [139, 20],
  [146, 27],
  [153, 18],
  [151, 31],
  [141, 30],
] as const;

function paintTree(g: G, t: number, motion: boolean, picked: number): void {
  // trunk, centred under the crown
  px(g, C.doorDark, 143, 36, 6, 28);
  px(g, C.door, 144, 36, 4, 28);
  px(g, C.doorDark, 141, 40, 3, 2);
  // crown: a stack of rows that makes a round ball
  const rows = [
    [140, 12],
    [137, 16],
    [135, 20],
    [134, 24],
    [133, 26],
    [133, 26],
    [133, 26],
    [134, 24],
    [135, 20],
    [137, 16],
    [140, 12],
  ] as const;
  rows.forEach(([x, w], i) => px(g, C.leaf, x, 9 + i * 3, w, 3));
  px(g, C.leafLight, 140, 12, 9, 3);
  px(g, C.leafLight, 137, 16, 5, 3);
  px(g, C.leafLight, 150, 15, 3, 2);
  px(g, C.grassDark, 136, 33, 6, 2);
  px(g, C.grassDark, 147, 37, 8, 2);
  px(g, C.grassDark, 154, 27, 3, 3);
  // The first `picked` apples have already fallen.
  APPLES.forEach(([x, y], i) => i >= picked && paintApple(g, x, y));
  if (motion) {
    // Now and then one of them catches the light.
    const turn = Math.floor(t / 2600);
    const since = t % 2600;
    const apple = APPLES[picked + (turn % Math.max(1, APPLES.length - picked))];
    if (apple && since < 420) paintTwinkle(g, apple[0] + 1, apple[1] + 1, since < 140 || since > 280 ? 1 : 2, C.white);
  }
}

/** One apple, three pixels across, with a stalk and a highlight. */
export function paintApple(g: G, x: number, y: number): void {
  px(g, C.redDark, x, y, 3, 3);
  px(g, C.red, x, y, 3, 2);
  px(g, '#ff9c8f', x, y, 1, 1);
  px(g, C.doorDark, x + 1, y - 1, 1, 1);
}

/** A round bush on the grass. `shake` -1, 0 or 1 nudges it sideways. */
export function paintBush(g: G, shake: number): void {
  const { x, y } = BUSH_RECT;
  const ox = x + shake;
  g.globalAlpha = 0.25;
  px(g, INK, x + 1, y + 12, 18, 1);
  g.globalAlpha = 1;
  px(g, C.leaf, ox + 4, y, 11, 2);
  px(g, C.leaf, ox + 2, y + 2, 16, 2);
  px(g, C.leaf, ox, y + 4, 20, 6);
  px(g, C.leaf, ox + 1, y + 10, 18, 2);
  px(g, C.leafLight, ox + 5, y + 1, 5, 2);
  px(g, C.leafLight, ox + 2, y + 5, 3, 2);
  px(g, C.leafLight, ox + 12, y + 4, 4, 1);
  px(g, C.grassDark, ox + 8, y + 7, 4, 2);
  px(g, C.grassDark, ox + 15, y + 8, 3, 2);
  px(g, C.pink, ox + 4, y + 8, 2, 2);
  px(g, C.pink, ox + 13, y + 2, 2, 2);
  px(g, C.pink, ox + 16, y + 6, 2, 2);
}

const CRITTERS = {
  // A bunny: white, long ears, a pink nose.
  bunny: { rows: ['.w.w....', '.w.w....', '.wwww...', 'wwwkwp..', 'wwwwww..', '.wwwwwww', '.ww..ww.'], colours: { w: '#fdfdfd', k: INK, p: '#f29aa8' } },
  // A hedgehog: a brown ball of spikes with a pale snout.
  hedgehog: { rows: ['..hHhH...', '.hHhHhH..', 'hHhHhHss.', 'HhHhHsksk', 'hHhHssss.', '.k..k....'], colours: { h: '#6b4a33', H: '#8a6446', s: '#f0d2b0', k: INK } },
  // A field mouse: grey, with a round ear and a long tail.
  mouse: { rows: ['....gg..', '..ggggg.', 'k.ggggkp', '.kgggggg', '...k..k.'], colours: { g: '#a9a3ad', k: INK, p: '#f29aa8' } },
} as const;

export type Critter = keyof typeof CRITTERS;
export const CRITTER_ORDER: readonly Critter[] = ['bunny', 'hedgehog', 'mouse'];

/** A small animal running to the left; (x, y) is where its feet touch the grass. */
export function paintCritter(g: G, kind: Critter, x: number, y: number, t: number): void {
  const { rows, colours } = CRITTERS[kind];
  const hop = kind === 'bunny' ? Math.round(Math.abs(Math.sin(t / 90)) * 4) : Math.floor(t / 70) % 2;
  const palette: Record<string, string> = colours;
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const colour = palette[row[rx] ?? ''];
      // mirrored: the sprites are drawn facing right, the animal runs left
      if (colour) px(g, colour, x + row.length - 1 - rx, y - rows.length - hop + ry, 1, 1);
    }
  });
}

/** A few leaves thrown up when the bush is shaken; `u` 0..1. */
export function paintLeaves(g: G, u: number): void {
  const { x, y } = BUSH_RECT;
  const spots = [
    [3, -1, -1],
    [9, -2, 0],
    [15, -1, 1],
    [6, 0, -1],
    [12, 0, 1],
  ] as const;
  for (const [dx, dy, dir] of spots) {
    const lift = Math.sin(u * Math.PI) * 6;
    px(g, u < 0.5 ? C.leafLight : C.leaf, x + dx + dir * u * 5, y + dy - lift + u * 3, 2, 1);
  }
}

/**
 * Sparkles that come and go around something worth a click: three twinkles,
 * each on its own beat, with long quiet gaps between them.
 */
export function paintSparkles(g: G, rect: { x: number; y: number; w: number; h: number }, t: number): void {
  const spots = [
    [0.15, 0.2, 0],
    [0.85, 0.45, 520],
    [0.3, 0.8, 1040],
    [0.75, 0.05, 1560],
  ] as const;
  for (const [fx, fy, delay] of spots) {
    const u = ((t + delay) % 2080) / 520;
    if (u >= 1) continue;
    const size = u < 0.25 || u > 0.75 ? 1 : 2;
    paintTwinkle(g, Math.round(rect.x + rect.w * fx), Math.round(rect.y + rect.h * fy), size, u > 0.4 && u < 0.6 ? C.white : C.yellow);
  }
}

/** A four-pointed twinkle, for "this is worth a look". */
export function paintTwinkle(g: G, x: number, y: number, size: number, colour: string = C.yellow): void {
  px(g, colour, x, y - size, 1, size * 2 + 1);
  px(g, colour, x - size, y, size * 2 + 1, 1);
  px(g, C.white, x, y, 1, 1);
}

/** A little potted plant on the grass, bottom-left. `blooms` adds flowers to it. */
export function paintPlant(g: G, blooms = 0): void {
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
  const extra = [
    [13, 74, C.lilac],
    [8, 80, C.yellow],
    [18, 79, C.pink],
    [12, 71, C.white],
  ] as const;
  extra.slice(0, blooms).forEach(([x, y, colour]) => {
    px(g, C.leaf, x, y + 2, 1, 2);
    px(g, colour, x - 1, y, 3, 2);
    px(g, colour === C.white ? C.yellow : C.white, x, y, 1, 1);
  });
}

/** A fat puff of smoke out of the chimney; `u` 0..1. */
export function paintPuff(g: G, u: number): void {
  g.globalAlpha = 1 - u * 0.8;
  const size = 3 + Math.round(u * 5);
  px(g, C.smoke, 70 - size / 2 + Math.sin(u * 5) * 3, 4 - u * 22, size, size);
  px(g, C.smoke, 73 - size / 2 - Math.sin(u * 4) * 2, 8 - u * 18, size - 1, size - 1);
  g.globalAlpha = 1;
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
const ENV = {
  paper: '#fff6e0',
  shade: '#f3e4c2',
  inside: '#e9d3a3',
  edge: '#d4b67c',
  red: '#e24b4a',
  blue: '#4f8fd6',
} as const;

/** The red-and-blue airmail stripes along an edge. */
function airmail(g: G, x: number, y: number, w: number, h: number): void {
  for (let i = 0; i < w; i++) {
    const c = Math.floor((i + 0) / 3) % 2 ? ENV.blue : ENV.red;
    if (i % 3 === 2) continue;
    px(g, c, x + i, y, 1, h);
  }
}

/**
 * The close-up: the envelope from the back, with soft round corners. The heart
 * sits on the point of the flap like a seal and now and then catches the
 * light. `open` (0..1) folds the flap up over the top edge, taking the heart
 * with it.
 */
export function paintCloseUp(g: G, t: number, dim: number, open: number, shine: boolean): void {
  g.globalAlpha = Math.min(0.62, dim);
  px(g, INK, 0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  g.globalAlpha = 1;
  const { x, y, w } = ENVELOPE;
  const flapH = 24;

  // Flap folded up above the top edge, inside showing.
  if (open > 0) {
    const up = Math.max(1, Math.round(flapH * open));
    for (let i = 0; i < up; i++) {
      const half = Math.round((w / 2 - 2) * (1 - i / up));
      if (half <= 0) break;
      px(g, ENV.edge, x + w / 2 - half, y - 1 - i, half * 2, 1);
      px(g, ENV.shade, x + w / 2 - half + 1, y - 1 - i, Math.max(0, half * 2 - 2), 1);
    }
  }

  paintEnvelopeBody(g, 0, STAGE_HEIGHT);

  if (open > 0) {
    // The opening: the inside of the pocket shows above its front edge.
    px(g, ENV.inside, x + 2, y, w - 4, 4);
    px(g, ENV.edge, x, y + 4, w, 1);
  }

  let sealX = SEAL.x;
  let sealY = SEAL.y;
  if (open <= 0) {
    // Flap still closed: a triangle pointing down with the heart on its tip.
    for (let i = 0; i < flapH; i++) {
      const half = Math.round((w / 2 - 1) * (1 - i / flapH));
      if (half <= 0) break;
      px(g, ENV.shade, x + w / 2 - half, y + 1 + i, half * 2, 1);
      px(g, ENV.edge, x + w / 2 - half, y + 1 + i, 1, 1);
      px(g, ENV.edge, x + w / 2 + half - 1, y + 1 + i, 1, 1);
    }
  } else {
    sealX = x + w / 2;
    sealY = y - Math.round(flapH * open) + 4;
  }
  paintHeart(g, sealX, sealY, shine ? t : -1);
}

/**
 * The envelope's body: paper with round corners, an airmail border and the
 * folded-in side flaps. Only the rows from `fromY` down to `toY` are painted,
 * so the front pocket can be laid over whatever slides out of it.
 */
function paintEnvelopeBody(g: G, fromY: number, toY: number): void {
  const { x, y, w, h } = ENVELOPE;
  g.save();
  g.beginPath();
  g.rect(0, fromY, STAGE_WIDTH, toY - fromY);
  g.clip();
  // A soft shadow under the envelope.
  g.globalAlpha = 0.22;
  px(g, INK, x + 2, y + 4, w, h);
  g.globalAlpha = 1;
  px(g, ENV.edge, x - 1, y, w + 2, h);
  px(g, ENV.edge, x, y - 1, w, h + 2);
  px(g, ENV.paper, x, y, w, h);
  airmail(g, x + 3, y + h - 3, w - 6, 2);
  airmail(g, x + 3, y + 1, w - 6, 2);
  // the side flaps folded in, meeting the bottom flap
  for (let i = 2; i < 22; i++) {
    const hh = Math.round(i * 0.8);
    px(g, ENV.shade, x + i, y + h - 4 - hh, 1, hh);
    px(g, ENV.shade, x + w - 1 - i, y + h - 4 - hh, 1, hh);
  }
  // round the corners: two steps of edge colour, the tips cut away
  for (const [cx, cy, sx, sy] of [
    [x, y, 1, 1],
    [x + w - 1, y, -1, 1],
    [x, y + h - 1, 1, -1],
    [x + w - 1, y + h - 1, -1, -1],
  ] as const) {
    px(g, ENV.edge, cx, cy, 1, 1);
    px(g, ENV.edge, cx + sx, cy, 1, 1);
    px(g, ENV.edge, cx, cy + sy, 1, 1);
  }
  g.restore();
}

const HEART = ['.rr..rr.', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...'];

/**
 * The little red heart, centred on (cx, cy). It does not beat: every couple
 * of seconds a streak of light runs across it. `t` below zero keeps it plain.
 */
function paintHeart(g: G, cx: number, cy: number, t: number): void {
  const w = HEART[0]?.length ?? 0;
  const ox = Math.round(cx - w / 2);
  const oy = Math.round(cy - HEART.length / 2);
  // the streak: a diagonal that sweeps from the top left to the bottom right
  const sweep = t < 0 ? -99 : Math.floor(((t % 2400) / 2400) * 60) - 4;
  HEART.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] !== 'r') continue;
      const d = rx + ry - sweep;
      px(g, d === 0 ? C.white : d === 1 || d === -1 ? '#ff9c8f' : C.red, ox + rx, oy + ry, 1, 1);
    }
  });
  // a small fixed highlight, so it reads as glossy even between the streaks
  px(g, '#ff9c8f', ox + 1, oy + 1, 1, 1);
}

const DRIVE_BIG = {
  metalEdge: '#8e8e9a',
  metal: '#d5d5dd',
  metalLight: '#f2f2f6',
  hole: '#5b5b68',
  edge: '#b84a72',
  body: '#ed93b1',
  light: '#f8bfd1',
  dark: '#d4537e',
} as const;
export const DRIVE_BIG_W = 18;
export const DRIVE_BIG_H = 30;

const DRIVE_HEART = ['.ww..ww.', 'wwwwwwww', 'wwwwwwww', '.wwwwww.', '..wwww..', '...ww...'];

/** The flash drive up close, standing on its end: metal plug on top, a white heart on the pink body. */
export function paintDriveBig(g: G, x: number, y: number): void {
  const D = DRIVE_BIG;
  // plug
  px(g, D.metalEdge, x + 4, y, 10, 9);
  px(g, D.metal, x + 5, y + 1, 8, 8);
  px(g, D.metalLight, x + 5, y + 1, 2, 8);
  px(g, D.hole, x + 7, y + 3, 2, 2);
  px(g, D.hole, x + 10, y + 3, 2, 2);
  px(g, D.metalEdge, x + 5, y + 7, 8, 1);
  // body, with round corners
  px(g, D.edge, x + 1, y + 9, 16, 21);
  px(g, D.edge, x, y + 10, 18, 19);
  px(g, D.body, x + 1, y + 10, 16, 19);
  px(g, D.dark, x + 14, y + 11, 3, 18);
  px(g, D.dark, x + 2, y + 26, 15, 3);
  px(g, D.light, x + 2, y + 11, 2, 13);
  px(g, D.light, x + 4, y + 11, 6, 1);
  px(g, '#ffffff', x + 2, y + 11, 1, 3);
  DRIVE_HEART.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) if (row[rx] === 'w') px(g, '#ffffff', x + 5 + rx, y + 14 + ry, 1, 1);
  });
  // the eye for a ribbon
  px(g, D.edge, x + 7, y + 23, 4, 4);
  px(g, '#fff6e0', x + 8, y + 24, 2, 2);
}

/** The drive rising out of the opened envelope; `u` 0..1. */
export function paintDriveOut(g: G, u: number, t: number): void {
  const { x, y, w } = ENVELOPE;
  const dx = x + w / 2 - DRIVE_BIG_W / 2;
  const dy = y + 6 - Math.round(u * 34);
  // Only what is above the pocket's edge shows; the rest is still inside.
  g.save();
  g.beginPath();
  g.rect(0, 0, STAGE_WIDTH, y + 4);
  g.clip();
  paintDriveBig(g, dx, dy);
  g.restore();
  if (u >= 1) {
    const on = Math.floor(t / 220) % 2 === 0;
    paintTwinkle(g, dx - 7, dy + 6, on ? 3 : 2);
    paintTwinkle(g, dx + 26, dy + 14, on ? 2 : 3);
    paintTwinkle(g, dx + 22, dy - 3, on ? 1 : 2, C.white);
  }
}
