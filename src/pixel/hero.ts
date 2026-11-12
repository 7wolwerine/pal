import { px } from './stage.ts';

type G = CanvasRenderingContext2D;

/**
 * The player's character in the garden. Soft, coloured outlines instead of
 * black ones; seen from the front while standing and from the side while
 * walking, with a proper four-step walk (contact, passing, contact, passing),
 * arms swinging against the legs, a little rise on the passing steps, and a
 * blink now and then.
 */

const PAL: Record<string, string> = {
  O: '#3d2414', // hair outline
  H: '#6b4226',
  h: '#8a5a34',
  y: '#b98450',
  q: '#b8735a', // skin outline
  s: '#f6cfb3',
  S: '#e3a98c',
  e: '#2b1d24',
  c: '#f29aa8',
  m: '#b0485e',
  u: '#24705c', // shirt outline
  T: '#3c9b80',
  t: '#5dcaa5',
  l: '#9ae6cb',
  n: '#2c3470', // trousers outline
  P: '#45539a',
  p: '#5b6bb5',
  z: '#21140c', // shoe outline
  b: '#5a3a28',
  i: '#ffffff',
  w: '#fff6e0', // the letter / paper
  W: '#e2cfa0',
};

const FRONT_HEAD = [
  '.....OOOOOO.....',
  '...OOHhhhhHOO...',
  '..OHhhyyhhhhHO..',
  '.OHhhyyhhhhhhHO.',
  '.OHhhhhhhhhhhHO.',
  '.OHhhHhhhhHhhHO.',
  '.OHHsHssssHsHHO.',
  '.OHssssssssssHO.',
  '.OHseissssiesHO.',
  '.OHseesssseesHO.',
  '.qSscssssssccSq.',
  '..qSsssmmsssSq..',
  '...qqSSSSSSqq...',
  '......qSSq......',
];
const FRONT_BLINK: Record<number, string> = { 8: '.OHssssssssssHO.', 9: '.OHseesssseesHO.' };
const FRONT_JOY: Record<number, string> = { 8: '.OHsessssseseHO.', 9: '.OHessssssessHO.', 11: '..qSssmmmmssSq..' };

const FRONT_BODY = [
  '...uTttttttTu...',
  '..uTtltttttTTu..',
  '..uTtltttttTTu..',
  '..uTuttttttuTu..',
  '..qsuTTTTTTusq..',
  '..qsqnppppnqsq..',
  '...qnppPPppnq...',
  '....nppnnppn....',
  '....nppnnppn....',
  '....nPPnnPPn....',
  '...zbbbzzbbbz...',
  '...zzzz..zzzz...',
];
// Body for poses where the arms do something else: no arms drawn.
const FRONT_TORSO = [
  '....uTttttTu....',
  '...uTtlttttTu...',
  '...uTtlttttTu...',
  '...uTttttttTu...',
  '...uTTTTTTTTu...',
  '....nppppppn....',
  '....nppPPppn....',
  '....nppnnppn....',
  '....nppnnppn....',
  '....nPPnnPPn....',
  '...zbbbzzbbbz...',
  '...zzzz..zzzz...',
];

const SIDE_HEAD = [
  '....OOOOOOO.....',
  '..OOHhhhhhhOO...',
  '.OHhhhyyyhhhhO..',
  '.OHhhyyhhhhhhhO.',
  'OHhhhhhhhhhhhhO.',
  'OHhhhhhhhhhhhhO.',
  'OHhhhhhhhhsHshO.',
  'OHhhhhhhssssssq.',
  'OHhhqSqsssseisq.',
  'OHhhqSqsssseesq.',
  '.OHhqqssssssscq.',
  '.OHhhqSssssmsq..',
  '..OOhhqSSSSSq...',
  '....OOO.qSSq....',
];
const SIDE_BLINK: Record<number, string> = { 8: 'OHhhqSqssssssssq.'.slice(0, 16), 9: 'OHhhqSqsssseesq.' };

const SIDE_TORSO = ['.....uTttTu.....', '....uTttttTu....', '....uTtltttu....', '....uTtltttu....', '....uTTTTTTu....', '....nppppppn....', '....nppPPppn....'];

/** Side-view legs for the four steps; the near leg is lighter than the far one. */
const SIDE_LEGS = {
  contactA: ['.....nppppn.....', '....nPPnnppn....', '...nPPn..nppn...', '..zbbbz...zbbbz.', '..zzzz....zzzzz.'],
  pass: ['.....nppppn.....', '.....nppPPn.....', '.....npPPPn.....', '.....zbbbbbz....', '.....zzzzzzz....'],
  contactB: ['.....nppppn.....', '....nppnnPPn....', '...nppn..nPPn...', '..zbbbz...zbbbz.', '..zzzz....zzzzz.'],
} as const;

export const HERO_WIDTH = 16;
export const HERO_HEIGHT = 26;

export type HeroPose = 'stand' | 'walk' | 'happy' | 'hold';

export interface HeroLook {
  readonly pose: HeroPose;
  /** -1 facing left, 1 facing right; ignored while standing still. */
  readonly facing: -1 | 0 | 1;
  /** Milliseconds, drives the walk cycle, blinking and breathing. */
  readonly t: number;
  readonly motion: boolean;
}

function rows(g: G, grid: readonly string[], x: number, y: number, flip: boolean): void {
  grid.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const colour = PAL[row[rx] ?? ''];
      if (colour) px(g, colour, x + (flip ? 15 - rx : rx), y + ry, 1, 1);
    }
  });
}

function patch(grid: readonly string[], changes: Record<number, string> | undefined): readonly string[] {
  return changes ? grid.map((row, i) => (changes[i] ?? row).slice(0, 16).padEnd(16, '.')) : grid;
}

/** An arm from a shoulder to a hand: a two-pixel sleeve, then a small hand. */
function arm(g: G, sx: number, sy: number, hx: number, hy: number): void {
  const steps = Math.max(Math.abs(hx - sx), Math.abs(hy - sy), 1);
  for (let i = 0; i < steps; i++) {
    const x = Math.round(sx + ((hx - sx) * i) / steps);
    const y = Math.round(sy + ((hy - sy) * i) / steps);
    px(g, PAL.T ?? '', x, y, 2, 2);
  }
  px(g, PAL.q ?? '', Math.round(hx), Math.round(hy), 2, 2);
  px(g, PAL.s ?? '', Math.round(hx), Math.round(hy), 2, 1);
}

/** Paints the character with its feet on `baseY`. */
export function paintHero(g: G, x: number, baseY: number, look: HeroLook): void {
  const { pose, t, motion } = look;
  const ix = Math.round(x);
  const top = baseY - HERO_HEIGHT;
  const blink = motion && t % 3600 < 130;

  if (pose === 'walk') {
    const flip = look.facing < 0;
    const step = motion ? Math.floor(t / 125) % 4 : 1;
    const rise = step % 2 === 1 ? -1 : 0;
    const legs = step === 0 ? SIDE_LEGS.contactA : step === 2 ? SIDE_LEGS.contactB : SIDE_LEGS.pass;
    // Far arm first (behind the body), swinging opposite to the near one.
    const swing = step === 0 ? 3 : step === 2 ? -3 : 0;
    const shoulder = (dx: number): number => (flip ? 15 - dx : dx);
    const sx = ix + shoulder(8);
    arm(g, sx, top + 15 + rise, sx + (flip ? swing : -swing), top + 20 + rise);
    rows(g, legs, ix, top + 21, flip);
    rows(g, SIDE_TORSO, ix, top + 14 + rise, flip);
    rows(g, patch(SIDE_HEAD, blink ? SIDE_BLINK : undefined), ix, top + rise, flip);
    arm(g, sx, top + 15 + rise, sx + (flip ? -swing : swing), top + 20 + rise);
    return;
  }

  const breathe = motion && pose === 'stand' && Math.floor(t / 1100) % 2 === 1 ? 1 : 0;
  const hop = motion && pose === 'happy' ? Math.round(Math.abs(Math.sin(t / 140)) * 3) : 0;
  const y = top - hop;

  if (pose === 'stand') {
    rows(g, FRONT_BODY, ix, y + 14, false);
    rows(g, patch(FRONT_HEAD, blink ? FRONT_BLINK : undefined), ix, y + breathe * 0, false);
    return;
  }

  rows(g, FRONT_TORSO, ix, y + 14, false);
  if (pose === 'happy') {
    // Both arms up in delight.
    arm(g, ix + 4, y + 15, ix + 1, y + 9);
    arm(g, ix + 11, y + 15, ix + 14, y + 9);
    rows(g, patch(FRONT_HEAD, FRONT_JOY), ix, y, false);
    return;
  }
  // 'hold': both hands together in front, holding up a little present.
  arm(g, ix + 4, y + 15, ix + 6, y + 19);
  arm(g, ix + 11, y + 15, ix + 9, y + 19);
  rows(g, patch(FRONT_HEAD, blink ? FRONT_BLINK : undefined), ix, y, false);
}

/** Where the hands are in the 'hold' pose, to put something in them. */
export function heroHands(x: number, baseY: number): { x: number; y: number } {
  return { x: Math.round(x) + 8, y: baseY - HERO_HEIGHT + 19 };
}
