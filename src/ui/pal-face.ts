import { prefersReducedMotion } from './dom.ts';

/**
 * PAL's own face, drawn at 16x16 so it can be genuinely cute: a round head,
 * big sparkly eyes and a soft smile. A separate, higher-resolution renderer
 * from the 12x12 cast sprites. It blinks on its own and can switch between a
 * neutral mood, a happy one, and the sinister face kept for the horror replay.
 */
export type PalMood = 'neutral' | 'happy' | 'sad' | 'dark';

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
  body: '#8f7ed0',
  hi: '#b9aef0',
  rim: '#574a9c',
  eye: '#19112b',
  glint: '#c9bdf2',
  mouth: '#19112b',
  blush: null,
};

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

function paint(g: CanvasRenderingContext2D, mood: PalMood, blink: boolean): void {
  g.clearRect(0, 0, SIZE, SIZE);
  const p = mood === 'dark' ? SOUR : SWEET;

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
  if (mood === 'dark') {
    // A jagged grin with teeth.
    for (let x = 4; x <= 11; x++) g.fillRect(x, 11, 1, 1);
    for (let x = 5; x <= 11; x += 2) dot(g, p.body, x, 11);
    for (let x = 4; x <= 10; x += 2) g.fillRect(x, 12, 1, 1);
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

  const draw = (blink: boolean): void => {
    if (g) paint(g, mood, blink);
  };

  const scheduleBlink = (): void => {
    blinkTimer = window.setTimeout(() => {
      draw(true);
      openTimer = window.setTimeout(() => {
        draw(false);
        scheduleBlink();
      }, 130);
    }, 1800 + Math.random() * 2800);
  };

  draw(false);
  if (!prefersReducedMotion()) scheduleBlink();

  return {
    el,
    setMood(next) {
      mood = next;
      draw(false);
    },
    stop() {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(openTimer);
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
