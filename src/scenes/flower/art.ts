import { paintGrid, progress, px, type Rect } from '../../pixel/stage.ts';
import { BLOOM_SIZE, DRIED_ROWS, FLOWER_PALETTE, bloomRows } from './sprites.ts';

type G = CanvasRenderingContext2D;

export const STAGE_W = 160;
export const STAGE_H = 100;

export const DOME_RECT: Rect = { x: 58, y: 12, w: 45, h: 68 };
export const CAN_RECT: Rect = { x: 104, y: 54, w: 36, h: 26 };
export const FLOWER_RECT: Rect = { x: 66, y: 32, w: 28, h: 34 };
/** Where the flower's speech bubble sits, in picture pixels. */
export const BUBBLE_RECT: Rect = { x: 96, y: 4, w: 62, h: 34 };

/** Base of the plant, on the soil in the pot. */
const PLANT_X = 80;
const SOIL_Y = 66;
export const TABLE_Y = 79;

/** How long the watering and the growing take, in ms. */
export const WATER_MS = 1300;
export const GROW_MS = 800;

export interface FlowerArt {
  readonly cracks: number;
  readonly shatterAt: number | undefined;
  readonly waterAt: number | undefined;
  /** True once it has bloomed: a soft glow and stars around it, for good. */
  readonly bloomed?: boolean;
  /** Where to twinkle a hint, if anywhere. */
  readonly hint?: 'dome' | 'can';
  readonly motion: boolean;
}

const BLOOM = bloomRows();

function noise(n: number): number {
  const s = Math.sin(n * 91.7) * 43758.5453;
  return s - Math.floor(s);
}

export function paintFlower(g: G, t: number, s: FlowerArt): void {
  paintRoom(g);
  if (s.bloomed) paintGlow(g, t, s.motion);
  paintPot(g);
  paintPlant(g, t, s);
  if (s.shatterAt === undefined) paintDome(g, s.cracks);
  else paintShards(g, t - s.shatterAt, s.motion);
  paintCan(g, t, s);
  if (s.bloomed && s.motion) paintStars(g, t);
  if (s.hint && s.motion) twinkle(g, s.hint === 'dome' ? 92 : 124, s.hint === 'dome' ? 24 : 60, t);
}

/** A soft pink glow behind the bloomed flower. */
function paintGlow(g: G, t: number, motion: boolean): void {
  const pulse = motion ? 0.06 * Math.sin(t / 500) : 0;
  for (let r = 22; r > 4; r -= 3) {
    g.globalAlpha = 0.05 + pulse * 0.3 + (22 - r) * 0.008;
    for (let y = -r; y <= r; y++) {
      const half = Math.round(Math.sqrt(r * r - y * y));
      px(g, '#ffd1e6', PLANT_X - half, 44 + y, half * 2, 1);
    }
  }
  g.globalAlpha = 1;
}

/** Little four-pointed stars drifting around the flower, for as long as it lives. */
function paintStars(g: G, t: number): void {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + t / 2400;
    const r = 16 + 4 * Math.sin(t / 700 + i);
    const x = Math.round(PLANT_X + Math.cos(a) * r);
    const y = Math.round(44 + Math.sin(a) * r * 0.75);
    const size = (Math.floor(t / 260) + i) % 3;
    const c = i % 3 === 0 ? '#ffd75e' : i % 3 === 1 ? '#ffffff' : '#ff9cc8';
    px(g, c, x, y - size, 1, size * 2 + 1);
    px(g, c, x - size, y, size * 2 + 1, 1);
  }
}

function twinkle(g: G, x: number, y: number, t: number): void {
  const cycle = t % 1400;
  if (cycle > 800) return;
  const size = cycle < 400 ? Math.round((cycle / 400) * 4) : Math.round(((800 - cycle) / 400) * 4);
  if (size <= 0) return;
  px(g, '#fff6c8', x, y - size, 1, size * 2 + 1);
  px(g, '#fff6c8', x - size, y, size * 2 + 1, 1);
  px(g, '#ffffff', x, y, 1, 1);
}

function paintRoom(g: G): void {
  px(g, '#f3e3f0', 0, 0, STAGE_W, TABLE_Y);
  for (let y = 4; y < TABLE_Y; y += 8) {
    for (let x = (y / 8) % 2 ? 4 : 0; x < STAGE_W; x += 8) px(g, '#ead3e6', x, y, 1, 1);
  }
  // The window with a bit of sky.
  px(g, '#ffffff', 8, 6, 50, 58);
  px(g, '#bfe6ff', 11, 9, 44, 26);
  px(g, '#e2f4ff', 11, 35, 44, 26);
  px(g, '#ffffff', 32, 9, 2, 52);
  px(g, '#ffffff', 11, 33, 44, 2);
  px(g, '#ffffff', 16, 15, 9, 2);
  px(g, '#ffffff', 18, 13, 4, 2);
  // Curtains.
  px(g, '#f5a9c8', 4, 4, 6, 64);
  px(g, '#e58db2', 8, 4, 2, 64);
  px(g, '#f5a9c8', 56, 4, 6, 64);
  px(g, '#e58db2', 56, 4, 2, 64);
  px(g, '#d98b40', 2, 3, 62, 2);
  // A little framed heart on the wall.
  px(g, '#d98b40', 120, 16, 20, 16);
  px(g, '#fff5fa', 122, 18, 16, 12);
  px(g, '#ff8fb8', 126, 21, 3, 2);
  px(g, '#ff8fb8', 131, 21, 3, 2);
  px(g, '#ff8fb8', 125, 22, 10, 2);
  px(g, '#ff8fb8', 126, 24, 8, 1);
  px(g, '#ff8fb8', 127, 25, 6, 1);
  px(g, '#ff8fb8', 128, 26, 4, 1);
  px(g, '#ff8fb8', 129, 27, 2, 1);
  px(g, '#8a5a3b', 129, 12, 2, 4);
  // The windowsill.
  px(g, '#c98f5e', 0, TABLE_Y, STAGE_W, 3);
  px(g, '#a8744d', 0, TABLE_Y + 3, STAGE_W, 1);
  px(g, '#b37a4c', 0, TABLE_Y + 4, STAGE_W, STAGE_H - TABLE_Y - 4);
}

function paintPot(g: G): void {
  for (let y = 67; y < TABLE_Y; y++) {
    const half = 10 - Math.floor((y - 67) / 4);
    px(g, '#d9764f', PLANT_X - half, y, half * 2, 1);
    px(g, '#b85f3c', PLANT_X + half - 3, y, 3, 1);
  }
  px(g, '#5a3a2a', PLANT_X - 10, SOIL_Y, 20, 1);
  px(g, '#e88b62', PLANT_X - 12, 67, 24, 3);
  px(g, '#cf6c47', PLANT_X - 12, 69, 24, 1);
}

function paintPlant(g: G, t: number, s: FlowerArt): void {
  const grow = s.waterAt === undefined ? 0 : s.motion ? progress(t, s.waterAt + WATER_MS - 300, s.waterAt + WATER_MS - 300 + GROW_MS) : 1;
  if (grow <= 0) {
    paintGrid(g, DRIED_ROWS, FLOWER_PALETTE, PLANT_X - 5, SOIL_Y - DRIED_ROWS.length + 1);
    return;
  }
  // The bloom rises out of the soil, bottom row first.
  const top = SOIL_Y - BLOOM.length + 1;
  const shown = Math.ceil(BLOOM.length * grow);
  const rows = BLOOM.slice(BLOOM.length - shown);
  const sway = s.motion && grow >= 1 ? Math.round(Math.sin(t / 900) * 0.6) : 0;
  paintGrid(g, rows, FLOWER_PALETTE, PLANT_X - (BLOOM_SIZE - 1) / 2 + sway, top + BLOOM.length - shown);
  if (grow >= 1 && s.waterAt !== undefined && s.motion) paintSparkles(g, t - (s.waterAt + WATER_MS + GROW_MS - 300));
}

function paintSparkles(g: G, since: number): void {
  if (since < 0 || since > 1400) return;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + since / 700;
    const r = 13 + since / 120;
    const x = PLANT_X + Math.cos(a) * r;
    const y = 44 + Math.sin(a) * r * 0.8;
    const c = i % 2 ? '#ffd75e' : '#ffffff';
    px(g, c, x, y - 1, 1, 3);
    px(g, c, x - 1, y, 3, 1);
  }
}

/** The bell jar: a pale glass column with a rounded top, a knob and highlights. */
function paintDome(g: G, cracks: number): void {
  const left = 60;
  const right = 100;
  const cx = (left + right) / 2;
  const rx = (right - left) / 2;
  const topY = 20;
  const shoulder = topY + 12;
  g.globalAlpha = 0.3;
  for (let y = topY; y < TABLE_Y; y++) {
    const half = y >= shoulder ? rx : rx * Math.sqrt(1 - ((shoulder - y) / 12) ** 2);
    px(g, '#cfeeff', cx - half, y, half * 2, 1);
  }
  g.globalAlpha = 1;
  for (let y = topY; y < TABLE_Y; y++) {
    const half = y >= shoulder ? rx : rx * Math.sqrt(1 - ((shoulder - y) / 12) ** 2);
    px(g, '#8fcbe6', cx - half, y, 1, 1);
    px(g, '#8fcbe6', cx + half - 1, y, 1, 1);
  }
  px(g, '#8fcbe6', cx - 3, topY, 6, 1);
  px(g, '#8fcbe6', cx - 2, topY - 4, 4, 4);
  px(g, '#cfeeff', cx - 1, topY - 3, 1, 2);
  px(g, '#a9d6e8', left - 1, TABLE_Y - 2, right - left + 2, 2);
  g.globalAlpha = 0.75;
  px(g, '#ffffff', left + 4, shoulder - 4, 1, 34);
  px(g, '#ffffff', left + 6, shoulder + 2, 1, 10);
  px(g, '#ffffff', right - 6, shoulder + 6, 1, 6);
  g.globalAlpha = 1;
  paintCracks(g, cracks);
}

/** Crack lines, one more with every knock. */
const CRACKS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[86, 40], [89, 44], [88, 48], [92, 52], [91, 55]],
  [[86, 40], [82, 38], [78, 41], [74, 39], [70, 43]],
  [[86, 40], [84, 46], [80, 50], [81, 56], [76, 60], [73, 66]],
];

function paintCracks(g: G, count: number): void {
  for (let i = 0; i < Math.min(count, CRACKS.length); i++) {
    const path = CRACKS[i] ?? [];
    for (let j = 1; j < path.length; j++) {
      const [x0, y0] = path[j - 1] ?? [0, 0];
      const [x1, y1] = path[j] ?? [0, 0];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= steps; k++) {
        const u = steps ? k / steps : 0;
        px(g, k % 2 ? '#6fb3d2' : '#ffffff', x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 1, 1);
      }
    }
  }
  if (count > 0) px(g, '#ffffff', 85, 39, 3, 3);
}

/** The glass bursting: a flash, then shards falling onto the sill. */
function paintShards(g: G, since: number, motion: boolean): void {
  if (motion && since < 120) {
    g.globalAlpha = 0.6 * (1 - since / 120);
    px(g, '#ffffff', 56, 10, 50, 70);
    g.globalAlpha = 1;
  }
  const time = motion ? since : 5000;
  for (let i = 0; i < 64; i++) {
    const x0 = 60 + noise(i) * 40;
    const y0 = 22 + noise(i + 50) * 50;
    const vx = (noise(i + 100) - 0.5) * 0.09;
    const vy = -0.02 - noise(i + 150) * 0.04;
    const gravity = 0.00035;
    let x = x0 + vx * time;
    let y = y0 + vy * time + 0.5 * gravity * time * time;
    // Shards that reach the sill stop there, spread out along it.
    if (y >= TABLE_Y - 1) {
      const land = (-vy + Math.sqrt(vy * vy + 2 * gravity * (TABLE_Y - 1 - y0))) / gravity;
      x = x0 + vx * land;
      y = TABLE_Y - 1;
    }
    const size = 1 + (i % 4 === 0 ? 2 : i % 3 === 0 ? 1 : 0);
    px(g, i % 3 ? '#cfeeff' : '#ffffff', x, y, size, i % 2 ? 1 : size);
  }
}

function paintCan(g: G, t: number, s: FlowerArt): void {
  const pouring = s.waterAt !== undefined && s.motion && t >= s.waterAt && t < s.waterAt + WATER_MS;
  const ox = pouring ? 96 : 116;
  const oy = pouring ? 40 : 66;
  // Body, handle and spout.
  px(g, '#7cc4e8', ox, oy, 16, 12);
  px(g, '#5aa8d0', ox + 12, oy, 4, 12);
  px(g, '#a6dbf5', ox + 2, oy + 2, 2, 6);
  px(g, '#5aa8d0', ox + 16, oy + 2, 2, 1);
  px(g, '#5aa8d0', ox + 18, oy + 2, 1, 7);
  px(g, '#5aa8d0', ox + 16, oy + 9, 2, 1);
  for (let i = 0; i < 8; i++) px(g, '#5aa8d0', ox - 1 - i, oy + 6 - (pouring ? -i * 0.6 : i * 0.7), 2, 1);
  const tipX = ox - 9;
  const tipY = pouring ? oy + 11 : oy;
  px(g, '#4a90b8', tipX - 1, tipY - 1, 3, 3);
  if (!pouring) return;
  // Water drops falling onto the soil.
  const since = t - (s.waterAt ?? 0);
  for (let i = 0; i < 7; i++) {
    const fall = (since / 6 + i * 4) % (SOIL_Y - tipY);
    px(g, '#5ab4ec', tipX + (i % 3) - 1, tipY + 2 + fall, 1, 2);
  }
}
