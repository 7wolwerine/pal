import { paintGrid, px } from './stage.ts';

type G = CanvasRenderingContext2D;

/**
 * The computer's desktop wallpaper: a lake under mountains, a few desktop
 * icons, a day and night switch and a taskbar with the real time. By day the
 * sun has the faintest of faces; by night the moon does, and stars come out.
 * Clouds drift, birds cross, the water glitters and the tree sways.
 *
 * It is alive: every part of it answers a click (`pokeWallpaper`), and what
 * changes is kept in a `WallpaperLive`. Drawn at any size; nothing is ever
 * drawn outside its own rectangle.
 */
export interface WallpaperLook {
  /** The sun slides behind a cloud while the player is refusing. */
  readonly gloomy?: boolean;
  /** Shows the new drive's icon on the desktop. */
  readonly drive?: boolean;
  /** Leave the taskbar out (the page draws its own). */
  readonly taskbar?: boolean;
  /** The taskbar's height in pixels; by default it grows with the picture. */
  readonly bar?: number;
  /** Night: dark sky, the moon, stars. `live.night` wins when `live` is given. */
  readonly night?: boolean;
  /** Milliseconds, for everything that moves; 0 keeps it all still. */
  readonly t?: number;
  /** What the clicks have changed. Without it the desktop is only a picture. */
  readonly live?: WallpaperLive;
  /** The real time, "H:MM", drawn in the taskbar. */
  readonly clock?: string;
  /** Reduced motion: nothing drifts or twinkles, but clicks still get their (short) answers. */
  readonly still?: boolean;
}

/** The three old programs on the desktop that no longer start. */
export type RetroIcon = 'retro-vlak' | 'retro-bat' | 'retro-disk';

export type WallpaperHit =
  | 'sun'
  | 'moon'
  | 'sky'
  | 'mountain'
  | 'water'
  | 'fish'
  | 'tree'
  | 'meadow'
  | 'folder'
  | 'bin'
  | 'drive'
  | 'switch'
  | 'start'
  | 'clock'
  | RetroIcon
  | null;

type IconId = 'folder' | 'bin' | 'drive' | RetroIcon;

/** A moment something happened at a spot of the picture (fractions of the area). */
interface Mark {
  readonly fx: number;
  readonly fy: number;
  readonly at: number;
}

interface Flower extends Mark {
  readonly colour: number;
}

interface Fish extends Mark {
  readonly dir: 1 | -1;
}

/** Everything about the desktop that changes: day or night, splashes, the fish, the sun's smile, icons. */
export interface WallpaperLive {
  night: boolean;
  /** Private animation state; only this file reads or writes below this line. */
  splashes: Mark[];
  fish: Fish | undefined;
  waterPokes: number;
  smileAt: number | undefined;
  weather: Mark | undefined;
  echo: Mark | undefined;
  leavesAt: number | undefined;
  flowers: Flower[];
  icon: { readonly id: IconId; readonly at: number } | undefined;
  startAt: number | undefined;
  clockAt: number | undefined;
  switchAt: number | undefined;
  /** Size and options of the last paint, so a click can be matched to what was drawn. */
  geo: { w: number; h: number; taskbar: boolean; drive: boolean; bar?: number };
}

function createWallpaperLive(): WallpaperLive {
  return {
    night: false,
    splashes: [],
    fish: undefined,
    waterPokes: 0,
    smileAt: undefined,
    weather: undefined,
    echo: undefined,
    leavesAt: undefined,
    flowers: [],
    icon: undefined,
    startAt: undefined,
    clockAt: undefined,
    switchAt: undefined,
    geo: { w: 90, h: 54, taskbar: true, drive: false },
  };
}

/** The one desktop of the one computer in the game, shared by the desk scene and the PC frame. */
export const desktop: WallpaperLive = createWallpaperLive();

const DAY = {
  sky: ['#6fbfe6', '#7ec8ea', '#8fd0ee', '#a3daf1', '#b8e3f4', '#cdebf6'],
  cloud: '#ffffff',
  cloudLo: '#e9f4fa',
  far: '#9aa6d6',
  farSnow: '#f2f4ff',
  near: '#6f9fb8',
  lake: '#5aa9d6',
  lakeHi: '#7cc0e6',
  glitter: '#bfe6f5',
  meadow: '#7cc66b',
  meadowHi: '#93d67f',
  trunk: '#6a4a2e',
  leaves: '#4fa25a',
  leavesHi: '#6cc070',
  bird: '#4a5a6a',
  drop: '#eaf7ff',
  stem: '#3f8f4a',
};
const NIGHT = {
  sky: ['#0d1430', '#121a3c', '#18224a', '#1f2a56', '#283462', '#33406e'],
  cloud: '#3a4572',
  cloudLo: '#2c3660',
  far: '#2f3566',
  farSnow: '#8a93c8',
  near: '#22304a',
  lake: '#16244a',
  lakeHi: '#24345e',
  glitter: '#a9b6e8',
  meadow: '#1f3d2e',
  meadowHi: '#2a4d3a',
  trunk: '#2a1e18',
  leaves: '#1c3a26',
  leavesHi: '#26503a',
  bird: '#8a93c8',
  drop: '#a9b6e8',
  stem: '#2f6a48',
};

const FLOWER_DAY = ['#ed93b1', '#ffffff', '#ffd23f', '#b79cf0'];
const FLOWER_NIGHT = ['#8a5f86', '#8a93c8', '#9a8a4a', '#6a5ca0'];

/* ---------- how long things last ---------- */

const SMILE_MS = 2400;
const SPLASH_MS = 650;
const FISH_MS = 1000;
const RAIN_MS = 2400;
const STAR_MS = 800;
const ECHO_MS = 1000;
const LEAVES_MS = 1700;
const ICON_MS = 1400;
const PRESS_MS = 600;
const MAX_FLOWERS = 16;
/** Every this many clicks into the water a fish jumps. */
const FISH_EVERY = 3;

/* ---------- little pictures ---------- */

const ICONS: Record<IconId, { readonly rows: readonly string[]; readonly palette: Readonly<Record<string, string>> }> = {
  folder: {
    rows: ['.ooo...', 'oYYYooo', 'oyyyyyo', 'oYYYYYo', 'oYYYYYo', 'oYYYYYo', 'ooooooo'],
    palette: { o: '#c99a1a', Y: '#ffd23f', y: '#ffe680' },
  },
  bin: {
    rows: ['.......', '.......', '.oBBBo.', '.oBlBo.', '.oBlBo.', '.oBBBo.', '.ooooo.'],
    palette: { o: '#8a93a8', B: '#d9e2ee', l: '#b3bdd0' },
  },
  drive: {
    rows: ['..mmm..', '..mMm..', '.ooooo.', 'oPwPwPo', 'oPwwwPo', 'oPPwPPo', '.ooooo.'],
    palette: { m: '#8e8e9a', M: '#d5d5dd', o: '#b84a72', P: '#ed93b1', w: '#ffffff' },
  },
  'retro-vlak': {
    rows: ['KKKKKKK', 'KwKKKKK', 'KKyKccK', 'KKyKccK', 'KyyyyyK', 'KmKmKmK', 'KKKKKKK'],
    palette: { K: '#101018', w: '#ffffff', y: '#ffe04a', c: '#4ae0e0', m: '#ff5ad0' },
  },
  'retro-bat': {
    rows: ['KKKKKKK', 'KgKKKKK', 'KKgKKKK', 'KgKKKKK', 'KKKKKKK', 'KKKgggK', 'KKKKKKK'],
    palette: { K: '#101018', g: '#5cf07a' },
  },
  'retro-disk': {
    rows: ['bbbbbb.', 'bbssskb', 'bbssskb', 'bbbbbbb', 'bwwwwwb', 'bwlllwb', 'bwwwwwb'],
    palette: { b: '#3a5fd0', s: '#c9cfe0', k: '#3b3a44', w: '#ffffff', l: '#9aa6d6' },
  },
};
const BIN_LID = ['..ooo..', 'ooooooo'];
const HEART = ['w.w', 'www', '.w.'];

/** Tiny 3x5 digits for the clock. */
const DIGITS: Readonly<Record<string, readonly string[]>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  ':': ['.', '#', '.', '#', '.'],
};

/* ---------- where things are ---------- */

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface Layout {
  readonly w: number;
  readonly h: number;
  /** One "desktop pixel": icons, the switch and the sprites are drawn in multiples of it. */
  readonly u: number;
  readonly taskbar: number;
  readonly sceneH: number;
  readonly sun: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly crown: { readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number };
  readonly trunk: Rect;
  readonly toggle: Rect;
  readonly start: Rect;
  readonly clock: Rect;
  /** Scale of the clock's digits. */
  readonly du: number;
}

const FAR: readonly [number, number][] = [[0.15, 0.22], [0.42, 0.3], [0.7, 0.2]];
const NEAR: readonly [number, number][] = [[0.28, 0.14], [0.58, 0.18], [0.92, 0.12]];
const WATER_TOP = 0.62;
const WATER_END = 0.8;

/** The top of a ridge at `fx`, as a fraction of the scene's height. */
function ridgeTop(fromY: number, peaks: readonly [number, number][], fx: number): number {
  let top = 1;
  for (const [at, height] of peaks) top = Math.min(top, fromY - height * Math.max(0, 1 - Math.abs(fx - at) * 4));
  return top;
}

function clockWidth(text: string, du: number): number {
  let width = 0;
  for (const char of text) width += ((DIGITS[char]?.[0]?.length ?? 3) + 1) * du;
  return Math.max(0, width - du);
}

function layout(w: number, h: number, taskbarShown: boolean, bar?: number): Layout {
  const u = Math.max(1, Math.round(w / 90));
  const taskbar = taskbarShown ? (bar ?? Math.max(9, Math.round(h * 0.13))) : 0;
  const sceneH = h - taskbar;
  // The digits leave at least a pixel of the dark box free above and below them.
  const du = Math.max(1, Math.floor((taskbar - 4) / 5));
  // On a tall screen (the PC frame) the sun and the tree keep the shape they have on the desk's wide one.
  const r = Math.max(3, Math.round(Math.min(w * 0.55, sceneH) * 0.11));
  const trunkX = Math.round(w * 0.8);
  const trunkW = Math.max(2, Math.round(w * 0.025));
  const crownRx = Math.max(4, Math.round(w * 0.075));
  const crownRy = Math.max(4, Math.min(Math.round(sceneH * 0.15), Math.round(crownRx * 1.15)));
  const crownCy = Math.max(Math.round(sceneH * 0.5), Math.round(sceneH * 0.87) - Math.round(crownRy * 2.4));
  // always room for "00:00", so the box does not jump at ten o'clock
  const clockW = clockWidth('00:00', du) + 4 * du;
  const startW = Math.max(9, Math.round(w * 0.12));
  return {
    w,
    h,
    u,
    taskbar,
    sceneH,
    du,
    sun: { cx: Math.round(w * 0.66), cy: Math.round(sceneH * 0.2), r },
    crown: { cx: trunkX + Math.floor(trunkW / 2), cy: crownCy, rx: crownRx, ry: crownRy },
    trunk: { x: trunkX, y: crownCy, w: trunkW, h: Math.round(sceneH * 0.87) - crownCy },
    toggle: { x: w - 13 * u, y: sceneH - 8 * u, w: 11 * u, h: 6 * u },
    // A pixel of the dark bar free on every side: under the light top line, at the left and at the bottom.
    start: { x: 1, y: sceneH + 2, w: startW, h: Math.max(1, taskbar - 3) },
    clock: { x: w - clockW - 1, y: sceneH + 1, w: clockW, h: Math.max(1, taskbar - 2) },
  };
}

const ICON_SLOTS: readonly { readonly id: IconId; readonly col: number; readonly row: number }[] = [
  { id: 'folder', col: 0, row: 0 },
  { id: 'bin', col: 0, row: 1 },
  { id: 'drive', col: 0, row: 2 },
  { id: 'retro-vlak', col: 1, row: 0 },
  { id: 'retro-bat', col: 1, row: 1 },
  { id: 'retro-disk', col: 1, row: 2 },
];

function iconRect(L: Layout, col: number, row: number): Rect {
  const s = 7 * L.u;
  return { x: 3 * L.u + col * (s + 4 * L.u), y: 3 * L.u + row * (s + 4 * L.u), w: s, h: s };
}

function inside(r: Rect, x: number, y: number, pad = 0): boolean {
  return x >= r.x - pad && x < r.x + r.w + pad && y >= r.y - pad && y < r.y + r.h + pad;
}

/* ---------- clicking ---------- */

/** True while something that started at `at` and lasts `ms` is still going at `t`. */
function during(at: number | undefined, ms: number, t: number): at is number {
  return at !== undefined && t >= at && t - at < ms;
}

/**
 * A click at (fx, fy), fractions 0..1 of the wallpaper area, at time `t` (the
 * same clock as `look.t`). Returns what was hit; the caller plays the sound.
 * `'switch'` has already flipped `live.night` when it is returned.
 */
export function pokeWallpaper(live: WallpaperLive, fx: number, fy: number, t: number, look: WallpaperLook = {}): WallpaperHit {
  const taskbarShown = look.taskbar === undefined ? live.geo.taskbar : look.taskbar;
  const drive = look.drive ?? live.geo.drive;
  const L = layout(live.geo.w, live.geo.h, taskbarShown, look.bar ?? live.geo.bar);
  const x = fx * L.w;
  const y = fy * L.h;
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;

  // Old marks that have played out (or belong to another clock) are dropped here.
  live.splashes = live.splashes.filter((s) => t - s.at < SPLASH_MS && s.at - t < FISH_MS * 2);

  if (y >= L.sceneH) {
    if (inside(L.start, x, y, 1)) {
      live.startAt = t;
      return 'start';
    }
    if (inside(L.clock, x, y, 1)) {
      live.clockAt = t;
      return 'clock';
    }
    return null;
  }

  if (inside(L.toggle, x, y, L.u)) {
    live.night = !live.night;
    live.switchAt = t;
    live.smileAt = undefined;
    live.weather = undefined;
    return 'switch';
  }

  for (const slot of ICON_SLOTS) {
    if (slot.id === 'drive' && !drive) continue;
    if (!inside(iconRect(L, slot.col, slot.row), x, y, L.u)) continue;
    live.icon = { id: slot.id, at: t };
    return slot.id;
  }

  const night = live.night;
  if (Math.hypot(x - L.sun.cx, y - L.sun.cy) <= L.sun.r + 2) {
    live.smileAt = t;
    return night ? 'moon' : 'sun';
  }

  const { crown, trunk } = L;
  const inCrown = ((x - crown.cx) / (crown.rx + 1)) ** 2 + ((y - crown.cy) / (crown.ry + 1)) ** 2 <= 1;
  if (inCrown || inside(trunk, x, y, 1)) {
    live.leavesAt = t;
    return 'tree';
  }

  const sy = y / L.sceneH;
  const horizon = Math.min(ridgeTop(0.58, FAR, fx), ridgeTop(0.6, NEAR, fx));
  if (sy < horizon) {
    live.weather = { fx, fy: sy, at: t };
    return 'sky';
  }
  if (sy < WATER_TOP) {
    live.echo = { fx, fy: sy, at: t };
    return 'mountain';
  }
  if (sy < WATER_END) {
    live.splashes.push({ fx, fy: sy, at: t });
    live.waterPokes++;
    if (live.waterPokes % FISH_EVERY !== 0 || during(live.fish?.at, FISH_MS, t)) return 'water';
    const dir = fx > 0.5 ? -1 : 1;
    live.fish = { fx, fy: sy, at: t, dir };
    live.splashes.push({ fx: fx + dir * FISH_REACH, fy: sy, at: t + FISH_MS });
    return 'fish';
  }
  live.flowers.push({ fx, fy: Math.max(sy, WATER_END + 0.07), at: t, colour: live.flowers.length });
  if (live.flowers.length > MAX_FLOWERS) live.flowers.shift();
  return 'meadow';
}

/** How far a fish flies, as a fraction of the width. */
const FISH_REACH = 0.16;

/* ---------- painting ---------- */

/** Paints the wallpaper, clipped to its own rectangle so nothing drifts off the screen. */
export function paintWallpaper(g: G, x: number, y: number, w: number, h: number, look: WallpaperLook = {}): void {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  paintInside(g, x, y, w, h, look);
  g.restore();
}

function paintInside(g: G, x: number, y: number, w: number, h: number, look: WallpaperLook): void {
  const t = look.t ?? 0;
  /** The clock for what moves on its own; frozen when the player asked for less motion. */
  const amb = look.still ? 0 : t;
  const live = look.live;
  const night = live ? live.night : look.night === true;
  const drive = look.drive === true;
  const L = layout(w, h, look.taskbar !== false, look.bar);
  if (live) live.geo = { w, h, taskbar: look.taskbar !== false, drive, bar: look.bar };
  const P = night ? NIGHT : DAY;
  const { u, sceneH, taskbar } = L;
  const X = (f: number): number => x + Math.round(f * w);
  const W = (f: number): number => Math.max(1, Math.round(f * w));
  const S = (f: number): number => y + Math.round(f * sceneH);
  /** How far into something we are, 0..1, or -1 when it is not happening. */
  const age = (at: number | undefined, ms: number): number => (t > 0 && during(at, ms, t) ? (t - at) / ms : -1);

  // Sky in bands, lighter towards the horizon.
  P.sky.forEach((colour, i) => px(g, colour, x, S((i / P.sky.length) * 0.55), w, Math.ceil(sceneH * (0.55 / P.sky.length)) + 1));

  // Stars at night, twinkling one by one.
  if (night) {
    for (let i = 0; i < 24; i++) {
      const sx0 = x + ((i * 53) % w);
      const sy0 = S(((i * 29) % 50) / 100);
      const on = (Math.floor(amb / 400) + i * 3) % 7 !== 0;
      if (on) px(g, i % 4 ? '#e8ecff' : '#fff3b0', sx0, sy0, 1, 1);
    }
  }

  // The sun by day, the moon by night, each with a face you only see if you look for it.
  // A click makes the sun beam and the moon wink.
  const sr = L.sun.r;
  const sx = x + L.sun.cx;
  const sy = y + L.sun.cy;
  const smile = age(live?.smileAt, SMILE_MS) >= 0;
  if (night) {
    px(g, '#e8ecf6', sx - sr + 1, sy - sr + 1, sr * 2, sr * 2);
    px(g, '#e8ecf6', sx - sr, sy - sr + 2, sr * 2 + 2, sr * 2 - 2);
    px(g, '#d5dbea', sx + Math.round(sr / 3), sy - sr + 2, 2, 1);
    px(g, '#d5dbea', sx - sr + 2, sy + sr - 2, 2, 1);
  } else {
    const ray = (smile ? 1 : 0) + (Math.floor(amb / (smile ? 200 : 600)) % 2);
    px(g, '#fff3b0', sx - sr - 2 - ray, sy - 1, sr * 2 + 6 + ray * 2, 3);
    px(g, '#fff3b0', sx, sy - sr - 2 - ray, 3, sr * 2 + 6 + ray * 2);
    px(g, '#ffd23f', sx - sr + 1, sy - sr + 1, sr * 2, sr * 2);
    px(g, '#ffd23f', sx - sr, sy - sr + 2, sr * 2 + 2, sr * 2 - 2);
    px(g, '#ffe680', sx - sr + 2, sy - sr + 2, Math.max(1, sr - 1), Math.max(1, sr - 2));
  }
  {
    const face = night ? '#8a93c8' : '#d9941a';
    const e = Math.max(1, Math.round(sr / 4));
    const eyeY = sy - Math.max(1, Math.round(sr / 3));
    const left = sx - Math.round(sr / 2);
    const right = sx + Math.round(sr / 2) + 1;
    const mouthY = sy + Math.round(sr / 2);
    const half = Math.max(1, Math.round(sr / 2));
    if (smile) {
      // happy eyes and a wide smile with turned-up corners, and rosy cheeks
      if (night) {
        px(g, face, left - e + 1, eyeY, e + 1, 1); // the wink
        px(g, face, right, eyeY - e + 1, e, e);
      } else {
        px(g, face, left - 1, eyeY, 1, 1);
        px(g, face, left, eyeY - 1, e, 1);
        px(g, face, left + e, eyeY, 1, 1);
        px(g, face, right - 1, eyeY, 1, 1);
        px(g, face, right, eyeY - 1, e, 1);
        px(g, face, right + e, eyeY, 1, 1);
      }
      // a broad open grin: corners up, a dark mouth, a pink tongue in it
      px(g, face, sx - half, mouthY - 2, 1, 1);
      px(g, face, sx + half + 1, mouthY - 2, 1, 1);
      px(g, face, sx - half, mouthY - 1, half * 2 + 2, 1);
      px(g, face, sx - half + 1, mouthY, half * 2, 1);
      px(g, night ? '#c98aa8' : '#ff7a6a', sx - half + 2, mouthY, Math.max(1, half * 2 - 2), 1);
      px(g, face, sx - half + 2, mouthY + 1, Math.max(1, half * 2 - 2), 1);
      px(g, night ? '#f4c6d6' : '#ff9a7a', sx - sr + 1, eyeY + 2, Math.max(1, e), 1);
      px(g, night ? '#f4c6d6' : '#ff9a7a', sx + sr - e + 1, eyeY + 2, Math.max(1, e), 1);
    } else {
      px(g, face, left, eyeY, e, e);
      px(g, face, right, eyeY, e, e);
      px(g, face, sx - half + 2, mouthY, Math.max(2, half * 2 - 2), 1);
    }
  }

  // Clouds drifting across and wrapping round; one parks in front of the sun when things turn gloomy.
  const cs = Math.max(1, Math.round(w / 60));
  const cloudW = cs * 5;
  const cloud = (cx: number, cy: number, size: number, top: string = P.cloud, low: string = P.cloudLo): void => {
    px(g, top, cx + size, cy - size, size * 2, size);
    px(g, top, cx, cy, size * 5, size);
    px(g, low, cx, cy + size, size * 5, Math.max(1, Math.round(size / 2)));
  };
  const drift = (start: number, speed: number): number => x - cloudW + ((start * w + amb * speed) % (w + cloudW));
  cloud(drift(0.1, 0.002), S(0.1), cs);
  cloud(drift(0.55, 0.0013), S(0.3), cs);
  if (look.gloomy && !night) cloud(sx - sr - cs * 2, sy - cs, cs + 1);

  // A click into the sky: by day a little cloud comes and rains, by night a star falls.
  if (live?.weather) {
    const mark = live.weather;
    const mx = x + Math.round(mark.fx * w);
    const my = S(mark.fy);
    const rain = night ? -1 : age(mark.at, RAIN_MS);
    const star = night ? age(mark.at, STAR_MS) : -1;
    if (rain >= 0) {
      const ground = S(Math.min(ridgeTop(0.58, FAR, mark.fx), ridgeTop(0.6, NEAR, mark.fx)));
      const cy = Math.max(y + cs * 2, my);
      for (let i = 0; i < 5; i++) {
        const fall = ((t - mark.at) * 0.03 + i * 7) % Math.max(4, ground - cy);
        if (rain > 0.85 && fall < (ground - cy) * 0.5) continue;
        px(g, P.drop, mx - cs * 2 + i * cs + (i % 2), cy + cs * 2 + fall, 1, 2 * u);
      }
      cloud(mx - Math.round(cloudW / 2), cy, cs, '#c3cedd', '#9eabc0');
    }
    if (star >= 0) {
      const len = Math.round(w * 0.22);
      const hx = mx - Math.round(star * len);
      const hy = my + Math.round(star * len * 0.5);
      for (let i = 0; i < 6 * u; i++) {
        g.globalAlpha = Math.max(0, 1 - i / (6 * u)) * (1 - star * 0.5);
        px(g, '#fff3b0', hx + i * 2, hy - i, 2, 1);
      }
      g.globalAlpha = 1;
      px(g, '#ffffff', hx - u, hy, 2 * u, u);
    }
  }

  // A few birds crossing now and then (by day).
  if (!night && amb) {
    for (let i = 0; i < 2; i++) {
      const span = w + 30;
      const bx = x + w + 10 - ((amb * 0.008 + i * 70) % span);
      const by = S(0.36 + i * 0.06) + Math.round(Math.sin(amb / 500 + i) * 2);
      const up = Math.floor(amb / 200 + i) % 2 === 0 ? -1 : 0;
      px(g, P.bird, bx, by + up, 2, 1);
      px(g, P.bird, bx + 2, by - 1, 1, 1);
      px(g, P.bird, bx + 3, by + up, 2, 1);
    }
  }

  // Mountains, far and violet, then nearer and blue-green.
  const ridge = (fromY: number, peaks: readonly [number, number][], colour: string, snow?: string): void => {
    for (let i = 0; i < w; i++) {
      const top = ridgeTop(fromY, peaks, i / w);
      const ty = S(top);
      px(g, colour, x + i, ty, 1, S(WATER_TOP) - ty);
      if (snow && top < fromY - 0.17) px(g, snow, x + i, ty, 1, Math.max(1, Math.round(sceneH * 0.03)));
    }
  };
  ridge(0.58, FAR, P.far, P.farSnow);
  ridge(0.6, NEAR, P.near);

  // A click on the mountains comes back as an echo: rings spreading from the spot.
  const echo = age(live?.echo?.at, ECHO_MS);
  if (live?.echo && echo >= 0) {
    const ex = x + Math.round(live.echo.fx * w);
    const ey = S(live.echo.fy);
    for (let ring = 0; ring < 3; ring++) {
      const grow = echo - ring * 0.18;
      if (grow <= 0) continue;
      const radius = grow * 11 * u;
      g.globalAlpha = Math.max(0, 0.9 - grow);
      const steps = Math.max(12, Math.round(radius * 4));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        // only the sides of each ring, like the marks round a shout
        if (Math.abs(Math.sin(a)) > 0.75) continue;
        px(g, '#ffffff', ex + Math.cos(a) * radius, ey + Math.sin(a) * radius * 0.8, u, u);
      }
    }
    g.globalAlpha = 1;
  }

  // A lake with the sky in it, and glitter that runs across it.
  px(g, P.lake, x, S(WATER_TOP), w, S(WATER_END) - S(WATER_TOP));
  px(g, P.lakeHi, x, S(WATER_TOP), w, 1);
  for (let i = 0; i < 7; i++) {
    const gx = x + ((i * 0.15 * w + amb * 0.004 * (i % 2 ? 1 : -0.6)) % w + w) % w;
    if ((Math.floor(amb / 300) + i) % 4 === 0) continue;
    px(g, P.glitter, gx, S(0.66 + (i % 3) * 0.04), W(0.05), 1);
  }
  // the sun's (or moon's) reflection
  px(g, night ? '#e8ecf6' : '#ffe680', sx - 1, S(0.66), 3, 1);
  px(g, night ? '#e8ecf6' : '#ffe680', sx, S(0.7), 2, 1);

  // Splashes: a ring running outwards on the water and drops thrown up from it.
  if (live && t > 0) {
    for (const splash of live.splashes) {
      const a = age(splash.at, SPLASH_MS);
      if (a < 0) continue;
      const cx = x + Math.round(splash.fx * w);
      const cy = S(splash.fy);
      const reach = Math.round(a * 6 * u) + u;
      g.globalAlpha = 1 - a * 0.7;
      px(g, '#ffffff', cx - reach - u, cy, 2 * u, u);
      px(g, '#ffffff', cx + reach, cy, 2 * u, u);
      g.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        const spread = (i - 2) * 1.6 * u;
        const up = Math.sin(a * Math.PI) * (5 + (i % 2) * 2) * u;
        if (a > 0.92) continue;
        px(g, i % 2 ? '#ffffff' : P.glitter, cx + spread * (0.4 + a), cy - up, u, u);
      }
    }
    // Now and then a fish jumps where the water was poked.
    const fish = live.fish;
    const a = age(fish?.at, FISH_MS);
    if (fish && a >= 0) {
      const fxPx = x + Math.round((fish.fx + fish.dir * FISH_REACH * a) * w);
      const top = Math.sin(a * Math.PI) * sceneH * 0.3;
      const fyPx = S(fish.fy) - Math.round(top);
      // nose up on the way up, nose down on the way down
      const tilt = Math.cos(a * Math.PI);
      for (let col = 0; col < 6; col++) {
        const along = (col - 2.5) * fish.dir;
        const cx = fxPx + Math.round(along * u);
        const cy = fyPx - Math.round(along * tilt * 0.7 * u * fish.dir) * fish.dir;
        const tail = col === 0;
        const head = col >= 4;
        px(g, tail ? '#e0702a' : '#ff9a3c', cx, cy - (tail ? u : 0), u, tail ? 3 * u : col === 1 ? u : 2 * u);
        if (!tail && col > 1) px(g, '#ffd08a', cx, cy + u, u, u);
        if (head && col === 4) px(g, '#3b2a20', cx, cy, u, u);
      }
    }
  }

  // Meadow in front, with a tree swaying a little and flowers.
  px(g, P.meadow, x, S(WATER_END), w, sceneH - (S(WATER_END) - y));
  px(g, P.meadowHi, x, S(WATER_END), w, 1);
  const shake = age(live?.leavesAt, LEAVES_MS);
  const swayBy = Math.max(1, Math.round(w / 120));
  const sway = !amb ? 0 : shake >= 0 && shake < 0.35 ? Math.round(Math.sin(t / 45) * swayBy) : Math.round(Math.sin(t / 900) * swayBy);
  px(g, P.trunk, x + L.trunk.x, y + L.trunk.y, L.trunk.w, L.trunk.h);
  const { crown } = L;
  for (let row = -crown.ry; row <= crown.ry; row++) {
    const half = Math.round(crown.rx * Math.sqrt(Math.max(0, 1 - (row / (crown.ry + 0.5)) ** 2)));
    if (half <= 0) continue;
    const lean = Math.round(sway * (1 - (row + crown.ry) / (crown.ry * 2)));
    px(g, P.leaves, x + crown.cx - half + lean, y + crown.cy + row, half * 2 + 1, 1);
    if (row < 0 && row > -crown.ry + 1) px(g, P.leavesHi, x + crown.cx - half + lean + 1, y + crown.cy + row, Math.max(1, Math.round(half * 0.7)), 1);
  }
  // an owl opens its eyes when the tree is shaken at night
  if (night && shake >= 0 && Math.floor(shake * 10) % 4 !== 3) {
    px(g, '#ffe680', x + crown.cx - u - 1, y + crown.cy, u, u);
    px(g, '#ffe680', x + crown.cx + u, y + crown.cy, u, u);
  }
  if (shake >= 0) {
    for (let i = 0; i < 6; i++) {
      const start = i * 0.07;
      if (shake < start) continue;
      const fall = Math.min(1, (shake - start) / 0.75);
      const lx = x + crown.cx + (i - 2.5) * (crown.rx / 3) + Math.sin(shake * 14 + i * 2) * 2 * u;
      const ly = y + crown.cy + (S(0.93) - y - crown.cy) * fall;
      if (shake > 0.9) continue;
      px(g, i % 2 ? P.leavesHi : '#e0a83c', lx, ly, u, u);
    }
  }
  const petals = night ? FLOWER_NIGHT : FLOWER_DAY;
  for (let i = 0; i < 7; i++) px(g, petals[i % 2] ?? '#ffffff', X(0.08 + i * 0.12), S(0.88 + (i % 3) * 0.03), 1, 1);
  // flowers the player planted by clicking into the grass
  if (live) {
    for (const flower of live.flowers) {
      const grown = t > 0 && t >= flower.at && t - flower.at < 320 ? (t - flower.at) / 320 : 1;
      const fxPx = x + Math.round(flower.fx * w);
      const base = Math.min(S(flower.fy), y + sceneH - 1);
      const stem = Math.max(1, Math.round(3 * u * Math.min(1, grown * 1.6)));
      px(g, P.stem, fxPx, base - stem, u, stem);
      if (grown < 0.5) continue;
      const colour = petals[flower.colour % petals.length] ?? '#ffffff';
      const hy = base - stem - 2 * u;
      px(g, colour, fxPx - u, hy + u, 3 * u, u);
      px(g, colour, fxPx, hy, u, 3 * u);
      px(g, night ? '#9a8a4a' : '#ffb347', fxPx, hy + u, u, u);
    }
  }
  // fireflies at night
  if (night && amb) {
    for (let i = 0; i < 5; i++) {
      if ((Math.floor(amb / 250) + i) % 3 === 0) continue;
      px(g, '#ffe680', X(0.2 + i * 0.15) + Math.round(Math.sin(amb / 700 + i) * 3), S(0.84 + (i % 2) * 0.05), 1, 1);
    }
  }

  // Desktop icons: the usual ones down the left, three old programs next to them.
  const poked = live?.icon;
  const iconAge = age(poked?.at, ICON_MS);
  for (const slot of ICON_SLOTS) {
    if (slot.id === 'drive' && !drive) continue;
    const r = iconRect(L, slot.col, slot.row);
    const ix = x + r.x;
    const iy = y + r.y;
    const mine = poked?.id === slot.id && iconAge >= 0;
    const picture = ICONS[slot.id];
    // a pressed icon dips for a moment
    const dip = mine && iconAge < 0.1 ? u : 0;
    paintGrid(g, picture.rows, picture.palette, ix, iy + dip, u);
    if (slot.id === 'bin') {
      const hop = mine ? Math.round(Math.sin(Math.min(1, iconAge / 0.4) * Math.PI) * 3 * u) : 0;
      paintGrid(g, BIN_LID, picture.palette, ix, iy - hop, u);
    }
    // the label under it
    px(g, '#ffffff', ix, iy + r.h + u, r.w, u);
    // an old program only flashes: it will never start
    if (mine && slot.id.startsWith('retro') && iconAge < 0.3 && Math.floor(iconAge * 20) % 2 === 0) {
      g.globalAlpha = 0.7;
      px(g, '#ffffff', ix, iy, r.w, r.h);
      g.globalAlpha = 1;
    }
  }
  if (poked && iconAge >= 0) {
    const slot = ICON_SLOTS.find((s) => s.id === poked.id);
    const r = slot ? iconRect(L, slot.col, slot.row) : undefined;
    if (r && poked.id === 'folder') {
      // a tiny window pops open next to the folder and closes again
      const open = Math.min(1, iconAge / 0.12, (1 - iconAge) / 0.12);
      const ww = Math.round(17 * u * open);
      const wh = Math.round(12 * u * open);
      if (ww > 2 * u && wh > 2 * u) {
        const wx = x + r.x + r.w + u;
        const wy = y + r.y + u;
        px(g, '#4b1528', wx - 1, wy - 1, ww + 2, wh + 2);
        px(g, '#ffffff', wx, wy, ww, wh);
        px(g, '#3a6fb0', wx, wy, ww, Math.min(wh, 2 * u));
        px(g, '#ed93b1', wx + ww - 2 * u, wy, Math.min(2 * u, ww), Math.min(wh, 2 * u));
        if (open >= 1) {
          px(g, '#ffd23f', wx + 2 * u, wy + 4 * u, 3 * u, 2 * u);
          px(g, '#c9cfe0', wx + 6 * u, wy + 4 * u, 8 * u, u);
          px(g, '#ed93b1', wx + 2 * u, wy + 8 * u, 3 * u, 2 * u);
          px(g, '#c9cfe0', wx + 6 * u, wy + 8 * u, 6 * u, u);
        }
      }
    }
    if (r && poked.id === 'bin' && iconAge < 0.8) {
      // a paper ball hops out, bounces once and is gone
      const a = iconAge / 0.8;
      const bx = x + r.x + 3 * u + a * 12 * u;
      const first = a < 0.6;
      const b = first ? a / 0.6 : (a - 0.6) / 0.4;
      const by = y + r.y + r.h - 2 * u - Math.sin(b * Math.PI) * (first ? 9 : 3) * u + (first ? b * 2 * u - 2 * u : 0);
      px(g, '#ffffff', bx, by, 2 * u, 2 * u);
      px(g, '#b3bdd0', bx + u, by + u, u, u);
    }
    if (r && poked.id === 'drive') {
      // hearts float up from the drive
      for (let i = 0; i < 3; i++) {
        const a = iconAge * 1.3 - i * 0.15;
        if (a <= 0 || a >= 1) continue;
        g.globalAlpha = Math.min(1, (1 - a) * 2);
        const hx = x + r.x + r.w + (i - 1) * 2 * u + Math.round(Math.sin(a * 6 + i) * u);
        paintGrid(g, HEART, { w: i === 1 ? '#ffffff' : '#ff8fb8' }, hx, y + r.y + 2 * u - a * 11 * u, u);
        g.globalAlpha = 1;
      }
    }
  }

  // The day and night switch, bottom right.
  {
    const r = L.toggle;
    const tx = x + r.x;
    const ty = y + r.y;
    const flick = age(live?.switchAt, 160);
    const edge = '#4b1528';
    px(g, edge, tx + u, ty, r.w - 2 * u, r.h);
    px(g, edge, tx, ty + u, r.w, r.h - 2 * u);
    px(g, night ? '#283462' : '#bfe6f5', tx + u, ty + u, r.w - 2 * u, r.h - 2 * u);
    const travel = r.w - 6 * u;
    const at = flick >= 0 ? (night ? flick : 1 - flick) : night ? 1 : 0;
    const kx = tx + u + Math.round(travel * at);
    if (night) {
      px(g, '#fff3b0', tx + 2 * u, ty + 2 * u, u, u);
      px(g, '#e8ecff', tx + 4 * u, ty + 3 * u, u, u);
    } else {
      px(g, '#ffffff', tx + r.w - 5 * u, ty + 2 * u, 3 * u, u);
      px(g, '#ffffff', tx + r.w - 4 * u, ty + 3 * u, 2 * u, u);
    }
    px(g, night ? '#e8ecf6' : '#ffd23f', kx, ty + u, 4 * u, 4 * u);
    px(g, night ? '#ffffff' : '#ffe680', kx, ty + u, 2 * u, u);
    px(g, night ? '#c9cfe0' : '#e8a91a', kx, ty + 4 * u, 4 * u, u);
  }

  // Taskbar: a start button and the real time.
  if (!taskbar) return;
  const ty = y + sceneH;
  px(g, '#3a6fb0', x, ty, w, taskbar);
  px(g, '#5a8fd0', x, ty, w, 1);
  const pressed = age(live?.startAt, PRESS_MS);
  const st = L.start;
  px(g, pressed >= 0 && pressed < 0.4 ? '#3f9f80' : '#5dcaa5', x + st.x, y + st.y, st.w, st.h);
  px(g, '#ffffff', x + st.x + 2, y + st.y + Math.floor(st.h / 2) - 1, 1, 1);
  px(g, '#ffffff', x + st.x + 4, y + st.y + Math.floor(st.h / 2) - 1, 1, 1);
  px(g, '#ffffff', x + st.x + 2, y + st.y + Math.floor(st.h / 2), 3, 1);
  px(g, '#ffffff', x + st.x + 3, y + st.y + Math.floor(st.h / 2) + 1, 1, 1);
  if (pressed >= 0) {
    // a heart pops out of the start button
    g.globalAlpha = 1 - pressed;
    paintGrid(g, HEART, { w: '#ff8fb8' }, x + st.x + Math.round(st.w / 2), ty - 2 * u - pressed * 8 * u, u);
    g.globalAlpha = 1;
  }
  const ck = L.clock;
  const lit = age(live?.clockAt, PRESS_MS) >= 0;
  px(g, lit ? '#ffffff' : '#2c5a92', x + ck.x, y + ck.y, ck.w, ck.h);
  const text = look.clock;
  if (!text) {
    px(g, '#ffffff', x + ck.x + 2, y + ck.y + Math.floor(ck.h / 2), ck.w - 4, 1);
    return;
  }
  const { du } = L;
  let cx = x + ck.x + ck.w - 2 * du - clockWidth(text, du);
  const cy = y + ck.y + Math.floor((ck.h - 5 * du) / 2);
  for (const char of text) {
    const rows = DIGITS[char];
    if (!rows) continue;
    // the colon blinks with the seconds
    const hidden = char === ':' && amb > 0 && Math.floor(amb / 500) % 2 === 1;
    if (!hidden) paintGrid(g, rows, { '#': lit ? '#2c5a92' : '#ffffff' }, cx, cy, du);
    cx += ((rows[0]?.length ?? 3) + 1) * du;
  }
}

/** The real local time as the taskbar shows it. */
export function wallClock(now: Date = new Date()): string {
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}
