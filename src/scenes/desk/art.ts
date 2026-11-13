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
/** The big round button on the front of the case. */
export const POWER_RECT = { x: 131, y: 38, w: 13, h: 13 };
/** The pink day/night key on the keyboard. */
export const NIGHT_KEY_RECT = { x: 84, y: 85, w: 9, h: 6 };
export const FAN_RECT = { x: 17, y: 64, w: 19, h: 30 };
export const MUG_RECT = { x: 4, y: 81, w: 13, h: 12 };
export const NOTE_RECT = { x: 98, y: 0, w: 13, h: 12 };

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
  /** The computer is switched off: black screen, dark lamp. */
  readonly off?: boolean;
  /** Stage time the computer was switched on, for its boot screen. */
  readonly bootAt?: number;
  /** The desktop shows night. */
  readonly night?: boolean;
}

/** How long the boot screen shows after switching on. */
export const BOOT_MS = 1800;

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

  // What the monitor shows: an ordinary, pretty desktop — or nothing, or the boot screen.
  const s = SCREEN_RECT;
  const booting = look.bootAt !== undefined && t - look.bootAt < BOOT_MS;
  if (look.off) {
    px(g, '#101016', s.x, s.y, s.w, s.h);
    px(g, '#24242e', s.x + 6, s.y + 4, 18, 1);
    px(g, '#24242e', s.x + 4, s.y + 6, 10, 1);
  } else if (booting) {
    const u = (t - (look.bootAt ?? 0)) / BOOT_MS;
    px(g, '#000000', s.x, s.y, s.w, s.h);
    px(g, '#ed93b1', s.x + s.w / 2 - 6, s.y + 18, 12, 10);
    px(g, '#ffffff', s.x + s.w / 2 - 3, s.y + 21, 2, 2);
    px(g, '#ffffff', s.x + s.w / 2 + 1, s.y + 21, 2, 2);
    px(g, '#2a2a34', s.x + 25, s.y + 36, s.w - 50, 3);
    px(g, '#ffffff', s.x + 25, s.y + 36, Math.round((s.w - 50) * Math.min(1, u * 1.2)), 3);
  } else {
    paintWallpaper(g, s.x, s.y, s.w, s.h, { gloomy: look.sad, drive: look.plug >= 1 && !look.off, night: look.night, t: motion ? t : 0 });
  }

  // Keyboard, mouse and a mug.
  px(g, C.beigeShade, 38, 85, 54, 10);
  px(g, C.beige, 39, 86, 52, 8);
  for (let row = 0; row < 3; row++) {
    for (let key = 0; key < 16; key++) px(g, C.beigeLight, 40 + key * 3 + row, 87 + row * 2 + (row ? 0.5 : 0), 2, 1);
  }
  // The pink day/night key, with a little moon or sun on it.
  px(g, C.pinkDark, 86, 87, 5, 3);
  px(g, C.pink, 86, 87, 4, 2);
  px(g, look.night ? '#fff3b0' : '#ffffff', 88, 87, 1, 1);
  px(g, C.beige, 98, 88, 7, 6);
  px(g, C.beigeShade, 101, 88, 1, 3);
  paintFan(g, motion ? t : 0, !look.off);
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
  px(g, look.off ? '#6a6658' : blink ? C.green : C.greenDim, 146, 44, 2, 2);
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

/** A little desk fan with a pink ribbon tied to its guard, fluttering in the breeze. */
function paintFan(g: G, t: number, spinning: boolean): void {
  const cx = 26;
  const cy = 72;
  // base and neck
  px(g, '#8a8a96', 21, 91, 11, 2);
  px(g, '#a9a9b4', 22, 90, 9, 1);
  px(g, '#8a8a96', 25, 80, 3, 10);
  // the guard
  for (let a = 0; a < 32; a++) {
    const ang = (a / 32) * Math.PI * 2;
    px(g, '#c9c9d1', cx + Math.round(Math.cos(ang) * 8), cy + Math.round(Math.sin(ang) * 8), 1, 1);
  }
  px(g, '#b8b8c2', cx - 7, cy, 15, 1);
  px(g, '#b8b8c2', cx, cy - 7, 1, 15);
  // the blades, turning
  const turn = spinning ? t / 40 : 0.4;
  for (let b = 0; b < 3; b++) {
    const ang = turn + (b / 3) * Math.PI * 2;
    for (let r = 1; r <= 6; r++) {
      px(g, '#7fb2e5', cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), 2, 1);
    }
  }
  px(g, '#4f8fd6', cx - 1, cy - 1, 3, 3);
  // the ribbon: tied at the top of the guard, blown out to the right
  const wave = spinning ? t / 90 : 0;
  for (let i = 0; i < 12; i++) {
    const ry = cy - 6 + Math.round(Math.sin(wave + i * 0.7) * (spinning ? 1.5 : 0.5)) + (spinning ? 0 : Math.round(i * 0.8));
    px(g, i % 2 ? '#ed93b1' : '#f7b6cc', cx + 8 + (spinning ? i : Math.round(i * 0.3)), ry, 1, 1);
  }
}

/** Twinkles round the power button, when switching on is the thing to do. */
export function paintPowerTwinkle(g: G, t: number): void {
  for (const [x, y, phase] of [[129, 37, 0], [145, 40, 500], [138, 53, 900]] as const) {
    const cycle = (t + phase) % 1400;
    if (cycle > 800) continue;
    const size = cycle < 400 ? Math.round((cycle / 400) * 3) : Math.round(((800 - cycle) / 400) * 3);
    if (size <= 0) continue;
    px(g, '#fff6c8', x, y - size, 1, size * 2 + 1);
    px(g, '#fff6c8', x - size, y, size * 2 + 1, 1);
    px(g, C.white, x, y, 1, 1);
  }
}
