import { INK, paintFace } from '../../pixel/cast.ts';
import { px } from '../../pixel/stage.ts';

type G = CanvasRenderingContext2D;

export const STAGE_WIDTH = 160;
export const STAGE_HEIGHT = 100;

/** The glass of the monitor: page content is laid over this area. */
export const SCREEN_RECT = { x: 18, y: 12, w: 90, h: 54 };
/** Generous click area around the two USB ports. */
export const USB_RECT = { x: 122, y: 50, w: 32, h: 26 };

const DRIVE_ON_DESK = { x: 112, y: 84 };
const DRIVE_IN_PORT = { x: 130, y: 58 };

const C = {
  wall: '#f3e3c7',
  wallStripe: '#ecd8b8',
  desk: '#b98556',
  deskLight: '#cf9a6a',
  deskDark: '#a06f44',
  bezel: '#3b3a44',
  bezelDark: '#2f2e37',
  wallpaper: '#8fd3cd',
  wallpaperHill: '#7cc66b',
  taskbar: '#3a6fb0',
  start: '#5dcaa5',
  white: '#ffffff',
  beige: '#d9d4c7',
  beigeLight: '#f1eee6',
  beigeShade: '#bdb7a8',
  beigeDark: '#a9a394',
  green: '#5dcaa5',
  greenDim: '#3f8f77',
  pink: '#ed93b1',
  pinkDark: '#d4537e',
  metal: '#c9c9d1',
  yellow: '#ffd23f',
  note: '#ffe88a',
} as const;

export interface DeskLook {
  /** 0 = drive lying on the desk, 1 = drive in the port. */
  readonly plug: number;
  readonly sad: boolean;
}

export function paintDesk(g: G, t: number, look: DeskLook, motion: boolean): void {
  const blink = motion ? Math.floor(t / 400) % 2 === 0 : true;

  px(g, C.wall, 0, 0, 160, 80);
  for (let x = 4; x < 160; x += 12) px(g, C.wallStripe, x, 0, 2, 80);

  px(g, C.desk, 0, 80, 160, 20);
  px(g, C.deskLight, 0, 80, 160, 1);
  px(g, C.deskDark, 0, 98, 160, 2);

  // Monitor.
  px(g, C.bezelDark, 56, 72, 14, 6);
  px(g, C.bezelDark, 46, 78, 34, 3);
  px(g, C.bezel, 14, 8, 98, 64);
  px(g, C.green, 106, 68, 2, 2);
  px(g, C.note, 100, 2, 9, 8);
  px(g, INK, 102, 5, 5, 1);

  // What the monitor shows.
  const s = { x: 18, y: 12, w: 90, h: 54 };
  px(g, C.wallpaper, s.x, s.y, s.w, s.h);
  px(g, C.wallpaperHill, s.x, s.y + 36, s.w, 12);
  px(g, C.wallpaperHill, s.x + 50, s.y + 31, 30, 5);
  px(g, C.taskbar, s.x, s.y + 48, s.w, 6);
  px(g, C.start, s.x + 1, s.y + 49, 9, 4);
  px(g, C.white, s.x + 80, s.y + 50, 7, 2);
  paintFace(g, look.sad, s.x + 4, s.y + 4, 2);
  px(g, C.white, s.x + 6, s.y + 28, 6, 6);
  px(g, C.yellow, s.x + 16, s.y + 28, 6, 6);

  // Keyboard, mouse and a mug.
  px(g, C.beigeShade, 38, 85, 54, 10);
  px(g, C.beige, 39, 86, 52, 8);
  for (let row = 0; row < 3; row++) {
    for (let key = 0; key < 16; key++) px(g, C.beigeLight, 40 + key * 3 + row, 87 + row * 2 + (row ? 0.5 : 0), 2, 1);
  }
  px(g, C.beige, 98, 88, 7, 6);
  px(g, C.beigeShade, 101, 88, 1, 3);
  px(g, C.pink, 6, 83, 8, 9);
  px(g, C.pinkDark, 14, 85, 2, 5);
  px(g, C.white, 8, 86, 4, 3);

  // Computer case.
  px(g, C.beigeShade, 123, 19, 30, 64);
  px(g, C.beige, 124, 20, 28, 62);
  px(g, C.beigeLight, 124, 20, 28, 1);
  px(g, C.beigeShade, 127, 24, 22, 6);
  px(g, C.beigeDark, 128, 26, 20, 1);
  px(g, C.beigeShade, 127, 32, 22, 4);
  px(g, C.beigeLight, 133, 40, 9, 9);
  px(g, C.beigeShade, 135, 42, 5, 5);
  px(g, blink ? C.green : C.greenDim, 146, 44, 2, 2);
  px(g, C.beigeDark, 128, 55, 20, 15);
  px(g, INK, 131, 59, 7, 3);
  px(g, INK, 131, 64, 7, 3);
  px(g, C.beigeLight, 141, 60, 4, 1);
  px(g, C.beigeLight, 141, 65, 4, 1);
  for (let y = 73; y < 80; y += 2) px(g, C.beigeDark, 128, y, 20, 1);

  // The flash drive: on the desk, on its way, or sticking out of the port.
  const x = DRIVE_ON_DESK.x + (DRIVE_IN_PORT.x - DRIVE_ON_DESK.x) * look.plug;
  const y = DRIVE_ON_DESK.y + (DRIVE_IN_PORT.y - DRIVE_ON_DESK.y) * look.plug - Math.sin(look.plug * Math.PI) * 10;
  if (look.plug < 1) px(g, C.metal, x - 3, y + 1, 3, 3);
  px(g, C.pinkDark, x, y, 10, 5);
  px(g, C.pink, x, y, 9, 4);
  px(g, C.white, x + 2, y + 1, 2, 2);
  if (look.plug >= 1 && blink) px(g, C.yellow, x + 7, y + 1, 1, 1);
}

/** The "!" over the USB ports while the drive still lies on the desk. */
export function paintPortHint(g: G, t: number): void {
  const bob = Math.round(Math.sin(t / 220) * 1.5);
  px(g, C.white, 136, 30 + bob, 7, 14);
  px(g, INK, 138, 32 + bob, 3, 6);
  px(g, INK, 138, 40 + bob, 3, 2);
}
