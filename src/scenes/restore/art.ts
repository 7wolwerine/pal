import { paintGrid, px } from '../../pixel/stage.ts';
import type { RepairId } from '../../content/restore.ts';
import { mix, type RestoreModel } from './model.ts';

type G = CanvasRenderingContext2D;

export const STAGE_W = 160;
export const STAGE_H = 100;

/** Click areas for each broken thing, in picture pixels. */
export const REPAIR_RECTS: Record<RepairId, { x: number; y: number; w: number; h: number }> = {
  roof: { x: 66, y: 25, w: 22, h: 15 },
  window: { x: 55, y: 52, w: 19, h: 17 },
  door: { x: 86, y: 62, w: 16, h: 27 },
  lantern: { x: 101, y: 49, w: 10, h: 14 },
  flower: { x: 23, y: 72, w: 17, h: 18 },
};

/** Cold (broken night) and warm (mended afternoon) versions of each colour. */
const COLD = {
  sky: '#141c33',
  skyLow: '#26304f',
  ground: '#d9e2ee',
  groundShade: '#b8c4d6',
  wall: '#5f6476',
  wallShade: '#4a4e5e',
  roof: '#3d4256',
  roofShade: '#2e3243',
  hill: '#2a3552',
};
const WARM = {
  sky: '#8fd3f4',
  skyLow: '#ffe2b8',
  ground: '#7cc66b',
  groundShade: '#5fae57',
  wall: '#f2d3a6',
  wallShade: '#dcb684',
  roof: '#d9624f',
  roofShade: '#b84a3c',
  hill: '#a9dba6',
};

const HOG = { d: '#4f3420', b: '#7a5232', s: '#e8c49a', k: '#2b1d14' };

const MOM = [
  '....dddd....',
  '..ddbbbbdd..',
  '.dbbdbbdbbd.',
  'dbbbbbbbbbd.',
  'sksbbbbbbbd.',
  'kssbbbbbbbd.',
  '.ss.dd..dd..',
];

const BABY = ['..dddd..', '.dbdbbd.', 'sksbbbbd', 'kssbbbbd', '.s.d..d.'];

const SNOW_SEEDS = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 37) % STAGE_W,
  y: (i * 53) % STAGE_H,
  speed: 0.02 + ((i * 7) % 10) / 400,
}));

function dashedRect(g: G, r: { x: number; y: number; w: number; h: number }, t: number, colour: string): void {
  const period = 6;
  const off = Math.floor(t / 70) % period;
  for (let i = 0; i < r.w; i++) {
    if ((i + off) % period < 3) {
      px(g, colour, r.x + i, r.y, 1, 1);
      px(g, colour, r.x + i, r.y + r.h - 1, 1, 1);
    }
  }
  for (let i = 0; i < r.h; i++) {
    if ((i + off) % period < 3) {
      px(g, colour, r.x, r.y + i, 1, 1);
      px(g, colour, r.x + r.w - 1, r.y + i, 1, 1);
    }
  }
}

export interface RestoreLook {
  readonly model: RestoreModel;
  readonly motion: boolean;
  /** ms since everything was fixed, or undefined while still working. */
  readonly sinceDone?: number;
}

export function paintRestore(g: G, t: number, look: RestoreLook): void {
  const { model, motion } = look;
  const w = model.warmth;
  const c = (k: keyof typeof COLD): string => mix(COLD[k], WARM[k], w);
  const time = motion ? t : 0;

  // Sky, with the moon fading out and the sun coming up as it warms.
  px(g, c('sky'), 0, 0, STAGE_W, 60);
  px(g, c('skyLow'), 0, 42, STAGE_W, 20);
  if (w < 0.7) {
    g.globalAlpha = 1 - w / 0.7;
    px(g, '#e8ecf6', 132, 10, 10, 10);
    px(g, c('sky'), 136, 8, 10, 10);
    g.globalAlpha = 1;
  }
  if (w > 0.35) {
    g.globalAlpha = Math.min(1, (w - 0.35) / 0.5);
    px(g, '#ffd23f', 128, 8, 14, 14);
    px(g, '#fff1a8', 131, 11, 8, 8);
    g.globalAlpha = 1;
  }
  px(g, c('hill'), 0, 54, 60, 10);
  px(g, c('hill'), 110, 52, 50, 12);

  // Ground.
  px(g, c('ground'), 0, 62, STAGE_W, 38);
  px(g, c('groundShade'), 0, 62, STAGE_W, 2);

  // House walls and roof.
  px(g, c('wallShade'), 49, 43, 62, 46);
  px(g, c('wall'), 50, 44, 60, 44);
  for (let row = 0; row < 10; row++) {
    const y = 24 + row * 2;
    const half = 8 + row * 2.4;
    px(g, row % 2 ? c('roof') : c('roofShade'), 80 - half, y, half * 2, 2);
  }

  // Roof hole: dark gap that fills in plank by plank.
  const roof = model.get('roof');
  const holeLeft = roof.needed - Math.min(roof.done, roof.needed);
  for (let i = 0; i < roof.needed; i++) {
    const colour = i < holeLeft ? '#0b0f1c' : '#a0703f';
    px(g, colour, 70 + i * 4, 30, 4, 7);
    if (i >= holeLeft) px(g, '#c58c52', 70 + i * 4, 30, 4, 1);
  }

  // Window: cracked and dark, or glazed — and glowing once the lantern is lit.
  const lit = model.isFixed('lantern');
  const win = model.get('window');
  if (win.done >= win.needed) {
    px(g, '#ffffff', 57, 54, 15, 13);
    px(g, lit ? '#ffd98a' : '#a6dcef', 58, 55, 13, 11);
    px(g, '#ffffff', 64, 55, 1, 11);
    px(g, '#ffffff', 58, 60, 13, 1);
  } else {
    px(g, '#2a2f40', 57, 54, 15, 13);
    px(g, '#11141f', 58, 55, 13, 11);
    // cracks, fewer as it gets fixed
    px(g, '#8a93a8', 60, 56, 1, 6);
    px(g, '#8a93a8', 61, 59, 5, 1);
    if (win.done === 0) px(g, '#8a93a8', 66, 57, 1, 7);
  }

  // Door: hanging off its hinge, or upright.
  const door = model.get('door');
  if (door.done >= door.needed) {
    px(g, '#6b4428', 88, 64, 12, 24);
    px(g, '#8a5a3c', 89, 65, 10, 23);
    px(g, '#ffd23f', 96, 76, 2, 2);
  } else {
    const lean = door.done === 0 ? 4 : 2;
    for (let row = 0; row < 24; row++) {
      const shift = Math.round((row / 24) * lean);
      px(g, '#5a4030', 88 + shift, 64 + row, 12, 1);
    }
    px(g, '#0b0f1c', 88, 64, 2, 24);
  }

  // Lantern by the door.
  px(g, '#3a3a44', 105, 50, 1, 3);
  px(g, '#3a3a44', 103, 53, 5, 7);
  px(g, lit ? '#ffd23f' : '#6a6f7e', 104, 54, 3, 5);
  if (lit) {
    g.globalAlpha = 0.35 + 0.1 * Math.sin(time / 200);
    px(g, '#ffd98a', 99, 49, 13, 15);
    g.globalAlpha = 1;
  }

  // Flower pot: wilted or blooming.
  const flower = model.get('flower');
  px(g, '#b05638', 26, 82, 11, 7);
  px(g, '#c56a4a', 27, 83, 9, 5);
  if (flower.done >= flower.needed) {
    px(g, '#4fa25a', 31, 72, 1, 10);
    px(g, '#6cc070', 28, 76, 3, 2);
    px(g, '#ed93b1', 29, 69, 5, 4);
    px(g, '#ffd23f', 31, 70, 1, 1);
  } else {
    px(g, '#6f7d5a', 31, 76, 1, 6);
    px(g, '#6f7d5a', 32, 76, 3, 1);
    px(g, '#8a7a6a', 34, 77, 2, 2);
  }

  // The hedgehog family: shivering in the cold, then cosy and happy.
  const shiver = motion && w < 0.6 ? Math.round(Math.sin(t / 45)) : 0;
  const hop = look.sinceDone !== undefined && motion ? Math.round(Math.abs(Math.sin(look.sinceDone / 140)) * 2) : 0;
  paintGrid(g, MOM, HOG, 120 + shiver, 80 - hop);
  paintGrid(g, BABY, HOG, 136 - shiver, 84 - hop);
  if (look.sinceDone !== undefined) {
    const rise = Math.floor((look.sinceDone / 40) % 18);
    px(g, '#ff7aa8', 128, 74 - rise, 2, 2);
    px(g, '#ff7aa8', 131, 74 - rise, 2, 2);
    px(g, '#ff7aa8', 129, 76 - rise, 3, 1);
  }

  // Snow and wind, thinning out as the world warms.
  const flakes = Math.round(SNOW_SEEDS.length * (1 - w));
  for (let i = 0; i < flakes; i++) {
    const s = SNOW_SEEDS[i];
    if (!s) continue;
    const y = (s.y + time * s.speed * 2) % STAGE_H;
    const x = (s.x + time * s.speed) % STAGE_W;
    px(g, '#ffffff', x, y, 1, 1);
  }

  // Lures: a thin marching outline around each thing that is still broken.
  if (look.sinceDone === undefined) {
    for (const id of Object.keys(REPAIR_RECTS) as RepairId[]) {
      if (!model.isFixed(id)) dashedRect(g, REPAIR_RECTS[id], time, '#ffe08a');
    }
  } else if (motion) {
    // Sparkles over the mended house.
    for (let i = 0; i < 6; i++) {
      if (Math.floor(look.sinceDone / 160 + i) % 3 !== 0) continue;
      const sx = 52 + ((i * 23) % 58);
      const sy = 22 + ((i * 13) % 30);
      px(g, '#fff6c8', sx, sy - 1, 1, 3);
      px(g, '#fff6c8', sx - 1, sy, 3, 1);
    }
  }
}
