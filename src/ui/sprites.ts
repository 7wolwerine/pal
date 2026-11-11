/**
 * Pixel sprites drawn from 12x12 character grids. These are stand-ins that
 * keep the game self-contained until the final animated pixel art exists.
 *
 * Each character has two extra frames, a blink and a small gesture of its
 * own, written as replacements for individual rows of the base grid.
 */

const PALETTE: Record<string, string> = {
  k: '#4b1528', // outline, eyes
  s: '#f5c4b3', // skin
  h: '#854f0b', // brown hair
  g: '#d3d1c7', // grey hair
  p: '#ed93b1', // pink
  r: '#e24b4a', // red
  w: '#ffffff',
  o: '#ef9f27', // orange fur
  b: '#ba7517', // brown fur
  d: '#633806', // dark ears
  t: '#5dcaa5', // teal
  v: '#afa9ec', // violet
  e: '#639922', // beetle green
};

export const SPRITES = {
  pal: [
    '............',
    '...pppppp...',
    '..pppppppp..',
    '.pppppppppp.',
    '.ppkppppkpp.',
    '.ppkppppkpp.',
    '.pppppppppp.',
    '.pkppppppkp.',
    '.ppkkkkkkpp.',
    '..pppppppp..',
    '...pppppp...',
    '............',
  ],
  girl: [
    '....hhhh....',
    '..hhhhhhhh..',
    '.phhsssshhp.',
    '.phsssssshp.',
    '.hhsksskshh.',
    '.hhsssssshh.',
    '..hssrrssh..',
    '...ssssss...',
    '...pppppp...',
    '..pppppppp..',
    '..pppppppp..',
    '...ss..ss...',
  ],
  mom: [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hsssssshh.',
    '..hsksskshh.',
    '..hsssssshh.',
    '...ssrrss.h.',
    '..tttttttt..',
    '.ttwwwwtttt.',
    '.twskskwttt.',
    '.twsssswttt.',
    '..twwwwttt..',
    '...tttttt...',
  ],
  grandma: [
    '.....gg.....',
    '...gggggg...',
    '..gggggggg..',
    '..gssssssg..',
    '..kwkskwkg..',
    '..gssssssg..',
    '...ssrrss...',
    '....ssss....',
    '..vvvwwvvv..',
    '.vvvwwwwvvv.',
    '.vvvwwwwvvv.',
    '..vvwwwwvv..',
  ],
  cat: [
    '.o........o.',
    '.oo......oo.',
    '.opo....opo.',
    '.oooooooooo.',
    '.oooooooooo.',
    '.okkooookko.',
    '.oooooooooo.',
    '.ooooppoooo.',
    '.ooowoowooo.',
    '..oooooooo..',
    '...oooooo...',
    '............',
  ],
  dog: [
    '............',
    '..bbbbbbbb..',
    '.dbbbbbbbbd.',
    'ddbbbbbbbbdd',
    'ddbkkbbkkbdd',
    'ddbbbbbbbbdd',
    '.dbbwwwwbbd.',
    '..bwwkkwwb..',
    '..bwwwwwwb..',
    '...bwrrwb...',
    '....bbbb....',
    '............',
  ],
  // Tesařík: a longhorn beetle with long swept antennae and a glossy shell.
  bug: [
    '.k........k.',
    '..k......k..',
    '...k....k...',
    '....dkkd....',
    '...dkwwkd...',
    '..dbhbbhbd..',
    '.dbbbkkbbbd.',
    '.dbbbbbbbbd.',
    '.dbhbbbbhbd.',
    '..dbbbbbbd..',
    '...dd..dd...',
    '..k......k..',
  ],
  // The same beetle with its antennae clapped to its head in despair.
  bugPanic: [
    '............',
    '...k....k...',
    '..k......k..',
    '..k.dkkd.k..',
    '..kdkwwkdk..',
    '..kdbhhbdk..',
    '...dbkkbd...',
    '..dbbbbbbd..',
    '..dbbbbbbd..',
    '...dbbbbd...',
    '..k.d..d.k..',
    '.k........k.',
  ],
} as const satisfies Record<string, readonly string[]>;

export type SpriteId = keyof typeof SPRITES;

export const SPRITE_SIZE = 12;

export type Frame = 'base' | 'blink' | 'quirk';

/** Row replacements, keyed by row index. */
type Patch = Readonly<Record<number, string>>;

export const FRAMES: Readonly<Record<SpriteId, { blink: Patch; quirk: Patch }>> = {
  // Laughs.
  pal: { blink: { 4: '.pppppppppp.' }, quirk: { 9: '..ppkkkkpp..' } },
  // Her bows bounce.
  girl: { blink: { 4: '.hhsssssshh.' }, quirk: { 1: '.phhhhhhhhp.', 3: '..hssssssh..' } },
  // The baby dozes off.
  mom: { blink: { 3: '..hsssssshh.' }, quirk: { 8: '.twsssswttt.' } },
  // Pushes her glasses back up.
  grandma: { blink: { 4: '..kkkskkkg..' }, quirk: { 3: '..kwkskwkg..', 4: '..gssssssg..' } },
  // An ear twitches.
  cat: { blink: { 5: '.oooooooooo.' }, quirk: { 0: '..........o.', 1: '.o.......oo.' } },
  // Tongue out.
  dog: { blink: { 4: 'ddbbbbbbbbdd' }, quirk: { 10: '....brrb....' } },
  // Antennae wave.
  bug: { blink: { 4: '...dkkkkd...' }, quirk: { 0: 'k..........k', 1: '.k......k...' } },
  // Trembling.
  bugPanic: { blink: { 4: '..kdkkkkdk..' }, quirk: { 6: '..dbkkbd....' } },
};

/** The rows of one frame of a sprite. */
export function frameRows(id: SpriteId, frame: Frame): readonly string[] {
  if (frame === 'base') return SPRITES[id];
  const patch = FRAMES[id][frame];
  return SPRITES[id].map((row, index) => patch[index] ?? row);
}

function paint(canvas: HTMLCanvasElement, rows: readonly string[]): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  rows.forEach((row, y) => {
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
export function sprite(id: SpriteId): HTMLCanvasElement {
  const canvas = blankCanvas();
  paint(canvas, SPRITES[id]);
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
  shown: Frame;
  seen: boolean;
  blinkAt: number;
  quirkAt: number;
}

const actors = new Set<Actor>();
let ticker: number | undefined;

const between = (min: number, max: number): number => min + Math.random() * (max - min);

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
    const frame: Frame = now >= actor.quirkAt ? 'quirk' : now >= actor.blinkAt ? 'blink' : 'base';
    if (frame !== actor.shown) {
      actor.shown = frame;
      paint(actor.canvas, frameRows(actor.id, frame));
    }
  }
  if (actors.size === 0 && ticker !== undefined) {
    window.clearInterval(ticker);
    ticker = undefined;
  }
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
    shown: 'base',
    seen: false,
    blinkAt: now + between(800, 3200),
    quirkAt: now + between(2000, 6000),
  });
  ticker ??= window.setInterval(tick, TICK_MS);
  return canvas;
}
