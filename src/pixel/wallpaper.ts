import { px } from './stage.ts';

type G = CanvasRenderingContext2D;

/**
 * The computer's desktop wallpaper: a lake under mountains on a sunny day,
 * a few desktop icons and a taskbar. The sun has the faintest of faces —
 * two slightly darker dots and a smile you only see if you look for it.
 * Drawn at any size; coordinates are proportions of the area.
 */
export interface WallpaperLook {
  /** The sun slides behind a cloud while the player is refusing. */
  readonly gloomy?: boolean;
  /** Shows the new drive's icon on the desktop. */
  readonly drive?: boolean;
  /** Milliseconds, for drifting clouds; 0 keeps everything still. */
  readonly t?: number;
}

export function paintWallpaper(g: G, x: number, y: number, w: number, h: number, look: WallpaperLook = {}): void {
  const t = look.t ?? 0;
  const X = (f: number): number => x + Math.round(f * w);
  const W = (f: number): number => Math.max(1, Math.round(f * w));
  const H = (f: number): number => Math.max(1, Math.round(f * h));
  const taskbar = Math.max(4, Math.round(h * 0.1));
  const sceneH = h - taskbar;
  const S = (f: number): number => y + Math.round(f * sceneH);

  // Sky in bands, lighter towards the horizon.
  const sky = ['#6fbfe6', '#7ec8ea', '#8fd0ee', '#a3daf1', '#b8e3f4', '#cdebf6'];
  sky.forEach((colour, i) => px(g, colour, x, S((i / sky.length) * 0.55), w, Math.ceil(sceneH * (0.55 / sky.length)) + 1));

  // The sun, upper right, with short rays.
  const sr = Math.max(3, Math.round(Math.min(w, sceneH) * 0.09));
  const sx = X(0.78);
  const sy = S(0.18);
  px(g, '#fff3b0', sx - sr - 2, sy - 1, sr * 2 + 5, 3);
  px(g, '#fff3b0', sx, sy - sr - 2, 3, sr * 2 + 5);
  px(g, '#ffd23f', sx - sr + 1, sy - sr + 1, sr * 2, sr * 2);
  px(g, '#ffd23f', sx - sr, sy - sr + 2, sr * 2 + 2, sr * 2 - 2);
  px(g, '#ffe680', sx - sr + 2, sy - sr + 2, Math.max(1, sr - 1), Math.max(1, sr - 1));
  // the barely-there face
  const face = '#f5c63a';
  const e = Math.max(1, Math.round(sr / 4));
  px(g, face, sx - Math.round(sr / 2), sy - Math.round(sr / 4), e, e);
  px(g, face, sx + Math.round(sr / 2), sy - Math.round(sr / 4), e, e);
  px(g, face, sx - Math.round(sr / 3), sy + Math.round(sr / 2), Math.max(2, Math.round(sr * 0.75)), 1);

  // Clouds drifting; one parks in front of the sun when things turn gloomy.
  const cloud = (cx: number, cy: number, size: number): void => {
    const c = '#ffffff';
    px(g, c, cx + size, cy - size, size * 2, size);
    px(g, c, cx, cy, size * 5, size);
    px(g, '#e9f4fa', cx, cy + size, size * 5, Math.max(1, Math.round(size / 2)));
  };
  const cs = Math.max(1, Math.round(w / 60));
  cloud(x + ((Math.round(w * 0.1 + t * 0.002) % (w + 20)) - 10), S(0.12), cs);
  cloud(x + ((Math.round(w * 0.45 + t * 0.0013) % (w + 20)) - 10), S(0.26), cs);
  if (look.gloomy) cloud(sx - sr - cs * 2, sy - cs, cs + 1);

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
  ridge(0.58, [[0.15, 0.22], [0.42, 0.3], [0.7, 0.2]], '#9aa6d6', '#f2f4ff');
  ridge(0.6, [[0.28, 0.14], [0.58, 0.18], [0.92, 0.12]], '#6f9fb8');

  // A lake with the sky in it, and a little shimmer.
  px(g, '#5aa9d6', x, S(0.62), w, S(0.8) - S(0.62));
  px(g, '#7cc0e6', x, S(0.62), w, 1);
  for (let i = 0; i < 6; i++) px(g, '#bfe6f5', X(0.1 + i * 0.15 + ((t / 4000) % 0.05)), S(0.67 + (i % 3) * 0.04), W(0.05), 1);
  // the sun's reflection
  px(g, '#ffe680', sx - 1, S(0.66), 3, 1);
  px(g, '#ffe680', sx, S(0.7), 2, 1);

  // Meadow in front, with a tree and flowers.
  px(g, '#7cc66b', x, S(0.8), w, sceneH - (S(0.8) - y));
  px(g, '#93d67f', x, S(0.8), w, 1);
  px(g, '#6a4a2e', X(0.86), S(0.62), W(0.02) + 1, S(0.84) - S(0.62));
  px(g, '#4fa25a', X(0.81), S(0.46), W(0.12), S(0.64) - S(0.46));
  px(g, '#6cc070', X(0.83), S(0.48), W(0.05), H(0.04));
  for (let i = 0; i < 7; i++) px(g, i % 2 ? '#ed93b1' : '#ffffff', X(0.08 + i * 0.12), S(0.88 + (i % 3) * 0.03), 1, 1);

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
  const ty = y + h - taskbar;
  px(g, '#3a6fb0', x, ty, w, taskbar);
  px(g, '#5a8fd0', x, ty, w, 1);
  px(g, '#5dcaa5', x + 1, ty + 1, Math.max(5, Math.round(w * 0.1)), taskbar - 2);
  px(g, '#2c5a92', x + w - Math.max(8, Math.round(w * 0.14)), ty + 1, Math.max(7, Math.round(w * 0.13)), taskbar - 2);
  px(g, '#ffffff', x + w - Math.max(7, Math.round(w * 0.12)), ty + Math.floor(taskbar / 2), Math.max(4, Math.round(w * 0.08)), 1);
}
