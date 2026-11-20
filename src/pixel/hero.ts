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
  v: '#d6a3a8', // tired shadows under the eyes
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
// Eyes squeezed into two little arcs and a wide open smile.
const FRONT_JOY: Record<number, string> = { 8: '.OHssessssessHO.', 9: '.OHsesessesesHO.', 11: '..qSssmmmmssSq..' };

// Worn out: heavy lids over the eyes, shadows under them, no blush, a flat little mouth.
const FRONT_WORN: Record<number, string> = {
  8: '.OHsSSssssSSsHO.',
  9: '.OHseesssseesHO.',
  10: '.qSsvvssssvvsSq.',
};
const FRONT_WORN_BLINK: Record<number, string> = { ...FRONT_WORN, 8: '.OHssssssssssHO.', 9: '.OHsSSssssSSsHO.' };

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

// The head from the side, facing right: hair over the top and the back, one
// ear, one eye, and a small nose that sticks one pixel out of the face.
const SIDE_HEAD = [
  '.....OOOOOO.....',
  '...OOHhhhhHOO...',
  '..OHhhyyhhhhHO..',
  '.OHhhyyhhhhhhHO.',
  '.OHhhhhhhhhhhHO.',
  '.OHhhhhhhhHhhHO.',
  '.OHhhhhhHssHssq.',
  '.OHhhhhHssssssq.',
  '.OHhhhqSsssseiq.',
  '.OHhhhqSsssseesq',
  '.OHhhhhqssscssq.',
  '..OHhhhSssssmsq.',
  '...OOhhqSSSSSq..',
  '.....OO.qSSq....',
];
const SIDE_BLINK: Record<number, string> = { 8: '.OHhhhqSssssssq.', 9: '.OHhhhqSsssseesq' };

const SIDE_WORN: Record<number, string> = {
  8: '.OHhhhqSssssSSq.',
  9: '.OHhhhqSsssseesq',
  10: '.OHhhhhqssssvvq.',
  11: '..OHhhhSsssmmsq.',
};
const SIDE_WORN_BLINK: Record<number, string> = { ...SIDE_WORN, 9: '.OHhhhqSssssSSsq' };

const SIDE_TORSO = ['.....uTttTu.....', '....uTttttTu....', '....uTtltttu....', '....uTtltttu....', '....uTTTTTTu....', '....nppppppn....', '....nppPPppn....'];

/** Side-view legs for the four steps; the near leg is lighter than the far one. */
const SIDE_LEGS = {
  contactA: ['.....nppppn.....', '....nPPnnppn....', '...nPPn..nppn...', '..zbbbz...zbbbz.', '..zzzz....zzzzz.'],
  pass: ['.....nppppn.....', '.....nppPPn.....', '.....npPPPn.....', '.....zbbbbbz....', '.....zzzzzzz....'],
  contactB: ['.....nppppn.....', '....nppnnPPn....', '...nppn..nPPn...', '..zbbbz...zbbbz.', '..zzzz....zzzzz.'],
} as const;

export const HERO_WIDTH = 16;
export const HERO_HEIGHT = 26;

/** 'side' stands still in profile, facing `facing`, arms hanging. */
export type HeroPose = 'stand' | 'walk' | 'happy' | 'hold' | 'side' | 'toast';

export interface HeroLook {
  readonly pose: HeroPose;
  /** -1 facing left, 1 facing right; ignored while standing still. */
  readonly facing: -1 | 0 | 1;
  /** Milliseconds, drives the walk cycle, blinking and breathing. */
  readonly t: number;
  readonly motion: boolean;
  /** Worn out: tired eyes, slumped shoulders, hair a little messed up. Still the same character. */
  readonly worn?: boolean;
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

  const worn = look.worn === true;
  if (pose === 'walk' || pose === 'side') {
    const flip = look.facing < 0;
    const still = pose === 'side';
    const step = motion && !still ? Math.floor(t / (worn ? 160 : 125)) % 4 : 1;
    // A worn-out walk does not bounce, and the head hangs a pixel lower.
    const rise = step % 2 === 1 && !worn ? -1 : 0;
    const sag = worn ? 1 : 0;
    const legs = step === 0 ? SIDE_LEGS.contactA : step === 2 ? SIDE_LEGS.contactB : SIDE_LEGS.pass;
    // Far arm first (behind the body), swinging opposite to the near one.
    const swing = still ? 0 : (step === 0 ? 3 : step === 2 ? -3 : 0) * (worn ? 0.67 : 1);
    const shoulder = (dx: number): number => (flip ? 15 - dx : dx);
    const sx = ix + shoulder(8);
    arm(g, sx, top + 15 + rise, sx + (flip ? swing : -swing), top + 20 + rise);
    rows(g, legs, ix, top + 21, flip);
    rows(g, SIDE_TORSO, ix, top + 14 + rise, flip);
    const sideFace = worn ? (blink ? SIDE_WORN_BLINK : SIDE_WORN) : blink ? SIDE_BLINK : undefined;
    rows(g, patch(SIDE_HEAD, sideFace), ix, top + rise + sag, flip);
    if (worn) messyHair(g, ix, top + rise + sag, flip);
    arm(g, sx, top + 15 + rise, sx + (flip ? -swing : swing), top + 20 + rise + sag);
    return;
  }

  const breathe = motion && pose === 'stand' && Math.floor(t / 1100) % 2 === 1 ? 1 : 0;
  const hop = motion && pose === 'happy' ? Math.round(Math.abs(Math.sin(t / 140)) * 3) : 0;
  const y = top - hop;

  if (pose === 'stand') {
    rows(g, FRONT_BODY, ix, y + 14, false);
    if (worn) {
      // Slumped: the head sinks into the shoulders by a pixel.
      rows(g, patch(FRONT_HEAD, blink ? FRONT_WORN_BLINK : FRONT_WORN), ix, y + 1, false);
      messyHair(g, ix, y + 1, false);
      return;
    }
    rows(g, patch(FRONT_HEAD, blink ? FRONT_BLINK : undefined), ix, y + breathe * 0, false);
    return;
  }

  rows(g, FRONT_TORSO, ix, y + 14, false);
  if (pose === 'happy') {
    // Both arms thrown up and out in delight, clear of the face.
    rows(g, patch(FRONT_HEAD, FRONT_JOY), ix, y, false);
    arm(g, ix + 3, y + 15, ix - 2, y + 11);
    arm(g, ix + 11, y + 15, ix + 16, y + 11);
    return;
  }
  if (pose === 'toast') {
    // One hand raised high for a toast (something can be put in it, see heroToastHand), the other at the side.
    arm(g, ix + 3, y + 15, ix + 3, y + 20);
    arm(g, ix + 11, y + 15, ix + 14, y + 8);
    rows(g, patch(FRONT_HEAD, worn ? (blink ? FRONT_WORN_BLINK : FRONT_WORN) : blink ? FRONT_BLINK : undefined), ix, y, false);
    if (worn) messyHair(g, ix, y, false);
    return;
  }
  // 'hold': both hands together in front, holding up a little present.
  arm(g, ix + 4, y + 15, ix + 6, y + 19);
  arm(g, ix + 11, y + 15, ix + 9, y + 19);
  rows(g, patch(FRONT_HEAD, blink ? FRONT_BLINK : undefined), ix, y, false);
}

/** A few strands of hair sticking up out of place. */
function messyHair(g: G, x: number, top: number, flip: boolean): void {
  const at = (dx: number): number => x + (flip ? 15 - dx : dx);
  const dark = PAL.O ?? '';
  const mid = PAL.H ?? '';
  // A cowlick on the crown, curling over.
  px(g, dark, at(8), top - 1, 1, 1);
  px(g, mid, at(9), top - 1, 1, 1);
  px(g, dark, at(9), top - 2, 2, 1);
  // Tufts sticking out at the sides, each one touching the head.
  px(g, dark, at(4), top, 1, 1);
  px(g, dark, at(2), top + 1, 1, 1);
  px(g, dark, at(13), top + 1, 1, 1);
  px(g, dark, at(14), top + 2, 1, 1);
}

/** Where the raised hand is in the 'toast' pose. */
export function heroToastHand(x: number, baseY: number): { x: number; y: number } {
  return { x: Math.round(x) + 15, y: baseY - HERO_HEIGHT + 8 };
}

/** Where the hands are in the 'hold' pose, to put something in them. */
export function heroHands(x: number, baseY: number): { x: number; y: number } {
  return { x: Math.round(x) + 8, y: baseY - HERO_HEIGHT + 19 };
}
