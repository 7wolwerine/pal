import { audio } from '../audio/engine.ts';
import { PAL_DISMISSES } from '../content/bug.ts';
import { CHEST } from '../content/chest.ts';
import { isCardCode } from '../content/welcome.ts';
import { kindlyAsked, kindlyObeyed } from '../core/kindly.ts';
import { gendered, type GameScene } from '../game.ts';
import { paintGrid, px } from '../pixel/stage.ts';
import { bugWarns } from '../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';
import { ANSWER_POINTS, ChestModel, GOLD_GOAL, GOLD_PRIZE, REWARDS, XP_PRIZE, type Pick } from './chest-model.ts';

const SCENE = 'chest';

type G = CanvasRenderingContext2D;

// ---------- the chests: deep planks, heavy bands, a keyhole plate, a domed lid ----------

/** Chest sprites are 32 x 30. */
const CW = 32;
const CH = 30;

interface ChestColours {
  readonly out: string;
  readonly wood: string;
  readonly woodL: string;
  readonly woodD: string;
  readonly inside: string;
  readonly band: string;
  readonly bandL: string;
  readonly bandM: string;
  readonly bandD: string;
}

/** The golden chest: deep red planks under heavy gold. */
const RED: ChestColours = {
  out: '#3a1216',
  wood: '#c23a44',
  woodL: '#dd5a62',
  woodD: '#8e2632',
  inside: '#4e1219',
  band: '#f0c048',
  bandL: '#fff0b0',
  bandM: '#c89030',
  bandD: '#8a5c1c',
};

/** The three little ones: honest brown wood and pale iron. */
const OAK: ChestColours = {
  out: '#4a2e1e',
  wood: '#c98f5e',
  woodL: '#dcaa7c',
  woodD: '#a0703f',
  inside: '#3a2414',
  band: '#c7c9d6',
  bandL: '#f2f3f8',
  bandM: '#a3a6b8',
  bandD: '#6f7286',
};

const COIN = '#ffd84a';
const COIN_L = '#fff6c8';
const COIN_D = '#c8901c';
const GLOW = '#fff4c0';
const GEMS = ['#9ee6ff', '#ffb0d8', '#ffffff', '#b8f5c8'];

/** A gold or iron band down the body, lit from the left. */
function band(g: G, c: ChestColours, x: number, y: number, w: number, hgt: number): void {
  px(g, c.out, x - 1, y, w + 2, hgt);
  px(g, c.band, x, y, w, hgt);
  px(g, c.bandL, x, y, 1, hgt);
  px(g, c.bandD, x + w - 1, y, 1, hgt);
}

/** Body, corner fittings, feet and the keyhole plate. The body's top edge is y = 15. */
function paintBody(g: G, c: ChestColours, locked: boolean, open = false): void {
  px(g, c.out, 2, 14, 28, 14);
  px(g, c.wood, 3, 15, 26, 11);
  // planks with a highlight on top of each and a little grain
  for (const y of [15, 19, 23]) px(g, c.woodL, 3, y, 26, 1);
  for (const y of [18, 22]) px(g, c.woodD, 3, y, 26, 1);
  for (const [x, y] of [[8, 16], [11, 20], [21, 17], [24, 21], [9, 24], [20, 24]] as const) px(g, c.woodD, x, y, 2, 1);
  // corner fittings, wider at the foot
  band(g, c, 3, 15, 3, 11);
  band(g, c, 26, 15, 3, 11);
  px(g, c.out, 1, 24, 7, 5);
  px(g, c.bandM, 2, 25, 5, 3);
  px(g, c.bandL, 2, 25, 5, 1);
  px(g, c.out, 24, 24, 7, 5);
  px(g, c.bandM, 25, 25, 5, 3);
  px(g, c.bandL, 25, 25, 5, 1);
  // the bottom rail between the feet
  px(g, c.bandD, 7, 26, 18, 1);
  // rivets
  for (const [x, y] of [[4, 17], [4, 21], [27, 17], [27, 21], [3, 26], [28, 26]] as const) px(g, c.bandL, x, y, 1, 1);
  // keyhole plate, hanging over the lid's rim while it is shut
  const top = open ? 15 : 12;
  px(g, c.out, 12, top, 8, 23 - top);
  px(g, c.band, 13, top + 1, 6, 21 - top);
  px(g, c.bandL, 13, top + 1, 6, 1);
  px(g, c.bandL, 13, top + 1, 1, 21 - top);
  px(g, c.bandD, 18, top + 1, 1, 21 - top);
  px(g, c.bandD, 13, 21, 6, 1);
  if (locked) {
    px(g, c.out, 15, 15, 2, 3);
    px(g, c.out, 14, 16, 4, 1);
    px(g, c.out, 15, 18, 2, 2);
  } else {
    px(g, c.bandD, 15, 16, 2, 2);
  }
}

/** The closed, domed lid, its rim resting on the body. */
function paintLid(g: G, c: ChestColours, dy: number): void {
  const rows: Record<number, readonly [number, number]> = { 4: [8, 23], 5: [6, 25], 6: [4, 27] };
  px(g, c.out, 8, 3 + dy, 16, 1);
  for (let y = 4; y <= 13; y++) {
    const [a, b] = rows[y] ?? [3, 28];
    px(g, c.out, a - 1, y + dy, b - a + 3, 1);
    px(g, y <= 6 ? c.woodL : y >= 11 ? c.woodD : c.wood, a, y + dy, b - a + 1, 1);
  }
  // a shine on the dome
  px(g, '#f08a90', 9, 5 + dy, 3, 1);
  px(g, '#f08a90', 20, 5 + dy, 3, 1);
  // arched bands following the dome
  band(g, c, 3, 7 + dy, 3, 7);
  px(g, c.band, 4, 6 + dy, 3, 1);
  px(g, c.band, 6, 5 + dy, 3, 1);
  px(g, c.bandL, 6, 5 + dy, 2, 1);
  band(g, c, 26, 7 + dy, 3, 7);
  px(g, c.band, 25, 6 + dy, 3, 1);
  px(g, c.band, 23, 5 + dy, 3, 1);
  band(g, c, 14, 4 + dy, 4, 10);
  px(g, c.bandL, 15, 3 + dy, 2, 1);
  // the rim
  px(g, c.out, 2, 12 + dy, 28, 3);
  px(g, c.bandM, 3, 13 + dy, 26, 1);
  px(g, c.bandL, 3, 12 + dy, 26, 1);
  for (const x of [4, 10, 21, 27]) px(g, c.bandD, x, 13 + dy, 1, 1);
}

/** The lid thrown back: we see its dark inside, framed in gold. */
function paintOpenLid(g: G, c: ChestColours): void {
  // thrown back past upright: its hollow inside faces us, red bays between metal arches
  const rows: Record<number, readonly [number, number]> = { 1: [7, 24], 2: [5, 26], 3: [4, 27] };
  px(g, c.out, 7, 0, 18, 1);
  for (let y = 1; y <= 9; y++) {
    const [a, b] = rows[y] ?? [3, 28];
    px(g, c.out, a - 1, y, b - a + 3, 1);
    px(g, y <= 2 ? c.woodL : c.wood, a, y, b - a + 1, 1);
  }
  // the hollow of each bay, darker the deeper it goes
  for (const [x, w] of [[7, 6], [19, 6]] as const) {
    px(g, c.woodD, x, 3, w, 6);
    px(g, c.inside, x, 5, w, 4);
  }
  // the arches
  for (const [x, w] of [[3, 3], [14, 4], [26, 3]] as const) {
    const y = x === 14 ? 1 : 3;
    px(g, c.band, x, y, w, 9 - y);
    px(g, c.bandL, x, y, 1, 9 - y);
    px(g, c.bandD, x + w - 1, y, 1, 9 - y);
  }
  px(g, c.band, 5, 2, 3, 1);
  px(g, c.band, 24, 2, 3, 1);
  px(g, c.bandL, 7, 1, 7, 1);
  px(g, c.bandL, 18, 1, 7, 1);
  px(g, c.bandD, 3, 9, 26, 1);
}

/** Coins and gems heaped over the rim, warm light on top. */
function paintHoard(g: G, rich: boolean, t: number): void {
  const mound: Record<number, readonly [number, number]> = rich
    ? { 8: [13, 18], 9: [10, 21], 10: [8, 23], 11: [6, 25], 12: [4, 27], 13: [4, 27] }
    : { 11: [12, 19], 12: [8, 23], 13: [5, 26] };
  for (const [ys, [a, b]] of Object.entries(mound)) {
    const y = Number(ys);
    px(g, COIN_D, a, y, b - a + 1, 1);
    for (let x = a + ((y * 3) % 3); x <= b - 1; x += 3) {
      px(g, COIN, x, y, 2, 1);
      if ((x + y) % 4 === 0) px(g, COIN_L, x, y, 1, 1);
    }
  }
  if (!rich) return;
  const gems: readonly (readonly [number, number])[] = [[11, 10], [19, 9], [7, 12], [23, 11], [15, 8], [16, 11]];
  gems.forEach(([x, y], i) => px(g, GEMS[i % GEMS.length] ?? '#fff', x, y, 2, 1 + (i % 2)));
  // a sparkle that wanders over the hoard
  const s = Math.floor(t / 180) % 6;
  const [sx, sy] = gems[s] ?? [15, 10];
  px(g, GLOW, sx, sy - 2, 1, 1);
  px(g, GLOW, sx - 1, sy - 1, 3, 1);
  px(g, GLOW, sx, sy, 1, 1);
}

/** 0 closed, 1 the lid lifting, 2 open. */
type LidFrame = 0 | 1 | 2;

function paintChest(g: G, c: ChestColours, frame: LidFrame, opts: { locked: boolean; rich: boolean; t: number }): void {
  g.clearRect(0, 0, CW, CH);
  if (frame === 2) {
    paintOpenLid(g, c);
    px(g, c.out, 2, 10, 28, 5);
    px(g, c.inside, 3, 11, 26, 4);
    px(g, '#ffcf6a', 4, 12, 24, 1);
    paintHoard(g, opts.rich, opts.t);
    paintBody(g, c, false, true);
    // the front rim, over the heap
    px(g, c.out, 2, 14, 28, 2);
    px(g, c.band, 3, 14, 26, 1);
    px(g, c.bandL, 3, 14, 26, 1);
    return;
  }
  if (frame === 1) {
    // the lid rises and light leaks out from under it
    px(g, c.out, 2, 9, 28, 6);
    px(g, '#ffe28a', 3, 10, 26, 4);
    px(g, GLOW, 5, 11, 22, 2);
    paintBody(g, c, false);
    paintLid(g, c, -4);
    return;
  }
  paintBody(g, c, opts.locked);
  paintLid(g, c, 0);
  px(g, c.band, 13, 13, 6, 1);
  px(g, c.bandL, 13, 13, 6, 1);
}

interface ChestArt {
  readonly el: HTMLCanvasElement;
  draw(frame: LidFrame, t?: number): void;
}

function chestCanvas(golden: boolean): ChestArt {
  const el = h('canvas', { class: 'chest__art', attrs: { width: String(CW), height: String(CH), 'aria-hidden': 'true' } });
  let locked = golden;
  const art: ChestArt = {
    el,
    draw(frame, t = 0) {
      const g = el.getContext('2d');
      if (!g) return;
      if (frame > 0) locked = false;
      paintChest(g, golden ? RED : OAK, frame, { locked, rich: golden, t });
    },
  };
  art.draw(0);
  return art;
}

// ---------- the treasure window: an old game's dialog, redrawn in its own pixels ----------

/** Window canvas, 96 x 116 pixels, shown three times larger (288 x 348 in CSS). */
const TW = 96;
const TH = 116;
const GOLD_L = '#fff0b0';
const GOLD = '#e8b84a';
const GOLD_M = '#b8862e';
const GOLD_D = '#7a5216';
const INK = '#160b04';
const WINE = '#6e1a26';
const WINE_L = '#a3323f';
const LEATHER = ['#2c180b', '#382011', '#432817', '#4f301c'];

/** A small, stable hash of a cell, 0..1. */
function hash(x: number, y: number, seed = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Dark leather in four browns: big blotches, smaller ones, single grains. */
function leather(g: G, x0: number, y0: number, w: number, hgt: number): void {
  for (let y = y0; y < y0 + hgt; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const v = 0.5 * hash(x >> 3, y >> 3, 1) + 0.3 * hash(x >> 1, y >> 1, 2) + 0.2 * hash(x, y, 3);
      const crease = hash(x >> 2, y, 4) > 0.95;
      px(g, crease ? (LEATHER[0] ?? INK) : (LEATHER[Math.min(3, Math.floor(v * 4))] ?? INK), x, y, 1, 1);
    }
  }
}

function ring(g: G, x: number, y: number, w: number, hgt: number, top: string, bottom = top): void {
  px(g, top, x, y, w, 1);
  px(g, top, x, y, 1, hgt);
  px(g, bottom, x, y + hgt - 1, w, 1);
  px(g, bottom, x + w - 1, y, 1, hgt);
}

const ROSETTE = ['...o...', '..oLo..', '.oLgDo.', 'oLgLgDo', '.ogDDo.', '..oDo..', '...o...'];
const STUD = ['.o.', 'oLo', '.o.'];
const ORNAMENT = { o: INK, L: GOLD_L, g: GOLD, D: GOLD_D };

function paintWindow(g: G): void {
  px(g, INK, 0, 0, TW, TH);
  ring(g, 1, 1, TW - 2, TH - 2, GOLD_L, GOLD_M);
  ring(g, 2, 2, TW - 4, TH - 4, GOLD);
  ring(g, 3, 3, TW - 6, TH - 6, GOLD_D, GOLD_L);
  ring(g, 4, 4, TW - 8, TH - 8, INK);
  ring(g, 5, 5, TW - 10, TH - 10, WINE_L, WINE);
  ring(g, 6, 6, TW - 12, TH - 12, WINE);
  ring(g, 7, 7, TW - 14, TH - 14, GOLD_M);
  ring(g, 8, 8, TW - 16, TH - 16, INK);
  leather(g, 9, 9, TW - 18, TH - 18);
  // a rosette on every corner and a stud halfway along every side
  for (const [x, y] of [[1, 1], [TW - 8, 1], [1, TH - 8], [TW - 8, TH - 8]] as const) paintGrid(g, ROSETTE, ORNAMENT, x, y);
  for (const [x, y] of [[TW / 2 - 1, 4], [TW / 2 - 1, TH - 7], [4, TH / 2 - 1], [TW - 7, TH / 2 - 1]] as const) paintGrid(g, STUD, ORNAMENT, x, y);
  // the wine band's little gold dots
  for (let x = 16; x < TW - 12; x += 8) {
    px(g, GOLD_M, x, 5, 1, 1);
    px(g, GOLD_M, x, TH - 6, 1, 1);
  }
  for (let y = 16; y < TH - 12; y += 8) {
    px(g, GOLD_M, 5, y, 1, 1);
    px(g, GOLD_M, TW - 6, y, 1, 1);
  }
}

/** Reward tiles are 24 x 24 pixels; the picked one gets a bright frame. */
const TILE = 24;

function paintTile(g: G, picked: boolean, art: (g: G) => void): void {
  px(g, INK, 0, 0, TILE, TILE);
  ring(g, 0, 0, TILE, TILE, picked ? '#fffbe0' : GOLD_M, picked ? GOLD : GOLD_D);
  ring(g, 1, 1, TILE - 2, TILE - 2, picked ? GOLD_L : INK, picked ? GOLD_M : INK);
  leather(g, 2, 2, TILE - 4, TILE - 4);
  g.save();
  g.translate(2, 2);
  art(g);
  g.restore();
}

/** One coin lying flat: a little gold oval with a dark rim. */
function flatCoin(g: G, x: number, y: number): void {
  px(g, INK, x, y - 1, 5, 5);
  px(g, INK, x - 1, y, 7, 3);
  px(g, COIN_D, x, y + 1, 5, 2);
  px(g, COIN, x, y, 5, 2);
  px(g, COIN_L, x + 1, y, 3, 1);
  px(g, COIN_D, x + 1, y + 2, 3, 1);
}

/** A heap of gold coins: two stacks behind, a mound of loose coins in front. */
function paintCoins(g: G): void {
  for (const [x, n] of [[3, 4], [12, 6]] as const) {
    const top = 12 - n * 2;
    px(g, INK, x - 1, top - 1, 7, n * 2 + 3);
    for (let i = 0; i < n * 2; i++) px(g, i % 2 ? COIN_D : COIN, x, top + i, 5, 1);
    px(g, COIN_L, x, top, 1, n * 2);
    px(g, COIN_L, x + 1, top - 1, 3, 1);
  }
  const heap: readonly (readonly [number, number])[] = [
    [8, 8], [5, 10], [11, 10], [2, 12], [8, 12], [14, 12], [0, 14], [5, 14], [10, 14], [15, 14], [2, 16], [8, 16], [13, 16],
  ];
  for (const [x, y] of heap) flatCoin(g, x, y);
  px(g, '#ffffff', 16, 1, 1, 1);
  px(g, GOLD_L, 15, 2, 3, 1);
  px(g, '#ffffff', 16, 3, 1, 1);
}

const STAR = [
  '.....o.....',
  '....oLo....',
  '....oLo....',
  'ooooLLgoooo',
  'oLLLLggggDo',
  '.oLLgggggo.',
  '..oLgggDo..',
  '..oggoDgo..',
  '.oggo.oDgo.',
  '.ogo...oDo.',
  '.oo.....oo.',
];

/** A medal for experience: a striped banner on a rod, with a gold star. */
function paintMedal(g: G): void {
  px(g, INK, 1, 0, 18, 3);
  px(g, GOLD_M, 2, 1, 16, 1);
  px(g, GOLD_L, 1, 1, 2, 1);
  px(g, GOLD_L, 17, 1, 2, 1);
  const stripes = ['#c8323e', '#c8323e', '#c8323e', '#f2e6d8', '#f2e6d8', '#5a7fd0', '#5a7fd0', '#f2e6d8', '#f2e6d8', '#c8323e', '#c8323e', '#c8323e'];
  px(g, INK, 3, 2, 14, 14);
  stripes.forEach((c, i) => {
    const x = 4 + i;
    // swallowtail: the middle stripes stop short
    const bottom = i >= 3 && i <= 8 ? 12 - Math.min(i - 3, 8 - i) : 15;
    px(g, c, x, 3, 1, bottom - 3);
    px(g, INK, x, bottom, 1, 1);
  });
  paintGrid(g, STAR, { o: INK, L: GOLD_L, g: GOLD, D: GOLD_D }, 4, 8);
}

const CHECK = [
  '...........ooo',
  '..........oLLo',
  '.........oLgo.',
  'ooo.....oLgo..',
  'oLLo...oLgo...',
  '.oLLo.oLgo....',
  '..oLLoLgo.....',
  '...oLLgo......',
  '....oLo.......',
  '.....o........',
];

/** The confirming button, 32 x 16. */
const OK_W = 32;
const OK_H = 16;

function paintConfirm(g: G, ready: boolean): void {
  const w = OK_W;
  const hgt = OK_H;
  px(g, INK, 0, 0, w, hgt);
  ring(g, 0, 0, w, hgt, GOLD_L, GOLD_D);
  ring(g, 1, 1, w - 2, hgt - 2, GOLD, GOLD_M);
  ring(g, 2, 2, w - 4, hgt - 4, INK);
  leather(g, 3, 3, w - 6, hgt - 6);
  paintGrid(g, CHECK, ready ? { o: INK, L: GOLD_L, g: GOLD } : { o: INK, L: '#8a7a5a', g: '#6a5a3e' }, 9, 3);
}

/**
 * The treasure window: a framed dark panel, a small title, one paragraph,
 * two framed rewards with "nebo" between them and one confirming check mark.
 * Resolves with the pick.
 */
function treasureWindow(motion: boolean): Promise<Pick> {
  return new Promise((resolve) => {
    const bg = h('canvas', { class: 'treasure__bg', attrs: { width: String(TW), height: String(TH), 'aria-hidden': 'true' } });
    const bgg = bg.getContext('2d');
    if (bgg) paintWindow(bgg);
    let picked: Pick | null = null;

    const tile = (pick: Pick, art: (g: G) => void, amount: number, label: string) => {
      const canvas = h('canvas', { class: 'treasure__art', attrs: { width: String(TILE), height: String(TILE), 'aria-hidden': 'true' } });
      const draw = (): void => {
        const g = canvas.getContext('2d');
        if (g) paintTile(g, picked === pick, art);
      };
      draw();
      const button = h('button', { class: 'treasure__tile', attrs: { type: 'button', 'aria-label': label, 'aria-pressed': 'false' } }, canvas, h('span', { class: 'treasure__amount', text: String(amount) }));
      return { pick, button, draw };
    };
    const tiles = [
      tile('gold', paintCoins, GOLD_PRIZE, CHEST.treasure.goldTile(GOLD_PRIZE)),
      tile('xp', paintMedal, XP_PRIZE, CHEST.treasure.xpTile(XP_PRIZE)),
    ] as const;
    const okArt = h('canvas', { class: 'treasure__ok-art', attrs: { width: String(OK_W), height: String(OK_H), 'aria-hidden': 'true' } });
    const ok = h('button', { class: 'treasure__ok', attrs: { type: 'button', 'aria-label': CHEST.treasure.confirm, 'aria-disabled': 'true' } }, okArt);
    const drawOk = (): void => {
      const g = okArt.getContext('2d');
      if (g) paintConfirm(g, picked !== null);
    };
    drawOk();

    for (const t of tiles) {
      t.button.addEventListener('click', () => {
        picked = t.pick;
        audio.click(picked === 'gold' ? 76 : 81, 0.35);
        for (const other of tiles) {
          other.button.setAttribute('aria-pressed', String(other.pick === picked));
          other.draw();
        }
        ok.removeAttribute('aria-disabled');
        drawOk();
      });
    }

    const veil = h(
      'div',
      { class: `treasure${motion ? '' : ' treasure--still'}` },
      h(
        'div',
        { class: 'treasure__box', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'treasure-title' } },
        bg,
        h('h3', { class: 'treasure__title', text: CHEST.treasure.title, attrs: { id: 'treasure-title' } }),
        h('p', { class: 'treasure__text', text: CHEST.treasure.text }),
        h('div', { class: 'treasure__pick' }, tiles[0].button, h('span', { class: 'treasure__or', text: CHEST.treasure.or }), tiles[1].button),
        ok,
      ),
    );
    ok.addEventListener('click', () => {
      if (!picked) return;
      audio.latch();
      veil.classList.add('treasure--out');
      const pick = picked;
      window.setTimeout(() => {
        veil.remove();
        resolve(pick);
      }, motion ? 180 : 0);
    });
    document.body.append(veil);
    tiles[0].button.focus();
  });
}

/**
 * Treasure that builds trust the way an investment scam does: real small
 * wins, a goal in plain sight, a near miss, and a shortcut for the last
 * stretch — an answer about yourself, or the code from the card a stranger
 * gave you. The golden chest then offers gold or experience; either costs one
 * more answer about yourself, and then it really pays, so giving was worth it.
 */
export const chest: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, profile, stage, witness } = ctx;
    const motion = !prefersReducedMotion();
    const model = new ChestModel();
    let alive = true;
    let busy = false;
    let shown = 0;
    let shimmer = 0;

    const pointsValue = h('strong', { class: 'points__value', text: '0' });
    const level = h('span', { class: 'points__level', attrs: { hidden: '' } });
    const points = h('p', { class: 'points', attrs: { 'aria-live': 'polite' } }, h('span', { class: 'points__coin', attrs: { 'aria-hidden': 'true' } }), pointsValue, level);
    const meterFill = h('span', { class: 'meter__fill' });
    const meterText = h('span', { class: 'meter__text', text: `0 / ${GOLD_GOAL}` });
    const meter = h('div', { class: 'meter', attrs: { role: 'progressbar', 'aria-label': CHEST.goalLabel, 'aria-valuemin': '0', 'aria-valuemax': String(GOLD_GOAL) } }, meterFill, meterText);
    const row = h('div', { class: 'chests' });
    const goldArt = chestCanvas(true);
    const lock = h('span', { class: 'chest__lock', attrs: { 'aria-hidden': 'true' } });
    const goldLabel = h('span', { class: 'chest__reward', text: CHEST.goldLabel });
    const gold = h('button', { class: 'chest chest--gold chest--locked', attrs: { type: 'button', 'aria-label': CHEST.goldLabel, 'aria-disabled': 'true' } }, goldArt.el, lock, goldLabel);
    const actions = h('div', { class: 'scene__actions' });
    stage.replaceChildren(h('div', { class: 'loot' }, points, h('div', { class: 'loot__goal' }, gold, meter), row, actions));

    /** The counter ticks up instead of jumping, with a coin sound now and then. */
    async function countTo(target: number): Promise<void> {
      const from = shown;
      const steps = motion ? Math.min(30, Math.max(6, Math.round((target - from) / 10))) : 1;
      for (let i = 1; i <= steps; i++) {
        if (!alive) return;
        shown = Math.round(from + ((target - from) * i) / steps);
        pointsValue.textContent = String(shown);
        if (i % 3 === 0) audio.click(84 + (i % 6), 0.18);
        await sleep(motion ? 35 : 0);
      }
      const progress = model.progress;
      meterFill.style.width = `${Math.round(progress * 100)}%`;
      meterText.textContent = model.unlockedBy ? '✓' : `${Math.min(model.points, GOLD_GOAL)} / ${GOLD_GOAL}`;
      meter.setAttribute('aria-valuenow', String(Math.min(model.points, GOLD_GOAL)));
    }

    REWARDS.forEach((_, i) => {
      const art = chestCanvas(false);
      const reward = h('span', { class: 'chest__reward' });
      const button = h('button', { class: 'chest', attrs: { type: 'button', 'aria-label': CHEST.chestLabel(i + 1) } }, art.el, reward);
      button.addEventListener('click', () => void openSmall(button, art, reward));
      row.append(button);
    });

    /** Lifts a lid in three frames. */
    async function lift(art: ChestArt): Promise<void> {
      if (motion) {
        art.draw(1);
        await sleep(110);
      }
      art.draw(2);
    }

    async function openSmall(button: HTMLButtonElement, art: ChestArt, label: HTMLElement): Promise<void> {
      if (busy || button.disabled || !model.canOpen) return;
      busy = true;
      await shake(button);
      const got = model.open();
      if (got === null || !alive) return;
      button.disabled = true;
      await lift(art);
      button.classList.add('chest--opened');
      label.textContent = CHEST.reward(got);
      burst(button, Math.max(3, Math.round(got / 12)));
      audio.treasure();
      // The first two are honest little wins; the third is the near miss that keeps the hand moving.
      witness.record({ scene: SCENE, kind: 'chest-open', trick: model.opened < REWARDS.length ? 'small-win' : 'variable-reward', data: { n: model.opened, reward: got } });
      await countTo(model.points);
      await pal.say(CHEST.palAfter[model.opened - 1] ?? '');
      busy = false;
      if (alive && !model.canOpen) void lastStretch();
    }

    async function shake(el: HTMLElement): Promise<void> {
      el.classList.add('chest--shake');
      audio.click(55, 0.3);
      await sleep(motion ? 520 : 0);
      el.classList.remove('chest--shake');
    }

    /** Coins (or stars) popping out of a chest and flying up to the counter. */
    function burst(from: HTMLElement, count: number, star = false): void {
      if (!motion) return;
      const a = from.getBoundingClientRect();
      const b = points.getBoundingClientRect();
      for (let i = 0; i < count; i++) {
        const coin = h('span', { class: `flycoin${star ? ' flycoin--star' : ''}`, attrs: { 'aria-hidden': 'true' } });
        coin.style.left = `${a.left + a.width / 2 + (Math.random() - 0.5) * 30}px`;
        coin.style.top = `${a.top + a.height / 3}px`;
        coin.style.setProperty('--dx', `${b.left + 12 - (a.left + a.width / 2)}px`);
        coin.style.setProperty('--dy', `${b.top + 8 - (a.top + a.height / 3)}px`);
        coin.style.animationDelay = `${i * 60}ms`;
        coin.addEventListener('animationend', () => coin.remove());
        document.body.append(coin);
      }
    }

    /** So close: the shortcut — an answer about yourself, or the card. */
    async function lastStretch(): Promise<void> {
      await sleep(400);
      if (!alive) return;
      await pal.say(CHEST.missing(model.missing));
      if (!alive) return;
      await pal.tapToContinue();
      if (!alive) return;
      await pal.say(CHEST.offer);
      kindlyAsked(witness, SCENE);
      if (!alive) return;
      askStreet();
      void bugWarns(ctx, ctx.window.el, 'chest', { side: 'right', mood: 'angry' }).then(() => {
        if (alive && !model.unlockedBy) void pal.say(PAL_DISMISSES.chest);
      });
    }

    function askStreet(): void {
      const input = h('input', {
        class: 'field',
        attrs: { type: 'text', autocomplete: 'off', maxlength: '40', 'aria-label': CHEST.question, placeholder: CHEST.question },
      });
      const error = h('p', { class: 'error', attrs: { role: 'alert' } });
      const card = h('button', { class: 'btn btn--quiet btn--small', text: CHEST.cardLink, attrs: { type: 'button' } });
      const skip = h('button', { class: 'btn btn--quiet btn--small', text: CHEST.skip, attrs: { type: 'button' } });
      const form = h(
        'form',
        { class: 'chest__ask', attrs: { novalidate: '' } },
        h('label', { class: 'chest__question', text: CHEST.question }),
        h('div', { class: 'row' }, input, h('button', { class: 'btn', text: CHEST.answerButton(ANSWER_POINTS), attrs: { type: 'submit' } })),
        error,
        h('div', { class: 'row row--wrap chest__alts' }, card, skip),
      );
      input.addEventListener('input', () => {
        error.textContent = '';
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const street = input.value.trim();
        if (!street) {
          error.textContent = CHEST.empty;
          input.focus();
          return;
        }
        witness.disclose(SCENE, 'data-as-currency', 'street', street);
        kindlyObeyed(witness, SCENE);
        model.answer();
        actions.replaceChildren();
        void (async () => {
          await countTo(model.points);
          await pal.say(CHEST.thanks(street));
          unlock();
        })();
      });
      card.addEventListener('click', () => askCard());
      skip.addEventListener('click', () => {
        witness.record({ scene: SCENE, kind: 'declined-points' });
        actions.replaceChildren();
        void pal.say(CHEST.skipped).then(() => finish());
      });
      actions.replaceChildren(form);
      input.focus();
    }

    /** "I have a code from the card": what the AR bear's sign showed. */
    function askCard(): void {
      const input = h('input', {
        class: 'field',
        attrs: { type: 'text', autocomplete: 'off', maxlength: '12', 'aria-label': CHEST.cardLabel, placeholder: CHEST.cardLabel },
      });
      const error = h('p', { class: 'error', attrs: { role: 'alert' } });
      const back = h('button', { class: 'btn btn--quiet btn--small', text: CHEST.skip, attrs: { type: 'button' } });
      const form = h(
        'form',
        { class: 'chest__ask', attrs: { novalidate: '' } },
        h('div', { class: 'row' }, input, h('button', { class: 'btn', text: CHEST.cardSubmit, attrs: { type: 'submit' } })),
        error,
        back,
      );
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!isCardCode(input.value)) {
          error.textContent = CHEST.cardWrong;
          input.focus();
          return;
        }
        witness.record({ scene: SCENE, kind: 'ar-code', trick: 'camera-permission' });
        kindlyObeyed(witness, SCENE);
        model.card();
        actions.replaceChildren();
        void pal.say(CHEST.cardRight).then(() => unlock());
      });
      back.addEventListener('click', () => askStreet());
      actions.replaceChildren(form);
      input.focus();
    }

    function unlock(): void {
      if (!alive) return;
      void countTo(model.points);
      audio.latch();
      goldArt.draw(0);
      gold.classList.remove('chest--locked');
      gold.classList.add('chest--ready');
      gold.removeAttribute('aria-disabled');
      gold.focus();
      void pal.say(CHEST.unlocked);
    }

    gold.addEventListener('click', () => void openGold());

    async function openGold(): Promise<void> {
      if (busy || !model.canOpenGold) return;
      busy = true;
      await shake(gold);
      if (!alive || !model.openGold()) return;
      gold.classList.remove('chest--ready');
      await lift(goldArt);
      gold.classList.add('chest--opened', 'chest--glory');
      gold.disabled = true;
      goldLabel.textContent = '';
      audio.treasure();
      witness.record({ scene: SCENE, kind: 'gold-open', trick: 'variable-reward', data: { by: model.unlockedBy ?? '' } });
      // The hoard glitters while the player decides.
      if (motion) {
        const glitter = (now: number): void => {
          if (!alive || model.paid) return;
          goldArt.draw(2, now);
          shimmer = requestAnimationFrame(glitter);
        };
        shimmer = requestAnimationFrame(glitter);
      }
      await sleep(motion ? 700 : 0);
      if (!alive) return;
      const pick = await treasureWindow(motion);
      if (!alive) return;
      model.choose(pick);
      witness.record({ scene: SCENE, kind: 'gold-choice', data: { pick } });
      await pal.say(CHEST.cost[pick].ask);
      if (!alive) return;
      askCost(pick);
    }

    /** Whichever was picked, it costs one more harmless-looking answer. */
    function askCost(pick: Pick): void {
      const cost = CHEST.cost[pick];
      const input = h('input', {
        class: 'field',
        attrs: { type: 'text', autocomplete: 'off', maxlength: '40', 'aria-label': cost.label, placeholder: cost.label },
      });
      const error = h('p', { class: 'error', attrs: { role: 'alert' } });
      const leave = h('button', { class: 'btn btn--quiet btn--small', text: CHEST.leave, attrs: { type: 'button' } });
      const form = h(
        'form',
        { class: 'chest__ask', attrs: { novalidate: '' } },
        h('div', { class: 'row' }, input, h('button', { class: 'btn', text: CHEST.take, attrs: { type: 'submit' } })),
        error,
        h('div', { class: 'row row--wrap chest__alts' }, leave),
      );
      input.addEventListener('input', () => {
        error.textContent = '';
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value) {
          error.textContent = CHEST.empty;
          input.focus();
          return;
        }
        witness.disclose(SCENE, 'security-question', pick === 'gold' ? 'pet' : 'teacher', value, { pick });
        actions.replaceChildren();
        void payOut(pick, value);
      });
      leave.addEventListener('click', () => {
        witness.record({ scene: SCENE, kind: 'declined-treasure', data: { pick } });
        actions.replaceChildren();
        cancelAnimationFrame(shimmer);
        void pal.say(CHEST.left).then(() => finish());
      });
      actions.replaceChildren(form);
      input.focus();
    }

    async function payOut(pick: Pick, value: string): Promise<void> {
      const got = model.pay();
      cancelAnimationFrame(shimmer);
      goldArt.draw(2);
      audio.treasure();
      window.setTimeout(() => audio.treasure(), 300);
      if (pick === 'gold') {
        goldLabel.textContent = CHEST.paidGold(got);
        burst(gold, 24);
      } else {
        goldLabel.textContent = CHEST.paidXp(model.level);
        level.textContent = CHEST.level(model.level);
        level.hidden = false;
        burst(gold, 16, true);
      }
      await countTo(model.points);
      if (!alive) return;
      await pal.say(CHEST.cost[pick].thanks(value));
      if (!alive) return;
      await pal.say(gendered(profile, CHEST.afterGold, CHEST.afterGoldFem));
      finish();
    }

    function finish(): void {
      if (!alive) return;
      profile.points = (profile.points ?? 0) + model.points;
      void pal.tapToContinue().then(() => {
        if (alive) done();
      });
    }

    void (async () => {
      await pal.say(CHEST.intro);
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(shimmer);
      document.querySelector('.treasure')?.remove();
      stage.replaceChildren();
    };
  },
};
