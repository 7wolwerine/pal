import { px } from './stage.ts';

type G = CanvasRenderingContext2D;

/**
 * The computer's desktop wallpaper: a lake under mountains, a few desktop
 * icons and a taskbar. By day the sun has the faintest of faces; by night the
 * moon does, and stars come out. Clouds drift, birds cross, the water
 * glitters and the tree sways. Drawn at any size; coordinates are
 * proportions of the area, and nothing is ever drawn outside it.
 */
export interface WallpaperLook {
  /** The sun slides behind a cloud while the player is refusing. */
  readonly gloomy?: boolean;
  /** Shows the new drive's icon on the desktop. */
  readonly drive?: boolean;
  /** Leave the taskbar out (the page draws its own). */
  readonly taskbar?: boolean;
  /** Night: dark sky, the moon, stars. */
  readonly night?: boolean;
  /** Milliseconds, for everything that moves; 0 keeps it all still. */
  readonly t?: number;
}

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
};

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
  const P = look.night ? NIGHT : DAY;
  const X = (f: number): number => x + Math.round(f * w);
  const W = (f: number): number => Math.max(1, Math.round(f * w));
  const H = (f: number): number => Math.max(1, Math.round(f * h));
  const taskbar = look.taskbar === false ? 0 : Math.max(4, Math.round(h * 0.1));
  const sceneH = h - taskbar;
  const S = (f: number): number => y + Math.round(f * sceneH);

  // Sky in bands, lighter towards the horizon.
  P.sky.forEach((colour, i) => px(g, colour, x, S((i / P.sky.length) * 0.55), w, Math.ceil(sceneH * (0.55 / P.sky.length)) + 1));

  // Stars at night, twinkling one by one.
  if (look.night) {
    for (let i = 0; i < 24; i++) {
      const sx0 = x + ((i * 53) % w);
      const sy0 = S(((i * 29) % 50) / 100);
      const on = (Math.floor(t / 400) + i * 3) % 7 !== 0;
      if (on) px(g, i % 4 ? '#e8ecff' : '#fff3b0', sx0, sy0, 1, 1);
    }
  }

  // The sun by day, the moon by night, each with a face you only see if you look for it.
  const sr = Math.max(3, Math.round(Math.min(w, sceneH) * 0.09));
  const sx = X(0.78);
  const sy = S(0.18);
  if (look.night) {
    px(g, '#e8ecf6', sx - sr + 1, sy - sr + 1, sr * 2, sr * 2);
    px(g, '#e8ecf6', sx - sr, sy - sr + 2, sr * 2 + 2, sr * 2 - 2);
    px(g, '#c9cfe0', sx - Math.round(sr / 2), sy + Math.round(sr / 3), 2, 2);
    px(g, '#c9cfe0', sx + Math.round(sr / 3), sy - Math.round(sr / 2), 2, 1);
  } else {
    const ray = Math.floor(t / 600) % 2;
    px(g, '#fff3b0', sx - sr - 2 - ray, sy - 1, sr * 2 + 5 + ray * 2, 3);
    px(g, '#fff3b0', sx, sy - sr - 2 - ray, 3, sr * 2 + 5 + ray * 2);
    px(g, '#ffd23f', sx - sr + 1, sy - sr + 1, sr * 2, sr * 2);
    px(g, '#ffd23f', sx - sr, sy - sr + 2, sr * 2 + 2, sr * 2 - 2);
    px(g, '#ffe680', sx - sr + 2, sy - sr + 2, Math.max(1, sr - 1), Math.max(1, sr - 1));
  }
  const face = look.night ? '#c9cfe0' : '#f5c63a';
  const e = Math.max(1, Math.round(sr / 4));
  px(g, face, sx - Math.round(sr / 2), sy - Math.round(sr / 4), e, e);
  px(g, face, sx + Math.round(sr / 2), sy - Math.round(sr / 4), e, e);
  px(g, face, sx - Math.round(sr / 3), sy + Math.round(sr / 2), Math.max(2, Math.round(sr * 0.75)), 1);

  // Clouds drifting across and wrapping round; one parks in front of the sun when things turn gloomy.
  const cs = Math.max(1, Math.round(w / 60));
  const cloudW = cs * 5;
  const cloud = (cx: number, cy: number, size: number): void => {
    px(g, P.cloud, cx + size, cy - size, size * 2, size);
    px(g, P.cloud, cx, cy, size * 5, size);
    px(g, P.cloudLo, cx, cy + size, size * 5, Math.max(1, Math.round(size / 2)));
  };
  const drift = (start: number, speed: number): number => x - cloudW + ((start * w + t * speed) % (w + cloudW));
  cloud(drift(0.1, 0.002), S(0.12), cs);
  cloud(drift(0.55, 0.0013), S(0.26), cs);
  if (look.gloomy && !look.night) cloud(sx - sr - cs * 2, sy - cs, cs + 1);

  // A few birds crossing now and then (by day).
  if (!look.night && t) {
    for (let i = 0; i < 2; i++) {
      const span = w + 30;
      const bx = x + w + 10 - ((t * 0.008 + i * 70) % span);
      const by = S(0.32 + i * 0.06) + Math.round(Math.sin(t / 500 + i) * 2);
      const up = Math.floor(t / 200 + i) % 2 === 0 ? -1 : 0;
      px(g, P.bird, bx, by + up, 2, 1);
      px(g, P.bird, bx + 2, by - 1, 1, 1);
      px(g, P.bird, bx + 3, by + up, 2, 1);
    }
  }

  // Mountains, far and violet, then nearer and blue-green.
  const ridge = (fromY: number, peaks: readonly [number, number][], colour: string, snow?: string): void => {
    for (let i = 0; i < w; i++) {
      const fx = i / w;
      let top = 1;
      for (const [pxf, ph] of peaks) top = Math.min(top, fromY - ph * Math.max(0, 1 - Math.abs(fx - pxf) * 4));
      const ty = S(top);
      px(g, colour, x + i, ty, 1, S(0.62) - ty);
      if (snow && top < fromY - 0.17) px(g, snow, x + i, ty, 1, Math.max(1, Math.round(sceneH * 0.03)));
    }
  };
  ridge(0.58, [[0.15, 0.22], [0.42, 0.3], [0.7, 0.2]], P.far, P.farSnow);
  ridge(0.6, [[0.28, 0.14], [0.58, 0.18], [0.92, 0.12]], P.near);

  // A lake with the sky in it, and glitter that runs across it.
  px(g, P.lake, x, S(0.62), w, S(0.8) - S(0.62));
  px(g, P.lakeHi, x, S(0.62), w, 1);
  for (let i = 0; i < 7; i++) {
    const gx = x + ((i * 0.15 * w + t * 0.004 * (i % 2 ? 1 : -0.6)) % w + w) % w;
    if ((Math.floor(t / 300) + i) % 4 === 0) continue;
    px(g, P.glitter, gx, S(0.66 + (i % 3) * 0.04), W(0.05), 1);
  }
  // the sun's (or moon's) reflection
  px(g, look.night ? '#e8ecf6' : '#ffe680', sx - 1, S(0.66), 3, 1);
  px(g, look.night ? '#e8ecf6' : '#ffe680', sx, S(0.7), 2, 1);

  // Meadow in front, with a tree swaying a little and flowers.
  px(g, P.meadow, x, S(0.8), w, sceneH - (S(0.8) - y));
  px(g, P.meadowHi, x, S(0.8), w, 1);
  const sway = t ? Math.round(Math.sin(t / 900) * Math.max(1, w / 120)) : 0;
  px(g, P.trunk, X(0.86), S(0.62), W(0.02) + 1, S(0.84) - S(0.62));
  px(g, P.leaves, X(0.81) + sway, S(0.46), W(0.12), S(0.64) - S(0.46));
  px(g, P.leavesHi, X(0.83) + sway, S(0.48), W(0.05), H(0.04));
  for (let i = 0; i < 7; i++) px(g, look.night ? '#3a5a4a' : i % 2 ? '#ed93b1' : '#ffffff', X(0.08 + i * 0.12), S(0.88 + (i % 3) * 0.03), 1, 1);
  // fireflies at night
  if (look.night && t) {
    for (let i = 0; i < 5; i++) {
      if ((Math.floor(t / 250) + i) % 3 === 0) continue;
      px(g, '#ffe680', X(0.2 + i * 0.15) + Math.round(Math.sin(t / 700 + i) * 3), S(0.84 + (i % 2) * 0.05), 1, 1);
    }
  }

  // Desktop icons down the left side.
  const icon = (row: number, body: string, edge: string): void => {
    const iy = S(0.06 + row * 0.2);
    const ix = X(0.04);
    const s = Math.max(4, Math.round(w * 0.06));
    px(g, edge, ix - 1, iy - 1, s + 2, s + 2);
    px(g, body, ix, iy, s, s);
    px(g, '#ffffff', ix - 1, iy + s + 2, s + 2, 1);
  };
  icon(0, '#ffd23f', '#c99a1a'); // folder
  icon(1, '#d9e2ee', '#8a93a8'); // bin
  if (look.drive) icon(2, '#ed93b1', '#d4537e'); // the new drive

  // Taskbar.
  if (!taskbar) return;
  const ty = y + h - taskbar;
  px(g, '#3a6fb0', x, ty, w, taskbar);
  px(g, '#5a8fd0', x, ty, w, 1);
  px(g, '#5dcaa5', x + 1, ty + 1, Math.max(5, Math.round(w * 0.1)), taskbar - 2);
  px(g, '#2c5a92', x + w - Math.max(8, Math.round(w * 0.14)), ty + 1, Math.max(7, Math.round(w * 0.13)), taskbar - 2);
  px(g, '#ffffff', x + w - Math.max(7, Math.round(w * 0.12)), ty + Math.floor(taskbar / 2), Math.max(4, Math.round(w * 0.08)), 1);
}
