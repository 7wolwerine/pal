import { px, type Rect } from '../../pixel/stage.ts';
import { FLOOR_Y, GLASS_H, GLASS_W, GRAVITY, TABLE_EDGE, TABLE_SPOT, glassPose } from './model.ts';

type G = CanvasRenderingContext2D;

export const STAGE_W = 160;
export const STAGE_H = 100;
export const GLASS_RECT: Rect = { x: TABLE_SPOT[0] - 3, y: TABLE_SPOT[1] - 3, w: GLASS_W + 6, h: GLASS_H + 4 };

const TABLE_Y = TABLE_SPOT[1] + GLASS_H;
/** When the water leaves the glass, and where it hits the floor. */
const SPILL_MS = 250;
const SPILL_X = TABLE_EDGE + 4;
export const SPLASH_MS = SPILL_MS + Math.sqrt((2 * (FLOOR_Y - TABLE_SPOT[1] - 4)) / GRAVITY);

function noise(n: number): number {
  const s = Math.sin(n * 57.3) * 43758.5453;
  return s - Math.floor(s);
}

let sprite: HTMLCanvasElement | null = null;

/** The glass, half full, drawn once into a little canvas so it can be rotated and squashed. */
function glassSprite(full: boolean): HTMLCanvasElement {
  if (!full && sprite) return sprite;
  const c = document.createElement('canvas');
  c.width = GLASS_W;
  c.height = GLASS_H;
  const g = c.getContext('2d');
  if (g) {
    px(g, '#e8f6fd', 0, 0, GLASS_W, GLASS_H);
    if (full) px(g, '#6ec3ef', 1, 4, GLASS_W - 2, GLASS_H - 5);
    px(g, '#9fd0e8', 0, 0, 1, GLASS_H);
    px(g, '#9fd0e8', GLASS_W - 1, 0, 1, GLASS_H);
    px(g, '#9fd0e8', 0, GLASS_H - 1, GLASS_W, 1);
    px(g, '#ffffff', 2, 1, 1, GLASS_H - 4);
  }
  if (!full) sprite = c;
  return c;
}

let fullSprite: HTMLCanvasElement | null = null;

export function paintGlassScene(g: G, t: number, fallAt: number | undefined, motion: boolean): void {
  paintRoom(g);
  const since = fallAt === undefined ? -1 : motion ? t - fallAt : 99999;
  const pose = glassPose(since);
  const full = since < SPILL_MS;
  fullSprite ??= glassSprite(true);
  const img = full ? fullSprite : glassSprite(false);
  g.save();
  g.translate(Math.round(pose.x), Math.round(pose.y + GLASS_H));
  g.rotate(pose.rot);
  g.scale(pose.sx, pose.sy);
  g.drawImage(img, -GLASS_W / 2, -GLASS_H);
  g.restore();
  if (since >= SPILL_MS) paintWater(g, since);
}

function paintRoom(g: G): void {
  px(g, '#2d2747', 0, 0, STAGE_W, FLOOR_Y);
  for (let i = 0; i < 18; i++) px(g, '#5a5080', (i * 37) % STAGE_W, (i * 23) % 70, 1, 1);
  // A party garland.
  for (let x = 0; x < STAGE_W; x += 10) {
    const colour = ['#ff9ec7', '#ffd75e', '#7ec8f0', '#9fd49a'][(x / 10) % 4] ?? '#ff9ec7';
    const y = 6 + Math.round(3 * Math.sin((x / STAGE_W) * Math.PI * 3));
    px(g, colour, x + 2, y, 5, 3);
    px(g, colour, x + 3, y + 3, 3, 2);
  }
  px(g, '#8a7aa8', 0, 6, STAGE_W, 1);
  // The table, with a bottle beside the glass.
  px(g, '#8a5a3b', 18, TABLE_Y, TABLE_EDGE - 18, 4);
  px(g, '#6e4529', 18, TABLE_Y + 4, TABLE_EDGE - 18, 1);
  px(g, '#6e4529', 24, TABLE_Y + 5, 4, FLOOR_Y - TABLE_Y - 5);
  px(g, '#6e4529', TABLE_EDGE - 10, TABLE_Y + 5, 4, FLOOR_Y - TABLE_Y - 5);
  px(g, '#3f9a4f', 66, TABLE_Y - 20, 8, 20);
  px(g, '#3f9a4f', 68, TABLE_Y - 26, 4, 6);
  px(g, '#ffd75e', 66, TABLE_Y - 14, 8, 5);
  px(g, '#7fd18a', 67, TABLE_Y - 19, 1, 14);
  // The floor.
  px(g, '#5c4a6e', 0, FLOOR_Y, STAGE_W, STAGE_H - FLOOR_Y);
  px(g, '#6d5a82', 0, FLOOR_Y, STAGE_W, 1);
}

/** The water: an honest fall, then it shatters like glass on the floor. */
function paintWater(g: G, since: number): void {
  if (since < SPLASH_MS) {
    const t = since - SPILL_MS;
    const y = TABLE_SPOT[1] + 4 + 0.5 * GRAVITY * t * t;
    for (let i = 0; i < 6; i++) px(g, '#6ec3ef', SPILL_X + (i % 3) - 1 + t * 0.008 * i, y - i * 2, 2, 2);
    return;
  }
  const t = since - SPLASH_MS;
  for (let i = 0; i < 18; i++) {
    const vx = (noise(i) - 0.5) * 0.12;
    const vy = -0.04 - noise(i + 30) * 0.08;
    const flight = (-2 * vy) / GRAVITY;
    const tt = Math.min(t, flight);
    const x = SPILL_X + vx * tt;
    const y = FLOOR_Y - 2 - (-vy * tt - 0.5 * GRAVITY * tt * tt);
    const c = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#6ec3ef' : '#b6e4fa';
    px(g, c, x, y, i % 2 ? 2 : 1, i % 2 ? 1 : 2);
  }
  // A thin crack of blue "glass" where the puddle should be.
  if (t > 60) {
    px(g, '#b6e4fa', SPILL_X - 6, FLOOR_Y, 12, 1);
    px(g, '#ffffff', SPILL_X - 2, FLOOR_Y, 1, 1);
    px(g, '#ffffff', SPILL_X + 3, FLOOR_Y, 1, 1);
  }
}

