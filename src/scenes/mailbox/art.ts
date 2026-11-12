import { INK, paintDrive } from '../../pixel/cast.ts';
import { px } from '../../pixel/stage.ts';

type G = CanvasRenderingContext2D;

export const STAGE_WIDTH = 160;
export const STAGE_HEIGHT = 100;

/** Where things are, in picture pixels. */
export const MAILBOX_RECT = { x: 110, y: 40, w: 34, h: 48 };
export const MAIL_SLOT = { x: 120, y: 58 };
export const CHARACTER_HOME = { x: 64, y: 73 };
export const CHARACTER_AT_MAILBOX = { x: 102, y: 73 };

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

export function paintMailbox(g: G, flagUp: boolean): void {
  px(g, C.door, 124, 67, 3, 20);
  px(g, C.boxDark, 115, 57, 20, 11);
  px(g, C.box, 116, 58, 18, 9);
  px(g, C.box, 117, 56, 16, 2);
  px(g, C.boxDark, 131, 58, 1, 9);
  px(g, INK, 119, 61, 8, 1);
  if (flagUp) {
    px(g, C.red, 135, 54, 2, 9);
    px(g, C.red, 137, 54, 4, 3);
  } else {
    px(g, C.red, 135, 62, 6, 2);
  }
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

/** The "!" that bobs over whatever wants attention. */
export function paintAlert(g: G, x: number, y: number, t: number): void {
  const bob = Math.round(Math.sin(t / 220) * 1.5);
  px(g, C.white, x - 2, y - 2 + bob, 7, 14);
  px(g, INK, x, y + bob, 3, 6);
  px(g, INK, x, y + 8 + bob, 3, 2);
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
export function paintCloseUp(g: G, p: number, t: number): void {
  g.globalAlpha = Math.min(0.6, p * 4);
  px(g, INK, 0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  g.globalAlpha = 1;

  const open = p > 0.25;
  const slide = Math.min(1, Math.max(0, (p - 0.35) / 0.4));

  if (open) {
    // Flap folded up, behind everything.
    for (let i = 0; i < 16; i++) px(g, C.paperShade, 48 + i * 2, 40 - i, 64 - i * 4, 1);
  }
  // The drive rises out of the envelope; the envelope front hides the rest of it.
  paintDrive(g, 71, 46 - slide * 38, 3);
  px(g, C.paperLine, 47, 39, 66, 42);
  px(g, C.paper, 48, 40, 64, 40);
  if (!open) {
    for (let i = 0; i < 20; i++) px(g, C.paperShade, 48 + i * 1.6, 40 + i, 64 - i * 3.2, 1);
  }
  px(g, C.paperLine, 48, 40, 64, 1);
  // Heart seal.
  px(g, C.red, 76, 58, 3, 2);
  px(g, C.red, 81, 58, 3, 2);
  px(g, C.red, 76, 60, 8, 2);
  px(g, C.red, 77, 62, 6, 1);
  px(g, C.red, 78, 63, 4, 1);
  px(g, C.red, 79, 64, 2, 1);

  if (slide >= 1) {
    // Sparkles once the drive is out.
    const on = Math.floor(t / 180) % 2 === 0;
    for (const [x, y] of [
      [60, 14],
      [98, 10],
      [102, 28],
      [58, 30],
    ] as const) {
      if (on === (x % 4 === 0)) continue;
      px(g, C.yellow, x, y - 1, 1, 3);
      px(g, C.yellow, x - 1, y, 3, 1);
    }
  }
}
