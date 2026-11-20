import { prefersReducedMotion } from './dom.ts';

/**
 * PAL's own face, drawn at 16x16 so it can be genuinely cute: a round head,
 * big sparkly eyes and a soft smile. A separate, higher-resolution renderer
 * from the 12x12 cast sprites. It blinks on its own and can switch between a
 * neutral mood, a happy one, and the true face kept for the end: the same
 * round head with the sweetness gone. One eye bulges, the other is a slit,
 * the grin is too wide, crooked and full of teeth, and the picture itself
 * twitches and tears, as if the mask no longer held.
 */
/** 'evil' is PAL turned bad but still PAL: the pink head, angry brows, red eyes, a sly grin. 'dark' is the true face. */
export type PalMood = 'neutral' | 'happy' | 'sad' | 'evil' | 'dark';

const SIZE = 16;

interface Palette {
  readonly body: string;
  readonly hi: string;
  readonly rim: string;
  readonly eye: string;
  readonly glint: string;
  readonly mouth: string;
  readonly blush: string | null;
}

const SWEET: Palette = {
  body: '#f4a6c6',
  hi: '#ffd4e6',
  rim: '#d77ba2',
  eye: '#53304a',
  glint: '#ffffff',
  mouth: '#c05a86',
  blush: '#ff9ab5',
};

const SOUR: Palette = {
  body: '#7a68b4',
  hi: '#9585cc',
  rim: '#2b2052',
  eye: '#140c24',
  glint: '#ece6b4',
  mouth: '#140c24',
  blush: null,
};

/** PAL gone bad: still pink, a shade hotter, with red eyes. */
const EVIL: Palette = {
  body: '#ee7fb0',
  hi: '#ffc0dc',
  rim: '#a8366a',
  eye: '#d0142c',
  glint: '#ffe36a',
  mouth: '#5a1030',
  blush: null,
};

/** The sweet face as the true one wears it: every colour a little dead. */
const MASK: Palette = {
  body: '#b99ac0',
  hi: '#d8c2dc',
  rim: '#2b2052',
  eye: '#140c24',
  glint: '#ece6b4',
  mouth: '#140c24',
  blush: '#8c1838',
};

/** What the true face is doing this instant, besides staring. */
type Quirk = 'none' | 'wide' | 'lid' | 'dart' | 'jaw' | 'mask';

/**
 * The true face, the whole head, one character per pixel:
 * o outline, b skin gone grey, h what is left of the shine, n sunken shadow,
 * w yellowed white (eyeball), t teeth, v a burst vein, r the red of a pupil,
 * k pitch black, d the dark of the throat, g gums, y a rotten tooth, l drool.
 * The same round head as the sweet one, but crooked: the left eye bulges out
 * of its socket with a pinprick pupil, the right one is a red slit under a
 * brow pulled down hard, a crack runs from the crown, and the grin is too
 * wide, higher on one side, with jagged teeth, a missing one and a drip.
 */
const DARK_FACE = [
  '.....oooooo.....',
  '...oohhbbbboo...',
  '..ohhbbbbobbno..',
  '.ohboooobobbbno.',
  'obowwvwobbbbkkko',
  'owwvwwwwobkkkbno',
  'owwwwrkwobkrrkno',
  'owvwwkwwobbkkbno',
  'obowwwwobbbbbbno',
  'obnoooonbbbbbbgo',
  'obkggggggggggtko',
  'okgtttdttydtttko',
  '.oktdtdddddtdko.',
  '..okddtdtdtdko..',
  '...okttgttgko...',
  '.....olooo......',
] as const;

/** Rows a tic swaps in for an instant, by row number. */
const TICS: Record<Exclude<Quirk, 'none' | 'mask'>, Readonly<Record<number, string>>> = {
  // The slit tears wide open: a second bloodshot eye, looking somewhere else.
  wide: {
    4: 'obowwvwobokkkkko',
    5: 'owwvwwwwobkwwwko',
    6: 'owwwwrkwobwwwrko',
    7: 'owvwwkwwobkvwwko',
    8: 'obowwwwobbbkkkno',
  },
  // The bulging eye's lid drops halfway; the pupil stays on you.
  lid: {
    4: 'obooooooobbbkkko',
    5: 'oookkkkkobkkkbno',
    6: 'owwwwrkwobkrrkno',
  },
  // The pupil jumps to the corner of the eye.
  dart: {
    5: 'owwvwwrkobkkkbno',
    6: 'owwwwwkwobkrrkno',
    7: 'owvwwwwwobbkkbno',
  },
  // The jaw drops open on nothing but throat, and the drip runs longer.
  jaw: {
    12: '.oktddddddddtko.',
    13: '..okddddddddko..',
    14: '...okdtddtko....',
    15: '.....olooo......',
  },
};

const DARK_INK: Record<string, string> = {
  o: '#1b1024',
  b: '#977597',
  h: '#b597b0',
  n: '#634a70',
  w: '#efe8cc',
  t: '#e2d394',
  v: '#c0304a',
  r: '#ff2a4d',
  k: '#0e0814',
  d: '#3d0818',
  g: '#a3244a',
  y: '#9c8f45',
  l: '#a8dcb4',
};

function paintTrueFace(g: CanvasRenderingContext2D, quirk: Quirk): void {
  g.clearRect(0, 0, SIZE, SIZE);
  const tic = quirk === 'none' || quirk === 'mask' ? undefined : TICS[quirk];
  DARK_FACE.forEach((base, y) => {
    const row = tic?.[y] ?? base;
    for (let x = 0; x < row.length; x++) {
      const ink = DARK_INK[row[x] ?? '.'];
      if (ink) dot(g, ink, x, y);
    }
  });
}

const TEAR_INKS = ['#3dff8b', '#ff2a4d', '#ece6b4', '#140c24'] as const;

/** Tears a couple of pixel rows sideways and drops a few wrong pixels in. */
function tear(g: CanvasRenderingContext2D): void {
  const pick = (n: number): number => Math.floor(Math.random() * n);
  for (let i = 1 + pick(2); i > 0; i--) {
    const y = 2 + pick(12);
    const rows = 1 + pick(2);
    const dx = (pick(2) ? 1 : -1) * (1 + pick(2));
    const strip = g.getImageData(0, y, SIZE, rows);
    g.clearRect(0, y, SIZE, rows);
    g.putImageData(strip, dx, y);
  }
  for (let i = 2 + pick(3); i > 0; i--) dot(g, TEAR_INKS[pick(TEAR_INKS.length)] ?? SOUR.eye, 2 + pick(12), 2 + pick(12));
}

/** A 3-wide, 4-tall rounded eye with a highlight, its top-left at (x, y). */
const EYE_PIXELS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
  [1, 3],
] as const;

function dot(g: CanvasRenderingContext2D, colour: string, x: number, y: number): void {
  g.fillStyle = colour;
  g.fillRect(x, y, 1, 1);
}

function paintEye(g: CanvasRenderingContext2D, p: Palette, x: number, y: number): void {
  for (const [dx, dy] of EYE_PIXELS) dot(g, p.eye, x + dx, y + dy);
  dot(g, p.glint, x, y + 1);
}

function paint(g: CanvasRenderingContext2D, mood: PalMood, blink: boolean, quirk: Quirk = 'none'): void {
  // For one frame the old sweet smile is back, in the wrong colours: the mask, held up again.
  if (mood === 'dark' && quirk === 'mask') return paintFace(g, 'happy', false, 'none', MASK);
  paintFace(g, mood, blink, quirk, mood === 'dark' ? SOUR : mood === 'evil' ? EVIL : SWEET);
}

function paintFace(g: CanvasRenderingContext2D, mood: PalMood, blink: boolean, quirk: Quirk, p: Palette): void {
  if (mood === 'dark') return paintTrueFace(g, quirk);
  g.clearRect(0, 0, SIZE, SIZE);

  // Round head: a filled pixel circle with a soft rim and a top-left highlight.
  const cx = 7.5;
  const cy = 8;
  const r = 7.3;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r - 1.1) dot(g, x - cx + (y - cy) < -4.5 ? p.hi : p.body, x, y);
      else if (d <= r) dot(g, p.rim, x, y);
    }
  }

  // Eyes, or a gentle closed line while blinking.
  if (blink) {
    for (const x of [4, 9]) {
      dot(g, p.eye, x, 8);
      dot(g, p.eye, x + 1, 8);
      dot(g, p.eye, x + 2, 8);
    }
  } else {
    paintEye(g, p, 4, 6);
    paintEye(g, p, 9, 6);
  }

  if (p.blush) {
    g.fillStyle = p.blush;
    g.fillRect(3, 10, 2, 1);
    g.fillRect(11, 10, 2, 1);
  }

  // Mouth.
  g.fillStyle = p.mouth;
  if (mood === 'evil') {
    // Brows pulled down hard towards the middle.
    for (const [x, y] of [[3, 4], [4, 4], [5, 5], [6, 5], [9, 5], [10, 5], [11, 4], [12, 4]] as const) dot(g, p.mouth, x, y);
    // A wide, lopsided grin with one fang.
    for (const [x, y] of [[4, 10], [5, 11], [6, 11], [7, 12], [8, 12], [9, 12], [10, 11], [11, 10], [12, 9]] as const) g.fillRect(x, y, 1, 1);
    dot(g, '#ffffff', 9, 11);
  } else if (mood === 'sad') {
    // A wobbly frown and a fat tear.
    for (const [x, y] of [
      [6, 12],
      [7, 11],
      [8, 11],
      [9, 12],
    ] as const) {
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = '#7fb2e5';
    g.fillRect(4, 10, 1, 2);
    g.fillRect(4, 12, 2, 1);
  } else if (mood === 'happy') {
    // An open, curved smile with a hint of tongue.
    for (const [x, y] of [
      [5, 11],
      [6, 12],
      [7, 12],
      [8, 12],
      [9, 12],
      [10, 11],
    ] as const) {
      g.fillRect(x, y, 1, 1);
    }
    dot(g, p.blush ?? p.mouth, 8, 13);
  } else {
    // A small, content curve.
    for (const [x, y] of [
      [6, 11],
      [7, 12],
      [8, 12],
      [9, 11],
    ] as const) {
      g.fillRect(x, y, 1, 1);
    }
  }
}

export interface PalFace {
  readonly el: HTMLCanvasElement;
  setMood(mood: PalMood): void;
  /** Stops the blink loop; call before discarding the face. */
  stop(): void;
}

export function createPalFace(initial: PalMood = 'neutral'): PalFace {
  const el = document.createElement('canvas');
  el.width = SIZE;
  el.height = SIZE;
  el.className = 'sprite';
  el.setAttribute('aria-hidden', 'true');
  const g = el.getContext('2d');
  if (g) g.imageSmoothingEnabled = false;

  let mood = initial;
  let blinkTimer = 0;
  let openTimer = 0;
  let twitchTimer = 0;

  const draw = (blink: boolean): void => {
    if (g) paint(g, mood, blink);
  };

  const scheduleBlink = (): void => {
    blinkTimer = window.setTimeout(() => {
      // The true face never blinks; it twitches instead.
      if (mood === 'dark') return scheduleBlink();
      draw(true);
      openTimer = window.setTimeout(() => {
        draw(false);
        scheduleBlink();
      }, 130);
    }, 1800 + Math.random() * 2800);
  };

  /** The true face cannot hold still: short tics, and the picture tearing. */
  const twitch = (): void => {
    window.clearTimeout(twitchTimer);
    if (mood !== 'dark' || !motion) return;
    const roll = Math.random();
    const quirk: Quirk =
      roll < 0.09 ? 'wide' : roll < 0.16 ? 'lid' : roll < 0.26 ? 'dart' : roll < 0.35 ? 'jaw' : roll < 0.39 ? 'mask' : 'none';
    if (g) {
      paint(g, 'dark', false, quirk);
      if (Math.random() < 0.2) tear(g);
    }
    twitchTimer = window.setTimeout(twitch, quirk === 'none' ? 120 + Math.random() * 700 : 70 + Math.random() * 110);
  };

  const motion = !prefersReducedMotion();
  draw(false);
  if (motion) {
    scheduleBlink();
    twitch();
  }

  return {
    el,
    setMood(next) {
      mood = next;
      draw(false);
      twitch();
    },
    stop() {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(openTimer);
      window.clearTimeout(twitchTimer);
    },
  };
}

const stills = new Map<string, HTMLCanvasElement>();

/** A static (non-blinking) 16x16 face, cached per mood, for drawing into scenes. */
export function palFaceImage(mood: PalMood): HTMLCanvasElement {
  const cached = stills.get(mood);
  if (cached) return cached;
  const el = document.createElement('canvas');
  el.width = SIZE;
  el.height = SIZE;
  const g = el.getContext('2d');
  if (g) {
    g.imageSmoothingEnabled = false;
    paint(g, mood, false);
  }
  stills.set(mood, el);
  return el;
}
