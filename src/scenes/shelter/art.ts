import type { ShelterPath, TaskId } from '../../content/shelter.ts';
import { px, type Rect } from '../../pixel/stage.ts';
import { mix, type ShelterModel } from './model.ts';

type G = CanvasRenderingContext2D;

export const STAGE_W = 160;
export const STAGE_H = 100;
export const GROUND_Y = 84;

export const HUT_RECT: Rect = { x: 4, y: 28, w: 62, h: 58 };
export const CAVE_RECT: Rect = { x: 98, y: 34, w: 62, h: 52 };
/** Where the assistant stands: in the middle, at the hut's door, or in the cave. */
export const SPOT = { start: 76, hut: 56, cave: 104 } as const;

export const TASK_RECTS: Record<TaskId, Rect> = {
  roof: { x: 22, y: 33, w: 22, h: 15 },
  door: { x: 36, y: 62, w: 16, h: 23 },
  window: { x: 13, y: 55, w: 17, h: 15 },
  hearth: { x: 120, y: 70, w: 22, h: 15 },
  wood: { x: 140, y: 64, w: 14, h: 20 },
  fire: { x: 120, y: 60, w: 22, h: 25 },
};

const COLD = { sky: '#141c33', skyLow: '#2a3557', snow: '#d9e2ee', snowShade: '#b8c4d6', rock: '#4a5266', rockHi: '#5f6880' };
const WARM = { sky: '#2a2148', skyLow: '#5a3d6b', snow: '#f1e6e8', snowShade: '#d8c8d0', rock: '#5f5468', rockHi: '#7a6a80' };

const SNOW = Array.from({ length: 90 }, (_, i) => ({ x: (i * 37) % STAGE_W, y: (i * 53) % STAGE_H, v: 0.02 + ((i * 7) % 10) / 450 }));

/** A short burst of comedy when the silly way is tried. */
export interface Flop {
  readonly id: TaskId;
  readonly at: number;
}

export interface ShelterLook {
  readonly model?: ShelterModel;
  /** Shown warmth, eased towards the model's. */
  readonly warmth: number;
  readonly flop?: Flop;
  /** Stage time of the last knock and which job it hit. */
  readonly knock?: { id: TaskId; at: number };
  readonly done: boolean;
  readonly motion: boolean;
}

export function paintShelter(g: G, t: number, s: ShelterLook): void {
  const w = s.warmth;
  const c = (k: keyof typeof COLD): string => mix(COLD[k], WARM[k], w * 0.6);
  const time = s.motion ? t : 0;
  const path: ShelterPath | undefined = s.model?.path;
  const doneOf = (id: TaskId): number => {
    if (!s.model) return 0;
    const j = s.model.jobs.find((x) => x.id === id);
    return j ? j.done / j.knocks : 0;
  };

  // Sky and stars.
  px(g, c('sky'), 0, 0, STAGE_W, 60);
  px(g, c('skyLow'), 0, 46, STAGE_W, 38);
  for (let i = 0; i < 18; i++) {
    if ((i * 13 + Math.floor(time / 900)) % 7 === 0) continue;
    px(g, '#e8ecf6', (i * 41) % STAGE_W, (i * 17) % 40, 1, 1);
  }
  px(g, '#e8ecf6', 78, 8, 7, 7);
  px(g, c('sky'), 81, 6, 7, 7);

  // Snowy ground.
  px(g, c('snow'), 0, GROUND_Y - 4, STAGE_W, STAGE_H - GROUND_Y + 4);
  px(g, c('snowShade'), 0, GROUND_Y - 4, STAGE_W, 1);
  for (let i = 0; i < 10; i++) px(g, c('snowShade'), (i * 29) % STAGE_W, 88 + (i % 4) * 3, 6, 1);

  paintHut(g, time, s, path === 'hut', doneOf);
  paintCave(g, time, s, path === 'cave', doneOf);
  if (s.flop) paintFlop(g, t, s.flop);
  if (s.knock && s.motion && t - s.knock.at < 300) paintChips(g, t, s.knock);

  // Snow, thinning out as it warms up.
  const flakes = Math.round(SNOW.length * Math.max(0.15, 1 - w));
  for (let i = 0; i < flakes; i++) {
    const f = SNOW[i];
    if (!f) continue;
    px(g, '#ffffff', (f.x + time * f.v * 1.5) % STAGE_W, (f.y + time * f.v * 2.4) % STAGE_H, 1, 1);
  }
}

function paintHut(g: G, t: number, s: ShelterLook, chosen: boolean, doneOf: (id: TaskId) => number): void {
  const wood = '#6b4a36';
  const woodHi = '#86603f';
  const woodLo = '#4f3426';
  // walls of planks
  px(g, woodLo, 11, 50, 50, 35);
  for (let y = 51; y < 85; y += 4) {
    px(g, wood, 12, y, 48, 3);
    px(g, woodHi, 12, y, 48, 1);
  }
  // roof, with snow on top
  for (let row = 0; row < 22; row++) {
    const half = 6 + row * 1.45;
    px(g, row % 3 === 0 ? woodLo : '#5a3d2c', 36 - half, 29 + row, half * 2, 1);
  }
  for (let row = 0; row < 4; row++) px(g, s.done && chosen ? '#f1e6e8' : '#e3eaf3', 34 - row * 2, 28 + row, 4 + row * 4, 1);
  // chimney
  px(g, woodLo, 46, 30, 6, 10);
  // the roof hole closes plank by plank
  const roof = doneOf('roof');
  const planks = Math.round(roof * 3);
  for (let i = 0; i < 3; i++) {
    const x = 26 + i * 5;
    if (i >= planks) px(g, '#0b0f1c', x, 38, 5, 8);
    else {
      px(g, '#a0703f', x, 38, 5, 8);
      px(g, '#c58c52', x, 38, 5, 1);
    }
  }
  // window: shards, then glass that glows once it is warm inside
  const win = doneOf('window');
  px(g, woodLo, 14, 56, 15, 13);
  if (win >= 1) {
    const glow = chosen && s.done;
    px(g, glow ? '#ffd98a' : '#a6dcef', 15, 57, 13, 11);
    px(g, woodLo, 21, 57, 1, 11);
    px(g, woodLo, 15, 62, 13, 1);
  } else {
    px(g, '#11141f', 15, 57, 13, 11);
    px(g, '#8a93a8', 15, 57, 3, 2);
    px(g, '#8a93a8', 24, 64, 4, 4);
    if (win > 0) px(g, '#a6dcef', 15, 57, Math.round(13 * win), 11);
  }
  // door: hanging off, lifted step by step, then shut
  const door = doneOf('door');
  px(g, '#0b0f1c', 37, 63, 14, 22);
  const lean = Math.round((1 - door) * 6);
  for (let row = 0; row < 21; row++) {
    const shift = Math.round((row / 21) * lean);
    px(g, door >= 1 ? '#8a5a3c' : '#5a4030', 38 + shift, 64 + row, 12, 1);
  }
  if (door >= 1) px(g, '#ffd23f', 47, 74, 2, 2);
  // smoke from the chimney, and warm light, once it is all fixed
  if (chosen && s.done) {
    for (let i = 0; i < 4; i++) {
      const age = (t / 30 + i * 9) % 36;
      g.globalAlpha = Math.max(0, 0.7 - age / 40);
      px(g, '#f4f4f4', 48 + Math.round(Math.sin((age + i) / 5) * 2), 28 - age, 3, 3);
      g.globalAlpha = 1;
    }
  }
}

function paintCave(g: G, t: number, s: ShelterLook, chosen: boolean, doneOf: (id: TaskId) => number): void {
  const rock = mix(COLD.rock, WARM.rock, s.warmth * 0.6);
  const rockHi = mix(COLD.rockHi, WARM.rockHi, s.warmth * 0.6);
  // the rock: a lumpy mound
  for (let x = 98; x < 160; x++) {
    const top = 38 + Math.round(6 * Math.sin((x - 98) / 9) + 4 * Math.sin((x - 98) / 4));
    px(g, rock, x, top, 1, GROUND_Y - top);
    px(g, rockHi, x, top, 1, 2);
  }
  // snow on top
  for (let x = 104; x < 156; x += 3) px(g, '#e3eaf3', x, 38 + Math.round(6 * Math.sin((x - 98) / 9) + 4 * Math.sin((x - 98) / 4)) - 1, 3, 2);
  // the dark mouth of the cave
  for (let row = 0; row < 30; row++) {
    const half = Math.round(18 * Math.sqrt(1 - ((29 - row) / 30) ** 2));
    px(g, '#0a0c14', 131 - half, 55 + row, half * 2, 1);
  }
  const fire = doneOf('fire');
  const hearth = doneOf('hearth');
  const wood = doneOf('wood');
  // warm light filling the cave once the fire burns
  if (chosen && fire >= 1) {
    const flick = s.motion ? 0.08 * Math.sin(t / 90) + 0.05 * Math.sin(t / 37) : 0;
    g.globalAlpha = 0.55 + flick;
    for (let row = 0; row < 30; row++) {
      const half = Math.round(18 * Math.sqrt(1 - ((29 - row) / 30) ** 2));
      px(g, '#ff9a3c', 131 - half, 55 + row, half * 2, 1);
    }
    g.globalAlpha = 1;
  }
  // hearth stones: scattered, then in a ring
  const ring = [[122, 81], [126, 79], [131, 78], [136, 79], [140, 81]] as const;
  const scattered = [[114, 82], [124, 83], [146, 80], [119, 79], [143, 83]] as const;
  ring.forEach(([rx, ry], i) => {
    const [sx, sy] = scattered[i] ?? [rx, ry];
    const placed = i < Math.round(hearth * ring.length);
    const x = placed ? rx : sx;
    const y = placed ? ry : sy;
    px(g, '#8a93a8', x, y, 4, 3);
    px(g, '#aab3c4', x, y, 4, 1);
  });
  // a heap of branches: wet ones at the entrance, dry ones at the back
  px(g, '#3a2a20', 142, 76, 10, 2);
  px(g, '#4a3428', 144, 73, 8, 2);
  px(g, '#5a4030', 146, 70, 6, 2);
  // wood laid in the hearth
  if (wood > 0) {
    const logs = Math.round(wood * 3);
    for (let i = 0; i < logs; i++) px(g, '#8a5a3c', 126 + i * 3, 77 - (i % 2), 6, 2);
  }
  // sparks while striking, then flames
  if (fire > 0 && fire < 1 && s.motion && Math.floor(t / 120) % 2 === 0) {
    px(g, '#ffd23f', 130, 73, 1, 1);
    px(g, '#ffef9a', 133, 72, 1, 1);
  }
  if (fire >= 1) {
    const f = s.motion ? Math.floor(t / 110) % 3 : 0;
    px(g, '#e24b2a', 127, 70 - f, 10, 7 + f);
    px(g, '#ff8a2a', 129, 68 - f, 6, 8 + f);
    px(g, '#ffd23f', 131, 71 - (f % 2), 2, 5);
  }
}

function paintFlop(g: G, t: number, flop: Flop): void {
  const u = Math.min(1, (t - flop.at) / 1400);
  if (u >= 1) return;
  switch (flop.id) {
    case 'roof': {
      // an umbrella blown away into the night
      const x = 34 + u * 60;
      const y = 36 - u * 30 - Math.sin(u * 9) * 3;
      px(g, '#ed93b1', x - 5, y, 11, 3);
      px(g, '#ed93b1', x - 3, y - 1, 7, 1);
      px(g, '#3b2a3a', x, y + 3, 1, 5);
      break;
    }
    case 'door': {
      // a chair tipping over
      const tip = Math.min(1, u * 2);
      px(g, '#a0703f', 52 + Math.round(tip * 3), 74 + Math.round(tip * 6), 6, 2);
      px(g, '#a0703f', 56 + Math.round(tip * 4), 76 + Math.round(tip * 4), 2, 8 - Math.round(tip * 4));
      break;
    }
    case 'window': {
      // a red sock that sags and drops
      const y = 60 + Math.round(u * u * 24);
      px(g, '#e24b4a', 19, y, 4, 6);
      px(g, '#e24b4a', 19, y + 5, 7, 3);
      px(g, '#ffffff', 19, y, 4, 1);
      break;
    }
    case 'hearth': {
      // a snowman that slumps into a heap
      const slump = Math.round(u * 6);
      px(g, '#ffffff', 122, 74 + slump, 8, 8 - Math.min(4, slump));
      if (slump < 5) px(g, '#ffffff', 123, 69 + slump, 6, 5);
      if (slump < 4) px(g, '#ff8a2a', 128, 71 + slump, 2, 1);
      break;
    }
    case 'wood': {
      // thick grey smoke rolling out of the cave
      for (let i = 0; i < 5; i++) {
        g.globalAlpha = 0.6 * (1 - u);
        px(g, '#9aa3ad', 116 + i * 5 - u * 10, 62 - u * 18 - i * 2, 7, 5);
        g.globalAlpha = 1;
      }
      break;
    }
    case 'fire': {
      // little puffs of breath that do nothing at all
      for (let i = 0; i < 3; i++) {
        const x = 114 + u * 14 + i * 3;
        px(g, '#e3eaf3', x, 70 + i, 3, 1);
      }
      break;
    }
  }
}

function paintChips(g: G, t: number, knock: { id: TaskId; at: number }): void {
  const r = TASK_RECTS[knock.id];
  const u = (t - knock.at) / 300;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    px(g, i % 2 ? '#fff6c8' : '#c58c52', r.x + r.w / 2 + Math.cos(a) * u * 9, r.y + r.h / 2 + Math.sin(a) * u * 7 - u * 3, 1, 1);
  }
}

/** A four-pointed twinkle that says "here". */
export function paintTwinkle(g: G, x: number, y: number, t: number): void {
  const cycle = t % 1400;
  if (cycle > 800) return;
  const size = cycle < 400 ? Math.round((cycle / 400) * 4) : Math.round(((800 - cycle) / 400) * 4);
  if (size <= 0) return;
  px(g, '#fff6c8', x, y - size, 1, size * 2 + 1);
  px(g, '#fff6c8', x - size, y, size * 2 + 1, 1);
  px(g, '#ffffff', x, y, 1, 1);
}
