import { INK } from '../../pixel/cast.ts';
import { paintWallpaper } from '../../pixel/wallpaper.ts';
import { px } from '../../pixel/stage.ts';

type G = CanvasRenderingContext2D;

export const STAGE_WIDTH = 160;
export const STAGE_HEIGHT = 100;

/** The glass of the monitor: page content is laid over this area. */
export const SCREEN_RECT = { x: 18, y: 12, w: 90, h: 54 };
/** Generous click area around the two USB ports. */
export const USB_RECT = { x: 122, y: 50, w: 32, h: 26 };

const DRIVE_ON_DESK = { x: 110, y: 85 };
/** Lined up just left of the upper port, then pushed in. */
const DRIVE_READY = { x: 114, y: 58 };
const DRIVE_IN_PORT = { x: 119, y: 58 };
/** Click area of the drive lying on the desk. */
export const DRIVE_RECT = { x: 104, y: 80, w: 22, h: 12 };

const C = {
  wall: '#f3e3c7',
  wallStripe: '#ecd8b8',
  desk: '#b98556',
  deskLight: '#cf9a6a',
  deskDark: '#a06f44',
  bezel: '#3b3a44',
  bezelDark: '#2f2e37',
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
  /** True while the player is carrying the drive as the cursor, so it is not on the desk. */
  readonly held?: boolean;
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

  // What the monitor shows: an ordinary, pretty desktop.
  const s = SCREEN_RECT;
  paintWallpaper(g, s.x, s.y, s.w, s.h, { gloomy: look.sad, drive: look.plug >= 1, t: motion ? t : 0 });

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

  // The flash drive: on the desk, carried to the port and pushed in, tip first.
  // While held it is the cursor, so it is not drawn here.
  if (!look.held) {
    let x: number = DRIVE_ON_DESK.x;
    let y: number = DRIVE_ON_DESK.y;
    if (look.plug > 0) {
      const lift = Math.min(1, look.plug / 0.6);
      const ease = 1 - (1 - lift) * (1 - lift);
      x = DRIVE_ON_DESK.x + (DRIVE_READY.x - DRIVE_ON_DESK.x) * ease;
      y = DRIVE_ON_DESK.y + (DRIVE_READY.y - DRIVE_ON_DESK.y) * ease - Math.sin(lift * Math.PI) * 6;
      if (look.plug > 0.6) {
        const push = (look.plug - 0.6) / 0.4;
        x = DRIVE_READY.x + (DRIVE_IN_PORT.x - DRIVE_READY.x) * push * push;
      }
    }
    paintDriveSide(g, Math.round(x), Math.round(y), look.plug);
    if (look.plug >= 1 && blink) px(g, C.yellow, Math.round(x) + 2, Math.round(y) + 1, 1, 1);
  }
}

/** The drive seen from the side, tip pointing right; the tip vanishes into the port as it goes in. */
function paintDriveSide(g: G, x: number, y: number, plug: number): void {
  if (plug < 1) {
    px(g, '#8a8a96', x + 10, y + 1, 4, 4);
    px(g, C.metal, x + 10, y + 1, 4, 3);
    px(g, INK, x + 11, y + 2, 1, 1);
    px(g, INK, x + 12, y + 2, 1, 1);
  }
  px(g, C.pinkDark, x, y, 11, 6);
  px(g, C.pink, x, y, 10, 5);
  px(g, '#f7bfd2', x + 1, y + 1, 7, 1);
  // a tiny heart on the side
  px(g, C.white, x + 3, y + 2, 1, 1);
  px(g, C.white, x + 5, y + 2, 1, 1);
  px(g, C.white, x + 4, y + 3, 1, 1);
}

/** Now and then a four-pointed twinkle catches the light on the drive: something precious. */
export function paintDriveTwinkle(g: G, t: number): void {
  const cycle = t % 2600;
  if (cycle > 700) return;
  const size = cycle < 350 ? Math.round((cycle / 350) * 3) : Math.round(((700 - cycle) / 350) * 3);
  if (size <= 0) return;
  const x = DRIVE_ON_DESK.x + 9;
  const y = DRIVE_ON_DESK.y - 1;
  px(g, '#fff6c8', x, y - size, 1, size * 2 + 1);
  px(g, '#fff6c8', x - size, y, size * 2 + 1, 1);
  px(g, C.white, x, y, 1, 1);
}

/** Once the drive is picked up, the ports light up, inviting it in. */
export function paintPortGlow(g: G, t: number): void {
  const pulse = 0.35 + 0.25 * Math.sin(t / 240);
  g.globalAlpha = pulse;
  px(g, '#ffe08a', 127, 55, 24, 15);
  g.globalAlpha = 1;
  px(g, '#ffe08a', 131, 59, 7, 3);
  px(g, '#ffe08a', 131, 64, 7, 3);
  px(g, '#fff6c8', 132, 60, 5, 1);
  px(g, '#fff6c8', 132, 65, 5, 1);
}
