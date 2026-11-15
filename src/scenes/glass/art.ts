import { HERO_WIDTH, paintHero, type HeroPose } from '../../pixel/hero.ts';
import { px, type Rect } from '../../pixel/stage.ts';
import { FLOOR_Y, GLASS_H, GLASS_W, GRAVITY, TABLE_EDGE, TABLE_SPOT, glassPose } from './model.ts';

type G = CanvasRenderingContext2D;

export const STAGE_W = 160;
export const STAGE_H = 100;
export const GLASS_RECT: Rect = { x: TABLE_SPOT[0] - 3, y: TABLE_SPOT[1] - 3, w: GLASS_W + 6, h: GLASS_H + 4 };

/** The mirror on the wall, left of the table, at the height of a face. */
export const MIRROR: Rect = { x: 1, y: 57, w: 16, h: 25 };
/** Click area for the mirror: the frame and a little around it. */
export const MIRROR_RECT: Rect = { x: 0, y: 52, w: 19, h: 32 };
/** Where the character's feet are: on the floor, in front of everything. */
export const HERO_FEET_Y = 97;
/** Where the character waits at first (left edge), clear of where the glass lands. */
export const HERO_HOME_X = 138;
/**
 * Where the character stands to look into the mirror (left edge): a step back
 * from it, so his bubble hangs beside the mirror and not over his reflection.
 */
export const HERO_MIRROR_X = 40;

export interface HeroState {
  readonly x: number;
  readonly pose: HeroPose;
  readonly facing: -1 | 0 | 1;
}

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

export function paintGlassScene(g: G, t: number, fallAt: number | undefined, motion: boolean, hero?: HeroState): void {
  paintRoom(g);
  paintMirror(g, t, motion, hero);
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
  if (hero) paintHero(g, hero.x, HERO_FEET_Y, { pose: hero.pose, facing: hero.facing, t, motion, worn: true });
}

/**
 * The mirror: a rounded wooden frame and pale glass that catches the light now
 * and then. When the character stands right in front of it, his tired face
 * looks back out of it.
 */
function paintMirror(g: G, t: number, motion: boolean, hero: HeroState | undefined): void {
  const { x, y, w, h } = MIRROR;
  // Frame, with rounded corners and a nail and string above.
  px(g, '#8a7aa8', x + w / 2 - 0.5, y - 4, 1, 1);
  px(g, '#6e5a8a', x + 3, y - 3, 2, 1);
  px(g, '#6e5a8a', x + w - 5, y - 3, 2, 1);
  px(g, '#6e5a8a', x + 5, y - 4, w - 10, 1);
  px(g, '#b98450', x + 1, y, w - 2, h);
  px(g, '#b98450', x, y + 1, w, h - 2);
  px(g, '#8a5a34', x + 1, y + h - 1, w - 2, 1);
  px(g, '#8a5a34', x + w - 1, y + 2, 1, h - 3);
  px(g, '#e3b57a', x + 1, y + 1, 1, h - 3);
  // The glass.
  const gx = x + 2;
  const gy = y + 2;
  const gw = w - 4;
  const gh = h - 4;
  px(g, '#b9b0e0', gx, gy, gw, gh);
  px(g, '#cfc8ee', gx, gy, gw, Math.round(gh * 0.45));
  px(g, '#a59bd2', gx, gy + gh - 3, gw, 3);
  // His reflection: only when he stands right in front of it, looking in.
  if (hero && hero.pose === 'side' && Math.abs(hero.x - HERO_MIRROR_X) < 2) {
    g.save();
    g.beginPath();
    g.rect(gx, gy, gw, gh);
    g.clip();
    // The reflection faces him: back to the right, seen from a little closer.
    paintHero(g, gx + gw / 2 - HERO_WIDTH / 2 - 2, gy + 31, { pose: 'side', facing: 1, t, motion, worn: true });
    g.globalAlpha = 0.28;
    px(g, '#d9d2f5', gx, gy, gw, gh);
    g.globalAlpha = 1;
    g.restore();
  }
  // A glint that runs across the glass every few seconds.
  const cycle = motion ? t % 3800 : 0;
  if (motion && cycle < 520) {
    const u = cycle / 520;
    const d = Math.round(-6 + u * (gw + gh + 6));
    g.save();
    g.beginPath();
    g.rect(gx, gy, gw, gh);
    g.clip();
    for (let k = 0; k < 3; k++) {
      g.globalAlpha = k === 1 ? 0.9 : 0.5;
      for (let i = 0; i < gh; i++) px(g, '#ffffff', gx + d + k - i * 0.6, gy + i, 1, 1);
    }
    g.globalAlpha = 1;
    g.restore();
    // A tiny star at the corner as the glint passes it.
    if (u > 0.35 && u < 0.7) {
      const s = u < 0.52 ? 1 : 2;
      px(g, '#ffffff', x + w - 2, y + 2 - s, 1, s * 2 + 1);
      px(g, '#ffffff', x + w - 2 - s, y + 2, s * 2 + 1, 1);
    }
  } else {
    // A still highlight.
    px(g, '#ffffff', gx + 1, gy + 1, 1, 3);
    px(g, '#ffffff', gx + 2, gy + 1, 1, 1);
  }
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

