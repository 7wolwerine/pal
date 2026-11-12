import { INK } from './cast.ts';
import { px } from './stage.ts';

type G = CanvasRenderingContext2D;

/**
 * The player's character in the garden. Built from parts so it can move like a
 * person: a head that turns towards where it is going and blinks, arms that
 * swing against the legs, a four-step walk with a little rise on the passing
 * steps, and poses for reading a letter and for being delighted.
 */

const PAL: Record<string, string> = {
  k: INK,
  H: '#5a3a22',
  h: '#7a5232',
  y: '#a87447',
  s: '#f8d6c0',
  S: '#e9b39c',
  e: '#2b1d24',
  w: '#ffffff',
  c: '#f4a3b4',
  m: '#9a3f52',
  t: '#5dcaa5',
  T: '#3c9b80',
  l: '#95e3c8',
  p: '#5b6bb5',
  P: '#45539a',
  o: '#4a3426',
};

const HEAD = [
  '.....kkkkkk.....',
  '...kkhhhhhhkk...',
  '..khhyyhhhhhhk..',
  '.khhyhhhhhhhhhk.',
  '.khhhhhhhhhhhhk.',
  '.khhhsshhsshhhk.',
  '.khhsssssssshhk.',
  '.khsswesswesshk.',
  '.khsseesseesshk.',
  '..kcssssssssck..',
  '..kSsssmmsssSk..',
  '...kkSSSSSSkk...',
];
const BLINK: Record<number, string> = {
  7: '.khsssssssssshk.',
  8: '.khsskksskksshk.',
};
const HAPPY_EYES: Record<number, string> = {
  7: '.khsskksskksshk.',
  8: '.khskssksskskhk.',
  10: '..kSssmmmmssSk..',
};
const READ_EYES: Record<number, string> = {
  7: '.khsssssssssshk.',
  8: '.khsseesseesshk.',
};

const TORSO = [
  '......kSSk......',
  '...kktTTTTtkk...',
  '...klttttttTk...',
  '...klttttttTk...',
  '...klttttttTk...',
  '...kTTTTTTTTk...',
  '...kppppppppk...',
  '...kpppPPpppk...',
];

const LEGS = {
  stand: ['...kpppkkpppk...', '...kpppkkpppk...', '...kpppkkpppk...', '...kPPPkkPPPk...', '..kooookkooook..', '..kkkkkkkkkkkk..'],
  // left foot lifted, right planted
  left: ['...kpppkkpppk...', '...kpppkkpppk...', '...kPPPkkpppk...', '..kooookkpppk...', '..kkkkkkkPPPk...', '........kooook..'],
  right: ['...kpppkkpppk...', '...kpppkkpppk...', '...kpppkkPPPk...', '...kpppkkooook..', '...kPPPkkkkkkk..', '..kooook........'],
} as const;

export const HERO_WIDTH = 16;
export const HERO_HEIGHT = 26;

export type HeroPose = 'stand' | 'walk' | 'read' | 'happy';

export interface HeroLook {
  readonly pose: HeroPose;
  /** -1 facing left, 0 facing you, 1 facing right. */
  readonly facing: -1 | 0 | 1;
  /** Milliseconds, drives the walk cycle, blinking and breathing. */
  readonly t: number;
  readonly motion: boolean;
}

/** Moves the face's features one pixel towards where the character looks. */
function turn(row: string, dir: -1 | 0 | 1): string {
  if (dir === 0) return row;
  const chars = row.split('');
  const features = new Set(['e', 'w', 'm', 'c']);
  const order = dir > 0 ? [...chars.keys()].reverse() : [...chars.keys()];
  for (const i of order) {
    const ch = chars[i] ?? '';
    const j = i + dir;
    if (!features.has(ch) || chars[j] !== 's') continue;
    chars[j] = ch;
    chars[i] = 's';
  }
  return chars.join('');
}

function paintRows(g: G, rows: readonly string[], x: number, y: number, flip: boolean): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const colour = PAL[row[rx] ?? ''];
      if (colour) px(g, colour, x + (flip ? row.length - 1 - rx : rx), y + ry, 1, 1);
    }
  });
}

/** One arm: sleeve then hand, `dy` lifts or lowers it, `up` raises it overhead. */
function arm(g: G, x: number, y: number, dy: number, up: boolean): void {
  if (up) {
    px(g, INK, x, y + 4, 4, 10);
    px(g, PAL.s ?? '', x + 1, y + 5, 2, 3);
    px(g, PAL.t ?? '', x + 1, y + 8, 2, 5);
    return;
  }
  px(g, INK, x, y + 12 + dy, 4, 9);
  px(g, PAL.t ?? '', x + 1, y + 13 + dy, 2, 4);
  px(g, PAL.s ?? '', x + 1, y + 17 + dy, 2, 3);
}

/** Paints the character with its feet on `baseY`. */
export function paintHero(g: G, x: number, baseY: number, look: HeroLook): void {
  const { pose, facing, t, motion } = look;
  const step = motion && pose === 'walk' ? Math.floor(t / 130) % 4 : 0;
  // Passing steps (1, 3) lift the whole body a pixel.
  const rise = step % 2 === 1 ? 1 : 0;
  const breathe = motion && pose === 'stand' && Math.floor(t / 900) % 2 === 1 ? 1 : 0;
  const hop = motion && pose === 'happy' ? Math.round(Math.abs(Math.sin(t / 130)) * 3) : 0;
  const y = baseY - HERO_HEIGHT - rise - hop;
  const ix = Math.round(x);

  // Arms behind the torso's outline.
  const swing = step === 0 ? 1 : step === 2 ? -1 : 0;
  if (pose === 'happy') {
    arm(g, ix, y, 0, true);
    arm(g, ix + 12, y, 0, true);
  } else if (pose !== 'read') {
    arm(g, ix, y, swing + breathe, false);
    arm(g, ix + 12, y, -swing + breathe, false);
  }

  const legs = step === 0 ? LEGS.left : step === 2 ? LEGS.right : LEGS.stand;
  paintRows(g, pose === 'walk' ? legs : LEGS.stand, ix, y + 20, false);
  paintRows(g, TORSO, ix, y + 12 + breathe, false);

  let head = HEAD;
  const blinking = motion && t % 3400 < 140;
  const patch = pose === 'happy' ? HAPPY_EYES : pose === 'read' ? READ_EYES : blinking ? BLINK : undefined;
  if (patch) head = head.map((row, i) => patch[i] ?? row);
  const dir = pose === 'read' ? 0 : facing;
  head = head.map((row) => turn(row, dir));
  // The head nods a touch with each step.
  paintRows(g, head, ix, y + (step === 1 ? 1 : 0) + breathe, false);

  if (pose === 'read') {
    // Both hands come up in front of the chest to hold the letter.
    px(g, INK, ix + 2, y + 13, 12, 4);
    px(g, PAL.s ?? '', ix + 3, y + 14, 3, 2);
    px(g, PAL.s ?? '', ix + 10, y + 14, 3, 2);
  }
}
