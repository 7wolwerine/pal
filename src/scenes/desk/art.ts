import { INK } from '../../pixel/cast.ts';
import { paintWallpaper, type WallpaperLive } from '../../pixel/wallpaper.ts';
import { paintGrid, px } from '../../pixel/stage.ts';

type G = CanvasRenderingContext2D;

export const STAGE_WIDTH = 160;
export const STAGE_HEIGHT = 100;

/* ---------- where everything stands ---------- */

/** The glass of the monitor: page content is laid over this area. */
export const SCREEN_RECT = { x: 18, y: 12, w: 90, h: 54 };
/** Top left corners of the things on the desk; each has a `paint…(g, x, y, …)` of its own. */
/** The keyboard sits at the very front of the desk: only its two back rows show, the rest runs off the picture. */
export const KEYBOARD_AT = { x: 33, y: 90 };
/** The part of the keyboard that shows (and takes clicks). */
export const KEYBOARD_SIZE = { w: 62, h: 10 };
export const MOUSE_AT = { x: 98, y: 88 };
export const MUG_AT = { x: 3, y: 82 };
/** Mostly off the left edge: only a piece of the fan and its ribbon peeks in. */
export const FAN_AT = { x: -10, y: 68 };
export const NOTE_AT = { x: 100, y: 2 };
export const CASE_AT = { x: 123, y: 19 };
export const CASE_SIZE = { w: 30, h: 64 };
/** The hamster's cage stands on top of the computer case. */
export const CAGE_AT = { x: 123, y: 1 };
export const CAGE_SIZE = { w: 30, h: 18 };

/** Where the drive lies when the scene starts. */
export const DRIVE_ON_DESK = { x: 105, y: 87 };
export const DRIVE_W = 20;
export const DRIVE_H = 9;
/** How many of the drive's pixels (from its right end) are the metal plug. */
const DRIVE_PLUG = 5;
/** The upper port, seen from the front: the drive's plug goes in at its left edge. */
const PORT = { x: 130, y: 57, w: 8, h: 5 };
const PORT_LOW = { x: 130, y: 64, w: 8, h: 5 };
/** Lined up just left of the upper port, then pushed in until only the pink body sticks out. */
const DRIVE_READY = { x: PORT.x + 1 - DRIVE_W, y: PORT.y - 2 };
const DRIVE_IN_PORT = { x: PORT.x + 1 - (DRIVE_W - DRIVE_PLUG), y: PORT.y - 2 };

/** Click areas. */
export const USB_RECT = { x: 124, y: 52, w: 28, h: 19 };
export const POWER_RECT = { x: 131, y: 38, w: 13, h: 13 };
export const TRAY_RECT = { x: 126, y: 22, w: 24, h: 9 };
export const VENT_RECT = { x: 126, y: 72, w: 24, h: 10 };
export const CAGE_RECT = { x: 123, y: 1, w: 30, h: 18 };
export const KEYBOARD_RECT = { x: KEYBOARD_AT.x, y: KEYBOARD_AT.y, w: KEYBOARD_SIZE.w, h: KEYBOARD_SIZE.h };
export const MOUSE_RECT = { x: 96, y: 86, w: 10, h: 10 };
export const LED_RECT = { x: 103, y: 66, w: 8, h: 6 };
/** The visible piece of the fan. */
export const FAN_RECT = { x: 0, y: 68, w: 12, h: 30 };
export const MUG_SIZE = { w: 16, h: 16 };
export const MUG_RECT = { x: MUG_AT.x - 1, y: MUG_AT.y - 1, w: MUG_SIZE.w + 2, h: MUG_SIZE.h + 2 };
export const NOTE_RECT = { x: 98, y: 0, w: 13, h: 12 };

/** Click area of the drive lying at `at`. */
export function driveRect(at: { readonly x: number; readonly y: number }): { x: number; y: number; w: number; h: number } {
  return { x: at.x - 2, y: at.y - 3, w: DRIVE_W + 4, h: DRIVE_H + 6 };
}

const C = {
  wall: '#f3e3c7',
  wallStripe: '#ecd8b8',
  desk: '#b98556',
  deskLight: '#cf9a6a',
  deskDark: '#a06f44',
  bezel: '#3b3a44',
  bezelDark: '#2f2e37',
  white: '#ffffff',
  beige: '#d9d4c7',
  beigeLight: '#f1eee6',
  beigeShade: '#bdb7a8',
  beigeDark: '#a9a394',
  green: '#5dcaa5',
  greenDim: '#3f8f77',
  pink: '#ed93b1',
  pinkLight: '#f8bfd1',
  pinkDark: '#d4537e',
  metal: '#c9c9d1',
  yellow: '#ffd23f',
  note: '#ffe88a',
} as const;

/* ---------- the flash drive ---------- */

/** The drive seen from the side, plug to the right: the same pink drive with a white heart as everywhere else. */
const DRIVE_SIDE = [
  '.ooooooooooooo......',
  'oPPPPPPPPPPPPPo.....',
  'oPLLLLLLLPPPPDommmmm',
  'oPLwwPwwPPPPPDoMMMMm',
  'oPPwwwwwPPPPPDoMhMhm',
  'oPPPwwwPPPPPPDoMMMMm',
  'oPPPPwPPPPPPDDommmmm',
  'oDDDDDDDDDDDDDo.....',
  '.ooooooooooooo......',
] as const;
const DRIVE_COLOURS = {
  o: '#b84a72',
  P: C.pink,
  L: C.pinkLight,
  D: C.pinkDark,
  w: C.white,
  m: '#8e8e9a',
  M: '#d5d5dd',
  h: '#5b5b68',
} as const;

/**
 * The drive from the side at (x, y). Everything right of `hideFrom` (a picture
 * x) is left out: that is how the plug disappears into the port.
 */
export function paintDriveSide(g: G, x: number, y: number, hideFrom?: number): void {
  if (hideFrom === undefined) {
    paintGrid(g, DRIVE_SIDE, DRIVE_COLOURS, x, y);
    return;
  }
  g.save();
  g.beginPath();
  g.rect(0, 0, hideFrom, STAGE_HEIGHT);
  g.clip();
  paintGrid(g, DRIVE_SIDE, DRIVE_COLOURS, x, y);
  g.restore();
}

export interface DriveCursor {
  readonly url: string;
  /** The hot spot: the tip of the plug, where the drive points. */
  readonly hotX: number;
  readonly hotY: number;
  /** How many CSS pixels one of the drive's own pixels takes. */
  readonly scale: number;
}

/** Browsers refuse cursors larger than 128 pixels, so the drive in the hand stops growing at this scale. */
const CURSOR_MAX_SCALE = 6;
const CURSOR_MIN_SCALE = 4;
const CURSOR_RIM = 2;

/**
 * The drive as the mouse cursor while it is carried: the very same picture as
 * on the desk, as large as it is drawn there (`stageScale` CSS pixels to one
 * picture pixel) and never small, with a white rim so it shows on anything.
 */
export function driveCursor(stageScale: number): DriveCursor {
  const scale = Math.max(CURSOR_MIN_SCALE, Math.min(CURSOR_MAX_SCALE, Math.round(stageScale)));
  const hotX = CURSOR_RIM + DRIVE_W * scale - 1;
  const hotY = CURSOR_RIM + Math.floor((DRIVE_H * scale) / 2);
  const c = document.createElement('canvas');
  c.width = DRIVE_W * scale + CURSOR_RIM * 2;
  c.height = DRIVE_H * scale + CURSOR_RIM * 2;
  const g = c.getContext('2d');
  if (!g) return { url: '', hotX, hotY, scale };
  g.imageSmoothingEnabled = false;
  const white = Object.fromEntries(Object.keys(DRIVE_COLOURS).map((key) => [key, '#ffffff']));
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    paintGrid(g, DRIVE_SIDE, white, CURSOR_RIM + dx, CURSOR_RIM + dy, scale);
  }
  paintGrid(g, DRIVE_SIDE, DRIVE_COLOURS, CURSOR_RIM, CURSOR_RIM, scale);
  return { url: c.toDataURL(), hotX, hotY, scale };
}

/** Where the drive is while it travels from `from` into the port; `plug` 0..1. */
function drivePath(from: { readonly x: number; readonly y: number }, plug: number): { x: number; y: number } {
  if (plug <= 0.6) {
    const lift = plug / 0.6;
    const ease = 1 - (1 - lift) * (1 - lift);
    return {
      x: from.x + (DRIVE_READY.x - from.x) * ease,
      y: from.y + (DRIVE_READY.y - from.y) * ease - Math.sin(lift * Math.PI) * 4,
    };
  }
  const push = (plug - 0.6) / 0.4;
  return { x: DRIVE_READY.x + (DRIVE_IN_PORT.x - DRIVE_READY.x) * push * push, y: DRIVE_READY.y };
}

/* ---------- things on the desk ---------- */

/** Keys per row and rows of the keyboard; a key's number is `row * KEY_COLUMNS + column`. */
export const KEY_COLUMNS = 14;
/** Rows that show (and can be played); more are drawn below, off the picture. */
export const KEY_ROWS = 2;
/** Size of one key on the grid, in picture pixels. */
const KEY_PITCH = 4;
/** The keyboard's whole body, most of which is off the picture. */
const KEYBOARD_BODY_H = 22;

/** The key under a point of the keyboard, given as fractions 0..1 of `KEYBOARD_SIZE`. */
export function keyAt(fx: number, fy: number): number {
  const row = Math.max(0, Math.min(KEY_ROWS - 1, Math.floor((fy * KEYBOARD_SIZE.h - 2) / KEY_PITCH)));
  const column = Math.max(0, Math.min(KEY_COLUMNS - 1, Math.floor((fx * KEYBOARD_SIZE.w - 2 - row * 2) / KEY_PITCH)));
  return row * KEY_COLUMNS + column;
}

/** The keyboard; keys in `pressed` are down. */
export function paintKeyboard(g: G, x: number, y: number, pressed?: ReadonlySet<number>): void {
  const w = KEYBOARD_SIZE.w;
  px(g, C.beigeShade, x, y, w, KEYBOARD_BODY_H);
  px(g, C.beige, x + 1, y + 1, w - 2, KEYBOARD_BODY_H - 1);
  px(g, C.beigeLight, x + 1, y + 1, w - 2, 1);
  // Five rows of big keys, each row shifted a little; only the first two are in the picture.
  for (let row = 0; row < 5; row++) {
    for (let key = 0; key < KEY_COLUMNS; key++) {
      const kx = x + 2 + key * KEY_PITCH + (row % 3) * 2;
      if (kx + 3 > x + w - 1) continue;
      const ky = y + 2 + row * KEY_PITCH;
      const down = row < KEY_ROWS && pressed?.has(row * KEY_COLUMNS + key) === true;
      if (down) {
        px(g, C.beigeDark, kx, ky + 1, 3, 2);
      } else {
        px(g, C.white, kx, ky, 3, 1);
        px(g, C.beigeLight, kx, ky + 1, 3, 1);
        px(g, C.beigeShade, kx, ky + 2, 3, 1);
      }
    }
  }
}

/** A pixel note for the keyboard's tune. */
const NOTE_GLYPHS = [
  ['.##', '.#.', '.#.', '##.', '##.'],
  ['.####', '.#..#', '.#..#', '##.##', '##.##'],
] as const;

export function paintTuneNote(g: G, x: number, y: number, kind: number, colour: string): void {
  paintGrid(g, NOTE_GLYPHS[kind % NOTE_GLYPHS.length] ?? NOTE_GLYPHS[0], { '#': colour }, x, y);
}

/** The ball mouse. */
export function paintMouse(g: G, x: number, y: number): void {
  px(g, C.beigeShade, x, y + 1, 7, 6);
  px(g, C.beige, x, y, 7, 6);
  px(g, C.beigeLight, x + 1, y, 5, 1);
  px(g, C.beigeShade, x + 3, y, 1, 3);
  px(g, C.beigeShade, x, y + 3, 7, 1);
}

/** The mug. Its words are too small to read from here. */
/** A big pink mug with a handle and some writing too small to read. */
export function paintMug(g: G, x: number, y: number): void {
  px(g, C.pinkDark, x + 1, y + 1, 12, 15);
  px(g, C.pink, x + 1, y, 11, 15);
  px(g, C.pinkLight, x + 2, y + 2, 2, 11);
  px(g, '#6a4a2e', x + 2, y, 9, 2);
  px(g, '#8a6440', x + 3, y, 6, 1);
  // the handle
  px(g, C.pinkDark, x + 12, y + 3, 3, 2);
  px(g, C.pinkDark, x + 14, y + 4, 2, 6);
  px(g, C.pinkDark, x + 12, y + 9, 3, 2);
  // the writing
  px(g, C.white, x + 4, y + 4, 7, 7);
  px(g, C.pinkDark, x + 5, y + 5, 5, 1);
  px(g, C.pinkDark, x + 5, y + 7, 4, 1);
  px(g, C.pinkDark, x + 5, y + 9, 5, 1);
}

/** The sticky note on the monitor's corner. */
export function paintNote(g: G, x: number, y: number): void {
  px(g, '#e6cf6a', x, y + 1, 9, 8);
  px(g, C.note, x, y, 9, 8);
  px(g, INK, x + 2, y + 2, 5, 1);
  px(g, INK, x + 2, y + 4, 4, 1);
}

/** A little desk fan with a pink ribbon tied to its guard, fluttering in the breeze. `turn` is the blades' angle. */
export function paintFan(g: G, x: number, y: number, t: number, spinning: boolean, turn = spinning ? t / 40 : 0.4): void {
  const cx = x + 9;
  const cy = y + 8;
  // base and neck
  px(g, '#8a8a96', x + 4, y + 27, 11, 2);
  px(g, '#a9a9b4', x + 5, y + 26, 9, 1);
  px(g, '#8a8a96', x + 8, y + 16, 3, 10);
  // the guard
  for (let a = 0; a < 32; a++) {
    const ang = (a / 32) * Math.PI * 2;
    px(g, '#c9c9d1', cx + Math.round(Math.cos(ang) * 8), cy + Math.round(Math.sin(ang) * 8), 1, 1);
  }
  px(g, '#b8b8c2', cx - 7, cy, 15, 1);
  px(g, '#b8b8c2', cx, cy - 7, 1, 15);
  // the blades, turning
  for (let b = 0; b < 3; b++) {
    const ang = turn + (b / 3) * Math.PI * 2;
    for (let r = 1; r <= 6; r++) {
      px(g, '#7fb2e5', cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), 2, 1);
    }
  }
  px(g, '#4f8fd6', cx - 1, cy - 1, 3, 3);
  // the ribbon: tied at the top of the guard, blown out to the right
  const wave = spinning ? t / 90 : 0;
  for (let i = 0; i < 12; i++) {
    const ry = cy - 6 + Math.round(Math.sin(wave + i * 0.7) * (spinning ? 1.5 : 0.5)) + (spinning ? 0 : Math.round(i * 0.8));
    px(g, i % 2 ? '#ed93b1' : '#f7b6cc', cx + 8 + (spinning ? i : Math.round(i * 0.3)), ry, 1, 1);
  }
}

export interface CaseLook {
  readonly off?: boolean;
  /** The power lamp's bright half of its blink. */
  readonly blink?: boolean;
  /** 0 = the disc tray is shut, 1 = all the way out. */
  readonly tray?: number;
  /** Milliseconds since dust was knocked out of the vents, if it still hangs in the air. */
  readonly dust?: number;
}

/** The beige computer case, seen from the front: disc tray, power button, two ports, vents. */
export function paintCase(g: G, x: number, y: number, look: CaseLook = {}): void {
  px(g, C.beigeShade, x, y, CASE_SIZE.w, CASE_SIZE.h);
  px(g, C.beige, x + 1, y + 1, CASE_SIZE.w - 2, CASE_SIZE.h - 2);
  px(g, C.beigeLight, x + 1, y + 1, CASE_SIZE.w - 2, 1);
  // the disc tray, and the blank bay under it
  px(g, C.beigeShade, x + 4, y + 5, 22, 6);
  px(g, C.beigeDark, x + 5, y + 7, 20, 1);
  px(g, C.beigeLight, x + 22, y + 9, 2, 1);
  px(g, C.beigeShade, x + 4, y + 13, 22, 4);
  const tray = look.tray ?? 0;
  if (tray > 0) {
    const out = Math.max(1, Math.round(tray * 5));
    px(g, INK, x + 5, y + 7, 20, 1);
    px(g, C.beigeDark, x + 5, y + 8, 20, out + 1);
    px(g, C.beigeLight, x + 5, y + 8, 20, out);
    if (out >= 3) {
      px(g, '#c9cfe0', x + 11, y + 8, 8, out - 1);
      px(g, '#e8ecf6', x + 12, y + 8, 6, 1);
      px(g, C.beigeLight, x + 14, y + 8 + Math.floor((out - 1) / 2), 2, 1);
    }
  }
  // the power button and its lamp
  px(g, C.beigeLight, x + 10, y + 21, 9, 9);
  px(g, C.beigeShade, x + 12, y + 23, 5, 5);
  px(g, look.off ? '#6a6658' : look.blink === false ? C.greenDim : C.green, x + 23, y + 25, 2, 2);
  // the ports
  px(g, C.beigeDark, x + 5, y + 36, 20, 15);
  for (const port of [PORT, PORT_LOW]) {
    px(g, INK, x + port.x - CASE_AT.x, y + port.y - CASE_AT.y, port.w, port.h);
    px(g, '#5b5b68', x + port.x - CASE_AT.x + 1, y + port.y - CASE_AT.y + 3, port.w - 2, 1);
    px(g, C.beigeLight, x + 19, y + port.y - CASE_AT.y + 2, 4, 1);
  }
  // the vents
  for (let vy = 54; vy < 61; vy += 2) px(g, C.beigeDark, x + 5, y + vy, 20, 1);
  if (look.dust !== undefined && look.dust < 900) {
    const a = look.dust / 900;
    g.globalAlpha = 1 - a;
    for (let i = 0; i < 7; i++) {
      const dx = 6 + i * 3 + Math.sin(a * 5 + i) * 2;
      const dy = 56 - a * (6 + (i % 3) * 3) + (i % 2) * 3;
      px(g, i % 2 ? '#d8d2c4' : '#f1eee6', x + dx, y + dy, i % 3 === 0 ? 2 : 1, 1);
    }
    g.globalAlpha = 1;
  }
}

/** What the hamster is doing. */
export type HamsterMood = 'run' | 'look' | 'cheeks' | 'fast';

export interface HamsterLook {
  /** The wheel's angle, in radians. */
  readonly angle: number;
  readonly mood: HamsterMood;
  /** Which of its two running steps the hamster is on. */
  readonly step: number;
}

/** "Boo" in pixel letters: a capital B and two small o's. */
const BOO_LETTERS = ['##.........', '#.#........', '##..###.###', '#.#.#.#.#.#', '##..###.###'] as const;

/** The hamster's cage: a wheel that turns, the hamster in it, and a food bowl with his name on it. */
export function paintHamsterCage(g: G, x: number, y: number, look: HamsterLook): void {
  const w = CAGE_SIZE.w;
  const hgt = CAGE_SIZE.h;
  // bars at the back, the wall showing through
  for (let bx = 3; bx < w - 1; bx += 3) px(g, '#d6c7a8', x + bx, y + 2, 1, hgt - 5);
  px(g, '#d6c7a8', x + 1, y + 8, w - 2, 1);
  // sawdust and the tray
  px(g, '#f4e3b4', x + 1, y + hgt - 4, w - 2, 1);
  px(g, '#e9d39a', x + 1, y + hgt - 3, w - 2, 1);
  px(g, '#5a9bd4', x, y + hgt - 2, w, 2);
  px(g, '#7fb2e5', x, y + hgt - 2, w, 1);

  // the wheel on its stand
  const cx = x + 8;
  const cy = y + 8;
  px(g, '#8a8a96', cx - 4, y + hgt - 4, 1, 1);
  px(g, '#8a8a96', cx + 4, y + hgt - 4, 1, 1);
  for (let i = 1; i <= 6; i++) {
    px(g, '#a9a9b4', cx - Math.round((i * 4) / 6), cy + i, 1, 1);
    px(g, '#a9a9b4', cx + Math.round((i * 4) / 6), cy + i, 1, 1);
  }
  for (let a = 0; a < 40; a++) {
    const ang = (a / 40) * Math.PI * 2;
    px(g, '#ed93b1', cx + Math.round(Math.cos(ang) * 6), cy + Math.round(Math.sin(ang) * 6), 1, 1);
  }
  for (let s = 0; s < 4; s++) {
    const ang = look.angle + (s / 4) * Math.PI * 2;
    for (let r = 2; r <= 5; r += 1) px(g, '#f7bfd2', cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), 1, 1);
  }
  px(g, C.pinkDark, cx, cy, 1, 1);

  // the hamster, at the bottom of the wheel
  const fur = '#e9a65a';
  const cream = '#fff0d2';
  const hx = cx - 3;
  const hy = cy + 2;
  if (look.mood === 'run' || look.mood === 'fast') {
    const lean = look.mood === 'fast' ? 1 : 0;
    px(g, fur, hx, hy, 6, 3);
    px(g, fur, hx + 4 + lean, hy - 1, 2, 2);
    px(g, cream, hx + 1, hy + 2, 4, 1);
    px(g, '#f7a7b8', hx + 4 + lean, hy - 2, 1, 1);
    px(g, INK, hx + 5 + lean, hy, 1, 1);
    const stride = look.step % 2;
    px(g, '#c98440', hx + (stride ? 0 : 1), hy + 3, 1, 1);
    px(g, '#c98440', hx + (stride ? 3 : 4), hy + 3, 1, 1);
  } else {
    // sitting up and facing us
    const wide = look.mood === 'cheeks' ? 1 : 0;
    px(g, fur, hx + 1, hy - 3, 1, 1);
    px(g, fur, hx + 5, hy - 3, 1, 1);
    px(g, fur, hx + 1, hy - 2, 5, 6);
    px(g, cream, hx + 2, hy + 1, 3, 3);
    if (wide) {
      px(g, fur, hx, hy - 1, 7, 3);
      px(g, cream, hx, hy, 2, 2);
      px(g, cream, hx + 5, hy, 2, 2);
    }
    px(g, INK, hx + 2, hy - 1, 1, 1);
    px(g, INK, hx + 4, hy - 1, 1, 1);
    px(g, '#f7a7b8', hx + 3, hy, 1, 1);
    if (wide && look.step % 2) px(g, '#b98556', hx + 3, hy + 1, 1, 1);
  }

  // the bowl, heaped with seeds, with his name on it
  const bx = x + 15;
  const by = y + 8;
  px(g, '#b98556', bx + 3, by - 2, 6, 1);
  px(g, '#d7a96a', bx + 2, by - 1, 9, 1);
  px(g, '#8a5a34', bx + 5, by - 2, 1, 1);
  px(g, '#8a5a34', bx + 8, by - 1, 1, 1);
  px(g, '#c9a27a', bx, by, 13, 1);
  px(g, '#fffaf0', bx, by + 1, 13, 6);
  px(g, '#e6dccb', bx + 1, by + 7, 11, 1);
  paintGrid(g, BOO_LETTERS, { '#': '#4b1528' }, bx + 1, by + 1);

  // the frame in front
  px(g, '#8a8a96', x, y + 1, 1, hgt - 3);
  px(g, '#8a8a96', x + w - 1, y + 1, 1, hgt - 3);
  px(g, '#8a8a96', x, y + 1, w, 1);
  px(g, '#a9a9b4', x + 12, y, 6, 1);
}

/* ---------- the whole picture ---------- */

export interface DeskLook {
  /** 0 = the drive has not gone anywhere yet, 1 = it is in the port. */
  readonly plug: number;
  /** Where the drive started its way into the port from (the hand that let go of it). */
  readonly plugFrom?: { readonly x: number; readonly y: number };
  /** Where the drive lies on the desk. */
  readonly drive?: { readonly x: number; readonly y: number };
  readonly sad: boolean;
  /** True while the player is carrying the drive as the cursor, so it is not on the desk. */
  readonly held?: boolean;
  /** The computer is switched off: black screen, dark lamp. */
  readonly off?: boolean;
  /** Stage time the computer was switched on, for its boot screen. */
  readonly bootAt?: number;
  /** The desktop's own state: day or night and everything the clicks did to it. */
  readonly live?: WallpaperLive;
  /** The real time for the taskbar. */
  readonly clock?: string;
  readonly pressed?: ReadonlySet<number>;
  readonly tray?: number;
  readonly dust?: number;
  readonly hamster?: HamsterLook;
  /** The fan's blades' angle. */
  readonly fanTurn?: number;
  /** The mouse was nudged: how far it sits from its place. */
  readonly mouseDx?: number;
  /** Colour of the monitor's little lamp. */
  readonly lamp?: string;
}

/** How long the boot screen shows after switching on. */
export const BOOT_MS = 1800;

export function paintDesk(g: G, t: number, look: DeskLook, motion: boolean): void {
  const blink = motion ? Math.floor(t / 400) % 2 === 0 : true;

  px(g, C.wall, 0, 0, 160, 80);
  for (let x = 4; x < 160; x += 12) px(g, C.wallStripe, x, 0, 2, 80);

  px(g, C.desk, 0, 80, 160, 20);
  px(g, C.deskLight, 0, 80, 160, 1);
  px(g, C.deskDark, 0, 98, 160, 2);

  // Monitor.
  px(g, C.bezelDark, 56, 72, 14, 6);
  px(g, C.bezelDark, 46, 78, 34, 3);
  px(g, C.bezel, 14, 8, 98, 64);
  px(g, look.off ? '#6a6658' : (look.lamp ?? C.green), 106, 68, 2, 2);
  paintNote(g, NOTE_AT.x, NOTE_AT.y);

  // What the monitor shows: an ordinary, pretty desktop — or nothing, or the boot screen.
  const s = SCREEN_RECT;
  const booting = look.bootAt !== undefined && t - look.bootAt < BOOT_MS;
  if (look.off) {
    px(g, '#101016', s.x, s.y, s.w, s.h);
    px(g, '#24242e', s.x + 6, s.y + 4, 18, 1);
    px(g, '#24242e', s.x + 4, s.y + 6, 10, 1);
  } else if (booting) {
    const u = (t - (look.bootAt ?? 0)) / BOOT_MS;
    px(g, '#000000', s.x, s.y, s.w, s.h);
    px(g, '#ed93b1', s.x + s.w / 2 - 6, s.y + 18, 12, 10);
    px(g, '#ffffff', s.x + s.w / 2 - 3, s.y + 21, 2, 2);
    px(g, '#ffffff', s.x + s.w / 2 + 1, s.y + 21, 2, 2);
    px(g, '#2a2a34', s.x + 25, s.y + 36, s.w - 50, 3);
    px(g, '#ffffff', s.x + 25, s.y + 36, Math.round((s.w - 50) * Math.min(1, u * 1.2)), 3);
  } else {
    paintWallpaper(g, s.x, s.y, s.w, s.h, {
      gloomy: look.sad,
      drive: look.plug >= 1 && !look.off,
      live: look.live,
      clock: look.clock,
      t,
      still: !motion,
    });
  }

  // Keyboard, mouse, fan and a mug.
  paintKeyboard(g, KEYBOARD_AT.x, KEYBOARD_AT.y, look.pressed);
  paintMouse(g, MOUSE_AT.x + (look.mouseDx ?? 0), MOUSE_AT.y);
  paintFan(g, FAN_AT.x, FAN_AT.y, motion ? t : 0, !look.off, look.fanTurn);
  paintMug(g, MUG_AT.x, MUG_AT.y);

  // Computer case, and the hamster who lives on top of it.
  paintCase(g, CASE_AT.x, CASE_AT.y, { off: look.off, blink, tray: look.tray, dust: look.dust });
  paintHamsterCage(g, CAGE_AT.x, CAGE_AT.y, look.hamster ?? { angle: 0, mood: 'run', step: 0 });

  // The flash drive: on the desk, or on its way into the port, plug first.
  // While held it is the cursor, so it is not drawn here.
  if (look.held) return;
  if (look.plug <= 0) {
    const at = look.drive ?? DRIVE_ON_DESK;
    px(g, C.deskDark, Math.round(at.x) + 1, Math.round(at.y) + DRIVE_H, DRIVE_W - 7, 1);
    paintDriveSide(g, Math.round(at.x), Math.round(at.y));
    return;
  }
  const at = drivePath(look.plugFrom ?? { x: DRIVE_READY.x - 10, y: DRIVE_READY.y + 8 }, look.plug);
  const x = Math.round(at.x);
  const y = Math.round(at.y);
  // the plug vanishes at the port's edge, bit by bit; only the pink body is left sticking out
  paintDriveSide(g, x, y, look.plug > 0.6 ? PORT.x + 1 : undefined);
  if (look.plug >= 1 && blink) px(g, C.yellow, x + 11, y + 2, 1, 1);
}

/** Now and then a four-pointed twinkle catches the light on the drive: something precious. */
export function paintDriveTwinkle(g: G, t: number, at: { readonly x: number; readonly y: number } = DRIVE_ON_DESK): void {
  const cycle = t % 2600;
  if (cycle > 700) return;
  const size = cycle < 350 ? Math.round((cycle / 350) * 3) : Math.round(((700 - cycle) / 350) * 3);
  if (size <= 0) return;
  const x = Math.round(at.x) + 12;
  const y = Math.round(at.y) - 1;
  px(g, '#fff6c8', x, y - size, 1, size * 2 + 1);
  px(g, '#fff6c8', x - size, y, size * 2 + 1, 1);
  px(g, C.white, x, y, 1, 1);
}

/** Once the drive is picked up, the ports light up, inviting it in. */
export function paintPortGlow(g: G, t: number): void {
  const pulse = 0.35 + 0.25 * Math.sin(t / 240);
  g.globalAlpha = pulse;
  px(g, '#ffe08a', 127, 55, 24, 15);
  g.globalAlpha = 1;
  for (const port of [PORT, PORT_LOW]) {
    px(g, '#ffe08a', port.x, port.y, port.w, port.h);
    px(g, '#fff6c8', port.x + 1, port.y + 1, port.w - 2, 1);
    px(g, '#c99a1a', port.x + 1, port.y + 3, port.w - 2, 1);
  }
}

/** Twinkles round the power button, when switching on is the thing to do. */
export function paintPowerTwinkle(g: G, t: number): void {
  for (const [x, y, phase] of [[129, 37, 0], [145, 40, 500], [138, 53, 900]] as const) {
    const cycle = (t + phase) % 1400;
    if (cycle > 800) continue;
    const size = cycle < 400 ? Math.round((cycle / 400) * 3) : Math.round(((800 - cycle) / 400) * 3);
    if (size <= 0) continue;
    px(g, '#fff6c8', x, y - size, 1, size * 2 + 1);
    px(g, '#fff6c8', x - size, y, size * 2 + 1, 1);
    px(g, C.white, x, y, 1, 1);
  }
}
