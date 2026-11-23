import { HERO_WIDTH, heroHands, heroToastHand, paintHero, type HeroPose } from '../../pixel/hero.ts';
import { px, type Rect } from '../../pixel/stage.ts';
import { GLASS_H, GLASS_W, GRAVITY, TABLE_SPOT, glassPose, type DropFrom } from './model.ts';

type G = CanvasRenderingContext2D;

/**
 * A small picture, so the character (26 pixels tall) fills nearly half its height, and the things
 * round them in their true sizes: a mirror a head taller than they are, a table up to their hips,
 * a bottle and a glass that fit a hand.
 */
export const STAGE_W = 100;
export const STAGE_H = 60;
/** Where the wall meets the floor. */
const WALL_Y = 44;
/** The glass is small; the place to tap it is not. */
export const GLASS_RECT: Rect = { x: TABLE_SPOT[0] - 5, y: TABLE_SPOT[1] - 5, w: GLASS_W + 10, h: GLASS_H + 7 };
/** The table top. */
const TABLE_Y = TABLE_SPOT[1] + GLASS_H;
const TABLE_X = 70;
const TABLE_R = 94;

/** The glass of the standing mirror (the frame goes round it, the stand under it). */
const MIRROR: Rect = { x: 6, y: 21, w: 14, h: 26 };
/** Click area for the mirror: the frame, the stand and a little around it. */
export const MIRROR_RECT: Rect = { x: 2, y: 16, w: 22, h: 42 };
/** Where the character's feet are: on the floor, in front of everything. */
export const HERO_FEET_Y = 57;
/** By the mirror, a step from it, so the bubble hangs beside the frame. Where the character starts. */
export const HERO_MIRROR_X = 23;
/** In front of the table, close enough to reach the glass. */
export const HERO_TABLE_X = 60;

export interface HeroState {
  readonly x: number;
  readonly pose: HeroPose;
  readonly facing: -1 | 0 | 1;
}

/** What the glass is doing: on the table, in the character's hands, raised for the toast, or falling (since `at`). */
export type GlassState =
  | { readonly kind: 'table' }
  | { readonly kind: 'held' }
  | { readonly kind: 'raised' }
  | { readonly kind: 'falling'; readonly at: number; readonly from: DropFrom };

/** The water leaves the glass a moment after it slips. */
const SPILL_MS = 120;

/** Where a glass slipping out of the raised hand starts, and where it lands: in front, by the feet. */
export function handDrop(heroX: number): DropFrom {
  const hand = heroToastHand(heroX, HERO_FEET_Y);
  return { x: hand.x + 1, y: hand.y - GLASS_H + 2, floor: HERO_FEET_Y + 1 };
}

/** When the spilt water hits the floor. */
export function splashMs(from: DropFrom): number {
  return SPILL_MS + Math.sqrt((2 * Math.max(1, from.floor - from.y - 4)) / GRAVITY);
}

function noise(n: number): number {
  const s = Math.sin(n * 57.3) * 43758.5453;
  return s - Math.floor(s);
}

let sprite: HTMLCanvasElement | null = null;
let fullSprite: HTMLCanvasElement | null = null;

/** The glass, drawn once into a little canvas so it can be rotated and squashed. */
function glassSprite(full: boolean): HTMLCanvasElement {
  if (full && fullSprite) return fullSprite;
  if (!full && sprite) return sprite;
  const c = document.createElement('canvas');
  c.width = GLASS_W;
  c.height = GLASS_H;
  const g = c.getContext('2d');
  if (g) {
    px(g, '#e8f6fd', 0, 0, GLASS_W, GLASS_H);
    if (full) {
      // Sparkling wine: gold, a line of foam on top, a bubble or two.
      px(g, WINE, 1, 2, GLASS_W - 2, GLASS_H - 3);
      px(g, FOAM, 1, 2, GLASS_W - 2, 1);
      px(g, '#fff6d0', 2, 4, 1, 1);
      px(g, '#fff6d0', 3, 6, 1, 1);
    }
    px(g, '#9fd0e8', 0, 0, 1, GLASS_H);
    px(g, '#9fd0e8', GLASS_W - 1, 0, 1, GLASS_H);
    px(g, '#9fd0e8', 0, GLASS_H - 1, GLASS_W, 1);
  }
  if (full) fullSprite = c;
  else sprite = c;
  return c;
}

function drawGlass(g: G, x: number, top: number, rot: number, sx: number, sy: number, full: boolean): void {
  g.save();
  g.translate(Math.round(x), Math.round(top + GLASS_H));
  g.rotate(rot);
  g.scale(sx, sy);
  g.drawImage(glassSprite(full), -GLASS_W / 2, -GLASS_H);
  g.restore();
}

/** The wine in the glass, and what it shatters into. */
const WINE = '#f2c14e';
const FOAM = '#fff3c4';

export function paintGlassScene(g: G, t: number, glass: GlassState, motion: boolean, hero: HeroState, shine = false): void {
  paintRoom(g);
  paintMirror(g, t, motion, hero);
  if (glass.kind === 'table') {
    drawGlass(g, TABLE_SPOT[0] + GLASS_W / 2, TABLE_SPOT[1], 0, 1, 1, true);
    if (shine) paintShine(g, t, motion);
  }
  paintHero(g, hero.x, HERO_FEET_Y, { pose: hero.pose, facing: hero.facing, t, motion, worn: true });
  if (glass.kind === 'held') {
    const hands = heroHands(hero.x, HERO_FEET_Y);
    drawGlass(g, hands.x + 1, hands.y - GLASS_H + 3, 0, 1, 1, true);
  } else if (glass.kind === 'raised') {
    const from = handDrop(hero.x);
    drawGlass(g, from.x, from.y, 0, 1, 1, true);
  } else if (glass.kind === 'falling') {
    const since = motion ? t - glass.at : 99999;
    const pose = glassPose(since, glass.from);
    drawGlass(g, pose.x, pose.y, pose.rot, pose.sx, pose.sy, since < SPILL_MS);
    if (since >= SPILL_MS) paintWater(g, since, glass.from);
  }
}

/**
 * The standing mirror: a tall wooden frame on two splayed feet, pale glass that
 * catches the light now and then. When the character stands right in front of
 * it, looking in, the tired face looks back out of it.
 */
function paintMirror(g: G, t: number, motion: boolean, hero: HeroState): void {
  const { x, y, w, h } = MIRROR;
  // The stand: a post down the back and two splayed feet on the floor.
  px(g, '#6e4529', x + w / 2 - 1, y + h, 2, HERO_FEET_Y - 3 - (y + h));
  px(g, '#6e4529', x + 1, HERO_FEET_Y - 4, w - 2, 2);
  px(g, '#8a5a3b', x - 1, HERO_FEET_Y - 3, 4, 2);
  px(g, '#8a5a3b', x + w - 3, HERO_FEET_Y - 3, 4, 2);
  // The frame, rounded at the top, with a little crest.
  px(g, '#b98450', x - 1, y + 2, w + 2, h);
  px(g, '#b98450', x + 1, y, w - 2, 2);
  px(g, '#b98450', x + 3, y - 1, w - 6, 1);
  px(g, '#e3b57a', x + w / 2 - 2, y - 3, 4, 2);
  px(g, '#8a5a34', x - 1, y + h + 1, w + 2, 1);
  px(g, '#8a5a34', x + w, y + 3, 1, h - 2);
  px(g, '#e3b57a', x - 1, y + 3, 1, h - 3);
  // The swivel pins on the sides.
  px(g, '#e3b57a', x - 2, y + h / 2, 1, 2);
  px(g, '#e3b57a', x + w + 1, y + h / 2, 1, 2);
  // The glass.
  const gx = x + 1;
  const gy = y + 1;
  const gw = w - 2;
  const gh = h - 1;
  px(g, '#b9b0e0', gx, gy, gw, gh);
  px(g, '#cfc8ee', gx, gy, gw, Math.round(gh * 0.45));
  px(g, '#a59bd2', gx, gy + gh - 3, gw, 3);
  // His reflection: only when he stands right in front of it, looking in.
  if (hero.pose === 'side' && Math.abs(hero.x - HERO_MIRROR_X) < 2) {
    g.save();
    g.beginPath();
    g.rect(gx, gy, gw, gh);
    g.clip();
    // The reflection faces him: back to the right, seen from a little closer.
    paintHero(g, gx + gw / 2 - HERO_WIDTH / 2 + 4, gy + gh + 6, { pose: 'side', facing: 1, t, motion, worn: true });
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
  px(g, '#2d2747', 0, 0, STAGE_W, WALL_Y);
  for (let i = 0; i < 14; i++) px(g, '#5a5080', (i * 37) % STAGE_W, 12 + ((i * 23) % (WALL_Y - 16)), 1, 1);
  // A party garland.
  px(g, '#8a7aa8', 0, 5, STAGE_W, 1);
  for (let x = 0; x < STAGE_W; x += 10) {
    const colour = ['#ff9ec7', '#ffd75e', '#7ec8f0', '#9fd49a'][(x / 10) % 4] ?? '#ff9ec7';
    const y = 5 + Math.round(3 * Math.sin((x / STAGE_W) * Math.PI * 3));
    px(g, colour, x + 2, y, 5, 3);
    px(g, colour, x + 3, y + 3, 3, 2);
  }
  // The floor.
  px(g, '#5c4a6e', 0, WALL_Y, STAGE_W, STAGE_H - WALL_Y);
  px(g, '#6d5a82', 0, WALL_Y, STAGE_W, 1);
  // The little table, standing back by the wall, with a bottle beside the glass.
  const feet = WALL_Y + 6;
  px(g, '#8a5a3b', TABLE_X, TABLE_Y, TABLE_R - TABLE_X, 3);
  px(g, '#a5714c', TABLE_X, TABLE_Y, TABLE_R - TABLE_X, 1);
  px(g, '#6e4529', TABLE_X, TABLE_Y + 3, TABLE_R - TABLE_X, 1);
  px(g, '#6e4529', TABLE_X + 3, TABLE_Y + 4, 3, feet - TABLE_Y - 4);
  px(g, '#6e4529', TABLE_R - 6, TABLE_Y + 4, 3, feet - TABLE_Y - 4);
  // A bottle a hand tall: body, neck, a gold label, a gold foil cap.
  px(g, '#3f9a4f', 74, TABLE_Y - 8, 4, 8);
  px(g, '#3f9a4f', 75, TABLE_Y - 11, 2, 3);
  px(g, '#ffd75e', 75, TABLE_Y - 12, 2, 1);
  px(g, '#ffd75e', 74, TABLE_Y - 6, 4, 2);
  px(g, '#7fd18a', 74, TABLE_Y - 8, 1, 6);
}

/** The water: an honest fall, then it shatters like glass on the floor. */
function paintWater(g: G, since: number, from: DropFrom): void {
  const splash = splashMs(from);
  const spillX = from.x + 3;
  const floor = from.floor;
  if (since < splash) {
    const t = since - SPILL_MS;
    const y = from.y + 4 + 0.5 * GRAVITY * t * t;
    for (let i = 0; i < 6; i++) px(g, WINE, spillX + (i % 3) - 1 + t * 0.008 * i, y - i * 2, 2, 2);
    return;
  }
  const t = since - splash;
  for (let i = 0; i < 18; i++) {
    const vx = (noise(i) - 0.5) * 0.12;
    const vy = -0.04 - noise(i + 30) * 0.08;
    const flight = (-2 * vy) / GRAVITY;
    const tt = Math.min(t, flight);
    const x = spillX + vx * tt;
    const y = floor - 2 - (-vy * tt - 0.5 * GRAVITY * tt * tt);
    const c = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? WINE : FOAM;
    px(g, c, x, y, i % 2 ? 2 : 1, i % 2 ? 1 : 2);
  }
  // A thin crack of golden "glass" where the puddle should be.
  if (t > 60) {
    px(g, WINE, spillX - 6, floor, 12, 1);
    px(g, '#ffffff', spillX - 2, floor, 1, 1);
    px(g, '#ffffff', spillX + 3, floor, 1, 1);
  }
}

/**
 * The glass on the table catches the light while nobody does anything: a glint runs down it and
 * a little star winks above its rim, every second or so, to say "here".
 */
function paintShine(g: G, t: number, motion: boolean): void {
  const [x, y] = TABLE_SPOT;
  const cycle = motion ? t % 1300 : 600;
  if (cycle < 420) {
    const row = Math.floor((cycle / 420) * (GLASS_H + 2)) - 1;
    px(g, '#ffffff', x + 1, y + row, 1, 2);
    px(g, '#ffffff', x + 2, y + row + 1, 1, 1);
  }
  const s = cycle > 380 && cycle < 820 ? (cycle < 600 ? 1 : 2) : 0;
  if (s > 0) {
    const cx = x + GLASS_W;
    const cy = y - 2;
    px(g, '#ffffff', cx, cy - s, 1, s * 2 + 1);
    px(g, '#ffffff', cx - s, cy, s * 2 + 1, 1);
  }
}
