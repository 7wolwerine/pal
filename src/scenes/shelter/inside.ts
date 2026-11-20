import type { ShelterPath, TaskId } from '../../content/shelter.ts';
import { px, type Rect } from '../../pixel/stage.ts';
import { mix, type ShelterModel } from './model.ts';

type G = CanvasRenderingContext2D;

/** Inside the hut or the cave, seen from within. Same size as the outside. */
const W = 160;
const H = 100;
export const FLOOR_Y = 82;

/** Where each job is, inside. */
export const INSIDE_RECTS: Record<TaskId, Rect> = {
  door: { x: 122, y: 30, w: 30, h: 52 },
  stove: { x: 40, y: 40, w: 26, h: 42 },
  chest: { x: 68, y: 62, w: 30, h: 20 },
  entrance: { x: 116, y: 22, w: 44, h: 60 },
  fire: { x: 42, y: 64, w: 30, h: 18 },
  fur: { x: 8, y: 56, w: 28, h: 26 },
};

/** Where the assistant stands inside, its left edge. */
export const INSIDE_SPOT: Record<ShelterPath, number> = { hut: 100, cave: 86 };

/** A short burst of comedy when the silly way is tried. */
export interface Flop {
  readonly id: TaskId;
  readonly at: number;
}

export interface InsideLook {
  readonly path: ShelterPath;
  readonly model: ShelterModel;
  /** Shown warmth, eased towards the model's. */
  readonly warmth: number;
  readonly flop?: Flop;
  readonly knock?: { id: TaskId; at: number };
  readonly motion: boolean;
}

/** Snowflakes of the blizzard outside; it never stops. */
const STORM = Array.from({ length: 70 }, (_, i) => ({ x: (i * 37) % 60, y: (i * 53) % 70, v: 0.03 + ((i * 7) % 10) / 300 }));
/** Snow blowing in through the gap until it is closed. */
const DRIFT = Array.from({ length: 26 }, (_, i) => ({ y: (i * 29) % 50, v: 0.02 + ((i * 11) % 10) / 400, d: (i * 17) % 60 }));

export function paintInside(g: G, t: number, s: InsideLook): void {
  const time = s.motion ? t : 0;
  const doneOf = (id: TaskId): number => {
    const j = s.model.jobs.find((x) => x.id === id);
    return j ? Math.min(1, j.done / j.knocks) : 0;
  };
  if (s.path === 'hut') paintHut(g, time, s, doneOf);
  else paintCave(g, time, s, doneOf);
  // Warm light filling the room as it warms up.
  if (s.warmth > 0) {
    g.globalAlpha = 0.2 * s.warmth;
    px(g, '#ffb36b', 0, 0, W, H);
    g.globalAlpha = 1;
  }
  if (s.flop) paintFlop(g, t, s.flop);
  if (s.knock && s.motion && t - s.knock.at < 300) paintChips(g, t, s.knock);
}

/** The blizzard seen through an opening (x, y, w, h): dark sky, heavy slanting snow. Never stops. */
function paintStorm(g: G, t: number, x: number, y: number, w: number, h: number): void {
  px(g, '#141c33', x, y, w, h);
  px(g, '#1f2a48', x, y + Math.round(h * 0.6), w, h - Math.round(h * 0.6));
  for (const f of STORM) {
    const fx = x + ((f.x + t * f.v * 2.2) % w);
    const fy = y + ((f.y + t * f.v * 3) % h);
    px(g, '#ffffff', fx, fy, 1, 1);
    px(g, '#c9d6ea', fx - 1, fy - 1, 1, 1);
  }
}

/** Snow blowing in from (fromX, top..bottom) towards the left and down onto the floor. */
function paintDrift(g: G, t: number, fromX: number, top: number, amount: number): void {
  const n = Math.round(DRIFT.length * amount);
  for (let i = 0; i < n; i++) {
    const f = DRIFT[i];
    if (!f) continue;
    const run = (f.d + t * f.v * 2) % 70;
    px(g, '#e8f0fa', fromX - run, top + f.y + run * 0.35, 1, 1);
  }
  // a little drift of snow on the floor by the gap
  px(g, '#dfe7f2', fromX - 18, FLOOR_Y - 2, 18, 2);
}

function paintHut(g: G, t: number, s: InsideLook, doneOf: (id: TaskId) => number): void {
  const cold = 1 - s.warmth;
  const wood = mix('#6b4a36', '#8a5e3e', s.warmth);
  const woodHi = mix('#7d573f', '#a8744a', s.warmth);
  const woodLo = '#4a3124';
  // plank walls and floor
  px(g, woodLo, 0, 0, W, FLOOR_Y);
  for (let y = 1; y < FLOOR_Y; y += 6) {
    px(g, wood, 0, y, W, 5);
    px(g, woodHi, 0, y, W, 1);
  }
  px(g, '#5a3d2c', 0, FLOOR_Y, W, H - FLOOR_Y);
  for (let x = 0; x < W; x += 14) px(g, '#4a3124', x, FLOOR_Y, 1, H - FLOOR_Y);
  px(g, '#3b281e', 0, FLOOR_Y, W, 1);

  // the window, with the storm outside
  px(g, woodLo, 8, 16, 30, 26);
  paintStorm(g, t, 10, 18, 26, 22);
  px(g, woodLo, 22, 18, 2, 22);
  px(g, woodLo, 10, 28, 26, 2);
  px(g, '#e3eaf3', 9, 40, 28, 2);

  // the stove with its pipe; cold grey, then a fire in its window
  const stove = doneOf('stove');
  const r = INSIDE_RECTS.stove;
  px(g, '#3b3f48', r.x + 10, 0, 6, r.y + 2);
  px(g, '#3b3f48', r.x + 2, r.y + 6, 22, 34);
  px(g, '#5b6470', r.x + 3, r.y + 7, 20, 32);
  px(g, '#2a2d34', r.x + 7, r.y + 18, 12, 10);
  if (stove > 0) {
    const f = s.motion ? Math.floor(t / 110) % 3 : 0;
    g.globalAlpha = Math.min(1, stove + 0.2);
    px(g, '#e24b2a', r.x + 8, r.y + 22 - f, 10, 6 + f);
    px(g, '#ffb33a', r.x + 10, r.y + 24 - f, 6, 4 + f);
    g.globalAlpha = 1;
  }
  px(g, '#3b3f48', r.x + 4, FLOOR_Y - 2, 4, 2);
  px(g, '#3b3f48', r.x + 18, FLOOR_Y - 2, 4, 2);

  // the old chest; open with a red sweater once the dry clothes are found
  const chest = doneOf('chest');
  const c = INSIDE_RECTS.chest;
  px(g, '#5a3a24', c.x, c.y + 6, c.w, c.h - 6);
  px(g, '#7a5232', c.x + 1, c.y + 7, c.w - 2, c.h - 8);
  px(g, '#9aa3ad', c.x + 4, c.y + 6, 2, c.h - 6);
  px(g, '#9aa3ad', c.x + c.w - 6, c.y + 6, 2, c.h - 6);
  if (chest >= 1) {
    px(g, '#4a2f1d', c.x, c.y, c.w, 3);
    px(g, '#d9483f', c.x + 6, c.y + 3, 16, 5);
    px(g, '#f07a6e', c.x + 6, c.y + 3, 16, 1);
  } else {
    const lift = Math.round(chest * 4);
    px(g, '#6a4429', c.x - 1, c.y + 3 - lift, c.w + 2, 4);
    px(g, '#ffd23f', c.x + c.w / 2 - 1, c.y + 6, 2, 2);
  }

  // the door: banging in the wind, letting the storm in; then shut and barred
  const door = doneOf('door');
  const d = INSIDE_RECTS.door;
  px(g, woodLo, d.x - 2, d.y - 2, d.w + 4, d.h + 2);
  paintStorm(g, t, d.x, d.y, d.w, d.h);
  const swing = door >= 1 ? 0 : (1 - door) * (0.55 + (s.motion ? 0.35 * Math.sin(t / 260) : 0));
  const leafW = Math.max(3, Math.round(d.w * (1 - swing)));
  px(g, '#6a4429', d.x, d.y, leafW, d.h);
  for (let y = d.y + 4; y < d.y + d.h; y += 8) px(g, '#5a3a24', d.x, y, leafW, 1);
  if (door >= 1) {
    px(g, '#4a2f1d', d.x - 3, d.y + 22, d.w + 6, 4);
    px(g, '#7a5232', d.x - 3, d.y + 22, d.w + 6, 1);
  } else {
    paintDrift(g, t, d.x, d.y + 6, 1 - door);
  }

  // frost on the walls while it is cold
  if (cold > 0.3) {
    g.globalAlpha = (cold - 0.3) * 0.6;
    for (let i = 0; i < 14; i++) px(g, '#dfeaf6', (i * 37) % W, (i * 23) % 30, 3, 1);
    g.globalAlpha = 1;
  }
}

function paintCave(g: G, t: number, s: InsideLook, doneOf: (id: TaskId) => number): void {
  const rock = mix('#3a3646', '#5a4a52', s.warmth);
  const rockHi = mix('#4a4558', '#7a6266', s.warmth);
  px(g, rock, 0, 0, W, FLOOR_Y);
  for (let i = 0; i < 40; i++) px(g, rockHi, (i * 41) % W, (i * 19) % FLOOR_Y, 4 + (i % 3) * 2, 2);
  px(g, mix('#4f4858', '#6a5458', s.warmth), 0, FLOOR_Y, W, H - FLOOR_Y);
  px(g, '#2e2a38', 0, FLOOR_Y, W, 1);

  // the mouth of the cave, the storm beyond it; stones stack up until it is closed
  const entrance = doneOf('entrance');
  const e = INSIDE_RECTS.entrance;
  const mouth = (row: number): number => Math.round(((e.w - 6) / 2) * Math.sqrt(Math.max(0, 1 - ((e.h - row) / e.h) ** 2)));
  const cx = e.x + e.w / 2;
  for (let row = 0; row < e.h; row++) {
    const half = mouth(row);
    if (half <= 0) continue;
    g.save();
    g.beginPath();
    g.rect(cx - half, e.y + row, half * 2, 1);
    g.clip();
    paintStorm(g, t, e.x, e.y, e.w, e.h);
    g.restore();
  }
  const stonesUp = Math.round(entrance * e.h);
  for (let row = 0; row < stonesUp; row += 5) {
    const y = FLOOR_Y - 5 - row;
    const half = mouth(e.h - 5 - row);
    for (let x = cx - half; x < cx + half; x += 7) {
      px(g, '#6b6f7e', x + ((row / 5) % 2) * 3, y, 7, 5);
      px(g, '#8a8f9e', x + ((row / 5) % 2) * 3, y, 7, 1);
      px(g, '#4a4d58', x + ((row / 5) % 2) * 3, y + 4, 7, 1);
    }
  }
  if (entrance < 1) paintDrift(g, t, cx - 10, e.y + 10, 1 - entrance);

  // the fire pit: a ring of stones, then logs, then flames
  const fire = doneOf('fire');
  const f = INSIDE_RECTS.fire;
  for (let i = 0; i < 6; i++) px(g, '#8a93a8', f.x + 2 + i * 5, FLOOR_Y - 3 - (i % 2), 4, 3);
  if (fire > 0) for (let i = 0; i < Math.round(fire * 3); i++) px(g, '#8a5a3c', f.x + 6 + i * 6, FLOOR_Y - 6 - (i % 2), 8, 2);
  if (fire >= 1) {
    const flick = s.motion ? Math.floor(t / 110) % 3 : 0;
    px(g, '#e24b2a', f.x + 8, FLOOR_Y - 15 - flick, 14, 9 + flick);
    px(g, '#ff8a2a', f.x + 10, FLOOR_Y - 17 - flick, 10, 10 + flick);
    px(g, '#ffd23f', f.x + 13, FLOOR_Y - 13 - (flick % 2), 4, 6);
  }

  // the backpack in the corner; a fur pulled out of it once the dry clothes are found
  const fur = doneOf('fur');
  const b = INSIDE_RECTS.fur;
  px(g, '#6b4a2f', b.x + 4, b.y + 6, 20, 20);
  px(g, '#8a6040', b.x + 5, b.y + 7, 18, 6);
  px(g, '#4a3220', b.x + 6, b.y + 16, 16, 2);
  px(g, '#9aa3ad', b.x + 12, b.y + 4, 4, 3);
  if (fur >= 1) {
    px(g, '#e8d6b6', b.x + 14, b.y + 20, 14, 6);
    px(g, '#f6ead4', b.x + 14, b.y + 20, 14, 1);
  }
}

/** The dry clothes on the assistant once found: a red sweater in the hut, a fur in the cave. */
export function paintWorn(g: G, path: ShelterPath, x: number, y: number, size: number): void {
  if (path === 'hut') {
    px(g, '#d9483f', x + 3, y + size - 9, size - 6, 7);
    px(g, '#f07a6e', x + 3, y + size - 9, size - 6, 1);
    px(g, '#b8362f', x + 5, y + size - 12, size - 10, 3);
  } else {
    px(g, '#e8d6b6', x + 1, y + size - 11, size - 2, 9);
    px(g, '#f6ead4', x + 1, y + size - 11, size - 2, 2);
    px(g, '#c9b28e', x + 3, y + size - 4, size - 6, 1);
  }
}

function paintFlop(g: G, t: number, flop: Flop): void {
  const u = Math.min(1, (t - flop.at) / 1400);
  if (u >= 1) return;
  const r = INSIDE_RECTS[flop.id];
  switch (flop.id) {
    case 'door': {
      // a puff of snow bursting in as the door flies open again
      for (let i = 0; i < 12; i++) px(g, '#ffffff', r.x - u * 40 - i * 3, r.y + 10 + i * 3 + u * 8, 2, 1);
      break;
    }
    case 'stove':
    case 'fire': {
      // breath or ash: little grey clouds that do nothing at all
      for (let i = 0; i < 4; i++) {
        g.globalAlpha = 0.7 * (1 - u);
        px(g, flop.id === 'fire' ? '#9aa3ad' : '#e3eaf3', r.x + 4 + i * 5, r.y + r.h / 2 - u * 16 - i * 2, 5, 3);
        g.globalAlpha = 1;
      }
      break;
    }
    case 'chest': {
      // the lid banging shut, with a bounce
      const bounce = Math.round(Math.abs(Math.sin(u * 10)) * (1 - u) * 6);
      px(g, '#6a4429', r.x - 1, r.y + 3 - bounce, r.w + 2, 4);
      break;
    }
    case 'entrance': {
      // a snowman by the entrance, slumping into a heap
      const slump = Math.round(u * 8);
      px(g, '#ffffff', r.x + 10, FLOOR_Y - 10 + slump, 10, 10 - Math.min(6, slump));
      if (slump < 6) px(g, '#ffffff', r.x + 12, FLOOR_Y - 16 + slump, 6, 6);
      if (slump < 5) px(g, '#ff8a2a', r.x + 17, FLOOR_Y - 13 + slump, 3, 1);
      break;
    }
    case 'fur': {
      // a backpack bouncing on a head
      const bob = Math.round(Math.abs(Math.sin(u * 9)) * 3);
      px(g, '#6b4a2f', 92, 52 - bob, 16, 10);
      px(g, '#8a6040', 93, 53 - bob, 14, 3);
      break;
    }
  }
}

function paintChips(g: G, t: number, knock: { id: TaskId; at: number }): void {
  const r = INSIDE_RECTS[knock.id];
  const u = (t - knock.at) / 300;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    px(g, i % 2 ? '#fff6c8' : '#c58c52', r.x + r.w / 2 + Math.cos(a) * u * 9, r.y + r.h / 2 + Math.sin(a) * u * 7 - u * 3, 1, 1);
  }
}
