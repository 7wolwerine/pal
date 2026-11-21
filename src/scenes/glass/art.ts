import { HERO_WIDTH, heroHands, heroToastHand, paintHero, type HeroPose } from '../../pixel/hero.ts';
import { px, type Rect } from '../../pixel/stage.ts';
import { GLASS_H, GLASS_W, GRAVITY, TABLE_SPOT, glassPose, type DropFrom } from './model.ts';

type G = CanvasRenderingContext2D;

/** A small picture, so the character (26 pixels tall) fills a good third of it. */
export const STAGE_W = 120;
export const STAGE_H = 75;
/** Where the wall meets the floor. */
const WALL_Y = 58;
export const GLASS_RECT: Rect = { x: TABLE_SPOT[0] - 3, y: TABLE_SPOT[1] - 3, w: GLASS_W + 6, h: GLASS_H + 4 };
/** The table top. */
const TABLE_Y = TABLE_SPOT[1] + GLASS_H;
const TABLE_X = 76;
const TABLE_R = 108;

/** The glass of the standing mirror (the frame goes round it, the stand under it). */
const MIRROR: Rect = { x: 6, y: 20, w: 18, h: 40 };
/** Click area for the mirror: the frame, the stand and a little around it. */
export const MIRROR_RECT: Rect = { x: 2, y: 14, w: 27, h: 58 };
/** Where the character's feet are: on the floor, in front of everything. */
export const HERO_FEET_Y = 71;
/** By the mirror, a step from it, so the bubble hangs beside the frame. Where the character starts. */
export const HERO_MIRROR_X = 30;
/** In front of the table, close enough to reach the glass. */
export const HERO_TABLE_X = 64;

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
    if (full) px(g, '#6ec3ef', 1, 4, GLASS_W - 2, GLASS_H - 5);
    px(g, '#9fd0e8', 0, 0, 1, GLASS_H);
    px(g, '#9fd0e8', GLASS_W - 1, 0, 1, GLASS_H);
    px(g, '#9fd0e8', 0, GLASS_H - 1, GLASS_W, 1);
    px(g, '#ffffff', 2, 1, 1, GLASS_H - 4);
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

export function paintGlassScene(g: G, t: number, glass: GlassState, motion: boolean, hero: HeroState): void {
  paintRoom(g);
  paintMirror(g, t, motion, hero);
  if (glass.kind === 'table') drawGlass(g, TABLE_SPOT[0] + GLASS_W / 2, TABLE_SPOT[1], 0, 1, 1, true);
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
  for (let i = 0; i < 14; i++) px(g, '#5a5080', (i * 37) % STAGE_W, 12 + ((i * 23) % 40), 1, 1);
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
  px(g, '#3f9a4f', 80, TABLE_Y - 16, 7, 16);
  px(g, '#3f9a4f', 82, TABLE_Y - 21, 3, 5);
  px(g, '#ffd75e', 80, TABLE_Y - 11, 7, 4);
  px(g, '#7fd18a', 81, TABLE_Y - 15, 1, 11);
}

/** The water: an honest fall, then it shatters like glass on the floor. */
function paintWater(g: G, since: number, from: DropFrom): void {
  const splash = splashMs(from);
  const spillX = from.x + 3;
  const floor = from.floor;
  if (since < splash) {
    const t = since - SPILL_MS;
    const y = from.y + 4 + 0.5 * GRAVITY * t * t;
    for (let i = 0; i < 6; i++) px(g, '#6ec3ef', spillX + (i % 3) - 1 + t * 0.008 * i, y - i * 2, 2, 2);
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
    const c = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#6ec3ef' : '#b6e4fa';
    px(g, c, x, y, i % 2 ? 2 : 1, i % 2 ? 1 : 2);
  }
  // A thin crack of blue "glass" where the puddle should be.
  if (t > 60) {
    px(g, '#b6e4fa', spillX - 6, floor, 12, 1);
    px(g, '#ffffff', spillX - 2, floor, 1, 1);
    px(g, '#ffffff', spillX + 3, floor, 1, 1);
  }
}
