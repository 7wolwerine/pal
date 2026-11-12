/**
 * The assistants, hand-drawn at 20x20. Each look is drawn as its left half
 * and mirrored, so it is always symmetric and tidy; the face (eyes with a
 * glint, cheeks, mouth) is added on top by one shared routine, so every look
 * can blink, do its own little gesture, and look happy or sad the same way.
 */

export const SPRITE_IDS = ['pal', 'palNeutral', 'palDark', 'girl', 'mom', 'grandma', 'cat', 'dog'] as const;
export type SpriteId = (typeof SPRITE_IDS)[number];

export const SPRITE_SIZE = 20;

export type Frame = 'base' | 'blink' | 'quirk';
export type SpriteMood = 'happy' | 'sad';

const PALETTE: Record<string, string> = {
  k: '#4b1528',
  s: '#f8d6c0',
  S: '#e9b39c',
  e: '#2b1d24',
  w: '#ffffff',
  c: '#f4a3b4',
  m: '#9a3f52',
  h: '#8a5a34',
  H: '#5a3a22',
  y: '#b07a48',
  g: '#e2e0d8',
  G: '#a8a59c',
  p: '#ed93b1',
  P: '#c95a88',
  l: '#f9c4d8',
  o: '#ef9f27',
  O: '#c46a1a',
  n: '#fff1dc',
  b: '#c98a3a',
  B: '#8a5a1e',
  d: '#5a3410',
  t: '#5dcaa5',
  T: '#3c9b80',
  v: '#afa9ec',
  V: '#7a70d0',
  r: '#e24b4a',
  a: '#7fc4f0',
  q: '#d9a066',
  u: '#7a4a2a',
};

interface Look {
  /** Left halves, ten characters each; mirrored into twenty. */
  readonly half: readonly string[];
  /** Row of the top of the eyes. */
  readonly eyes: number;
  /** Extra single pixels on top of the mirrored grid: [x, y, palette char]. */
  readonly extra?: readonly (readonly [number, number, string])[];
  /** The little gesture, as more extra pixels. */
  readonly quirk?: readonly (readonly [number, number, string])[];
  readonly cheeks?: boolean;
  readonly mouth?: 'smile' | 'cat' | 'flat' | 'grin';
}

const LOOKS: Record<Exclude<SpriteId, 'palDark'>, Look> = {
  pal: {
    half: [
      '......kkkk',
      '....kkpppp',
      '...kpppppp',
      '..kppppppp',
      '..kppppppp',
      '.kpppppppp',
      '.kpppppppp',
      'kppppppppp',
      'kppppppppp',
      'kppppppppp',
      'kppppppppp',
      'kppppppppp',
      'kppppppppp',
      '.kpppppppp',
      '.kPppppppp',
      '..kPpppppp',
      '..kkPPpppp',
      '....kkPPPP',
      '......kkkk',
      '..........',
    ],
    eyes: 8,
    extra: [[4, 4, 'l'], [5, 4, 'l'], [3, 5, 'l'], [4, 5, 'l'], [4, 6, 'l']],
    cheeks: true,
    mouth: 'smile',
    quirk: [[8, 12, 'w'], [9, 12, 'w'], [10, 12, 'w'], [11, 12, 'w']],
  },
  palNeutral: {
    half: [],
    eyes: 8,
    mouth: 'flat',
  },
  cat: {
    half: [
      '..k.......',
      '..kOk.....',
      '.kOpOk....',
      '.kOppOk...',
      '.kOoooOkkk',
      'kOooooooOo',
      'koooooooOo',
      'koooooooOo',
      'kooooooooo',
      'kooooooooo',
      'koooooonnn',
      'kooooonnnn',
      '.koooonnnn',
      '.kkoooonnn',
      '..kkoooooo',
      '...kkkoooo',
      '...kOooooo',
      '..kOoooonn',
      '..kOoooonn',
      '..kkkkkkkk',
    ],
    eyes: 8,
    extra: [[9, 11, 'P'], [10, 11, 'P']],
    cheeks: true,
    mouth: 'cat',
    quirk: [[16, 1, '.'], [16, 2, '.'], [17, 2, 'k'], [15, 2, 'k']],
  },
  dog: {
    half: [
      '..........',
      '....kkkkkk',
      '...kbbbbbb',
      '..kbbbbbbb',
      'kkkbbbbbbb',
      'kddkbbbbbb',
      'kddkbbbbbb',
      'kddkbbbbbb',
      'kddkbbbbbb',
      'kddkbbbbbb',
      'kddkbbbnnn',
      '.kdkbbnnnn',
      '.kkkbbnnnn',
      '...kbbnnnn',
      '...kkbbnnn',
      '....kkbbbb',
      '.....kkkkk',
      '....kBbbbb',
      '....kBbbnn',
      '....kkkkkk',
    ],
    eyes: 7,
    extra: [[9, 11, 'e'], [10, 11, 'e'], [8, 11, 'e'], [11, 11, 'e'], [9, 12, 'e'], [10, 12, 'e'], [4, 2, 'y'], [5, 2, 'y'], [6, 2, 'y'], [4, 3, 'y']],
    mouth: 'smile',
    quirk: [[9, 15, 'r'], [10, 15, 'r'], [9, 16, 'r'], [10, 16, 'r']],
  },
  girl: {
    half: [
      '.....kkkkk',
      '...kkHHhhh',
      '..kHhhhhhh',
      'ppkhhhhhhh',
      'pPkhhhhhhh',
      'ppkhhhshhh',
      '.kHhssssss',
      'kHhsssssss',
      'kHhsssssss',
      'kHhsssssss',
      'kHhsssssss',
      'kHhksssssss'.slice(0, 10),
      'kHk.kSssss',
      '.kk..kSSSS',
      '......kkss',
      '.....kPppp',
      '....kPpppp',
      '...kPppppp',
      '...kPppppp',
      '...kkkkkkk',
    ],
    eyes: 8,
    extra: [[5, 2, 'y'], [6, 2, 'y'], [7, 2, 'y']],
    cheeks: true,
    mouth: 'smile',
    quirk: [[0, 3, '.'], [0, 4, '.'], [0, 5, '.'], [19, 3, '.'], [19, 4, '.'], [19, 5, '.'], [0, 2, 'p'], [19, 2, 'p']],
  },
  mom: {
    half: [
      '.....kkkkk',
      '...kkhhhhh',
      '..khhhhhhh',
      '.khhhhhhhh',
      '.khhhhhhhh',
      'khhhsshhhs',
      'khhsssssss',
      'khhsssssss',
      'khhsssssss',
      'khhsssssss',
      'khhsssssss',
      'khhkssssss',
      'khh.kSssss',
      'khh..kSSSS',
      '.kk..kkkss',
      '...kkTtttt',
      '..kTtttttt',
      '.kTtttttww',
      '.kTttttwww',
      '.kkkkkkkkk',
    ],
    eyes: 8,
    extra: [
      // the baby she holds, swaddled in white
      [10, 15, 'k'], [11, 15, 'k'], [12, 15, 'k'], [13, 15, 'k'], [14, 15, 'k'],
      [9, 16, 'k'], [10, 16, 'w'], [11, 16, 's'], [12, 16, 's'], [13, 16, 's'], [14, 16, 'w'], [15, 16, 'k'],
      [9, 17, 'k'], [10, 17, 'w'], [11, 17, 'e'], [12, 17, 's'], [13, 17, 'e'], [14, 17, 'w'], [15, 17, 'k'],
      [9, 18, 'k'], [10, 18, 'w'], [11, 18, 'c'], [12, 18, 's'], [13, 18, 'c'], [14, 18, 'w'], [15, 18, 'k'],
      [10, 19, 'k'], [11, 19, 'k'], [12, 19, 'k'], [13, 19, 'k'], [14, 19, 'k'],
      [4, 1, 'y'], [5, 1, 'y'], [6, 1, 'y'],
    ],
    cheeks: true,
    mouth: 'smile',
    quirk: [[11, 17, 's'], [13, 17, 's'], [12, 18, 'm']],
  },
  grandma: {
    half: [
      '.......kkk',
      '......kggg',
      '......kggg',
      '....kkkkGg',
      '...kgggggg',
      '..kggggggg',
      '.kgggsssss',
      '.kggssssss',
      '.kgsssssss',
      '.kgsssssss',
      '.kgsssssss',
      '.kgsssssss',
      '..kSssssss',
      '...kSSssss',
      '....kkkkSS',
      '....kVvvvv',
      '...kVvvvvw',
      '..kVvvvvvw',
      '..kVvvvvvw',
      '..kkkkkkkk',
    ],
    eyes: 8,
    extra: [
      // round glasses
      [5, 7, 'u'], [6, 7, 'u'], [7, 7, 'u'], [8, 7, 'u'], [4, 8, 'u'], [4, 9, 'u'], [5, 10, 'u'], [6, 10, 'u'], [7, 10, 'u'], [8, 10, 'u'], [9, 8, 'u'],
      [11, 7, 'u'], [12, 7, 'u'], [13, 7, 'u'], [14, 7, 'u'], [15, 8, 'u'], [15, 9, 'u'], [11, 10, 'u'], [12, 10, 'u'], [13, 10, 'u'], [14, 10, 'u'], [10, 8, 'u'],
    ],
    cheeks: true,
    mouth: 'smile',
    quirk: [[8, 11, 'm'], [9, 11, 'm'], [10, 11, 'm'], [11, 11, 'm'], [9, 12, 'w'], [10, 12, 'w']],
  },
};

type Grid = string[][];

function mirror(half: readonly string[]): Grid {
  return half.map((row) => {
    const left = row.padEnd(10, '.').slice(0, 10).split('');
    return [...left, ...[...left].reverse()];
  });
}

function put(grid: Grid, x: number, y: number, c: string): void {
  const row = grid[y];
  if (row && x >= 0 && x < SPRITE_SIZE) row[x] = c;
}

/** Eyes, cheeks and mouth: the same for every look, so moods read the same on all of them. */
function addFace(grid: Grid, look: Look, frame: Frame, mood: SpriteMood): void {
  const ey = look.eyes;
  for (const [x0, glint] of [[6, 6], [12, 12]] as const) {
    if (frame === 'blink') {
      put(grid, x0, ey + 1, 'e');
      put(grid, x0 + 1, ey + 1, 'e');
      continue;
    }
    const dy = mood === 'sad' ? 1 : 0;
    put(grid, x0, ey + dy, 'e');
    put(grid, x0 + 1, ey + dy, 'e');
    put(grid, x0, ey + 1 + dy, 'e');
    put(grid, x0 + 1, ey + 1 + dy, 'e');
    put(grid, glint, ey + dy, 'w');
  }
  if (mood === 'sad') {
    // worried brows, and a tear
    put(grid, 6, ey - 1, 'e');
    put(grid, 7, ey - 2, 'e');
    put(grid, 13, ey - 1, 'e');
    put(grid, 12, ey - 2, 'e');
    put(grid, 6, ey + 3, 'a');
    put(grid, 6, ey + 4, 'a');
    put(grid, 5, ey + 5, 'a');
  } else if (look.cheeks) {
    put(grid, 4, ey + 2, 'c');
    put(grid, 5, ey + 2, 'c');
    put(grid, 14, ey + 2, 'c');
    put(grid, 15, ey + 2, 'c');
  }
  const my = ey + 3;
  if (mood === 'sad') {
    put(grid, 9, my, 'm');
    put(grid, 10, my, 'm');
    put(grid, 8, my + 1, 'm');
    put(grid, 11, my + 1, 'm');
    return;
  }
  switch (look.mouth ?? 'smile') {
    case 'smile':
      put(grid, 8, my, 'm');
      put(grid, 11, my, 'm');
      put(grid, 9, my + 1, 'm');
      put(grid, 10, my + 1, 'm');
      break;
    case 'cat':
      put(grid, 9, my + 1, 'm');
      put(grid, 10, my + 1, 'm');
      put(grid, 8, my + 2, 'm');
      put(grid, 11, my + 2, 'm');
      break;
    case 'flat':
      put(grid, 8, my + 1, 'm');
      put(grid, 9, my + 1, 'm');
      put(grid, 10, my + 1, 'm');
      put(grid, 11, my + 1, 'm');
      break;
    case 'grin':
      for (let x = 8; x <= 11; x++) put(grid, x, my, 'm');
      put(grid, 9, my + 1, 'm');
      put(grid, 10, my + 1, 'm');
      break;
  }
}

/** The rows of one frame of one look. */
export function frameRows(id: SpriteId, frame: Frame = 'base', mood: SpriteMood = 'happy'): string[] {
  if (id === 'palDark') return darkRows(frame);
  const look = LOOKS[id];
  const half = look.half.length ? look.half : LOOKS.pal.half;
  const extra = look.half.length ? look.extra : LOOKS.pal.extra;
  const grid = mirror(half);
  for (const [x, y, c] of extra ?? []) put(grid, x, y, c);
  addFace(grid, look, frame, mood);
  if (frame === 'quirk' && mood === 'happy') for (const [x, y, c] of look.quirk ?? []) put(grid, x, y, c);
  return grid.map((row) => row.join(''));
}

/** PAL's true face, for the horror replay: violet, narrowed eyes, a jagged grin. */
function darkRows(frame: Frame): string[] {
  const grid = mirror(LOOKS.pal.half.map((row) => row.replace(/p/g, 'v').replace(/P/g, 'V')));
  for (const x of [5, 6, 7, 12, 13, 14]) put(grid, x, 9, 'e');
  if (frame !== 'blink') for (const x of [6, 7, 12, 13]) put(grid, x, 10, 'e');
  for (let x = 6; x <= 13; x++) put(grid, x, 13 + (x % 2), 'e');
  return grid.map((row) => row.join(''));
}

/** Draws one frame of a look onto a canvas (cleared first). */
export function drawSprite(canvas: HTMLCanvasElement, id: SpriteId, frame: Frame = 'base', mood: SpriteMood = 'happy'): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  frameRows(id, frame, mood).forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = PALETTE[row[x] ?? ''];
      if (!colour) continue;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    }
  });
}

function blankCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  canvas.className = 'sprite';
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

/** A still sprite. */
export function sprite(id: SpriteId, mood: SpriteMood = 'happy'): HTMLCanvasElement {
  const canvas = blankCanvas();
  drawSprite(canvas, id, 'base', mood);
  return canvas;
}

// ---------- idle animation ----------

const BLINK_MS = 140;
const QUIRK_MS = 520;
const TICK_MS = 70;
/** A sprite that never made it into the page is dropped after this long. */
const ORPHAN_MS = 10_000;

interface Actor {
  readonly canvas: HTMLCanvasElement;
  readonly id: SpriteId;
  readonly createdAt: number;
  shown: string;
  seen: boolean;
  blinkAt: number;
  quirkAt: number;
}

const actors = new Set<Actor>();
let ticker: number | undefined;

const between = (min: number, max: number): number => min + Math.random() * (max - min);

function moodOf(canvas: HTMLCanvasElement): SpriteMood {
  return canvas.dataset.mood === 'sad' ? 'sad' : 'happy';
}

function tick(): void {
  const now = performance.now();
  for (const actor of actors) {
    if (!actor.canvas.isConnected) {
      // Removed from the page, or never added to it: stop animating it.
      if (actor.seen || now - actor.createdAt > ORPHAN_MS) actors.delete(actor);
      continue;
    }
    actor.seen = true;
    if (now >= actor.blinkAt + BLINK_MS) actor.blinkAt = now + between(2200, 4800);
    if (now >= actor.quirkAt + QUIRK_MS) actor.quirkAt = now + between(4000, 8000);
    const mood = moodOf(actor.canvas);
    const frame: Frame = now >= actor.quirkAt && mood === 'happy' ? 'quirk' : now >= actor.blinkAt ? 'blink' : 'base';
    const key = `${frame}:${mood}`;
    if (key !== actor.shown) {
      actor.shown = key;
      drawSprite(actor.canvas, actor.id, frame, mood);
    }
  }
  if (actors.size === 0 && ticker !== undefined) {
    window.clearInterval(ticker);
    ticker = undefined;
  }
}

/** Makes a sprite look happy or sad from now on. */
export function setSpriteMood(canvas: HTMLCanvasElement, id: SpriteId, mood: SpriteMood): void {
  canvas.dataset.mood = mood;
  drawSprite(canvas, id, 'base', mood);
}

/**
 * A sprite that blinks now and then and has one small gesture of its own.
 * It stops by itself once it leaves the page. Stays still for players who
 * asked their system for reduced motion.
 */
export function livingSprite(id: SpriteId): HTMLCanvasElement {
  const canvas = sprite(id);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return canvas;
  const now = performance.now();
  actors.add({
    canvas,
    id,
    createdAt: now,
    shown: 'base:happy',
    seen: false,
    blinkAt: now + between(800, 3200),
    quirkAt: now + between(2000, 6000),
  });
  ticker ??= window.setInterval(tick, TICK_MS);
  return canvas;
}
