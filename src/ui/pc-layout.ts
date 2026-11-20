/**
 * Where everything on the computer's desk goes, for a given size of the page.
 *
 * The PC frame is the desk scene again, drawn in the same picture pixels: the
 * striped wall, the monitor on its stand, the beige case with the hamster's
 * cage on top, keyboard, mouse, fan and mug. Only the monitor's glass is
 * bigger, because PAL's window has to fit in it. All sizes are in picture
 * pixels; `s` is how many CSS pixels one of them takes.
 *
 * The glass has a size of its own that depends on the page only, never on
 * what the window shows, so the window never makes the computer grow.
 */

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Spot {
  readonly x: number;
  readonly y: number;
}

export interface PcLayout {
  /** 'full': the whole desk; 'compact': a phone, only the monitor on the desk's edge. */
  readonly mode: 'full' | 'compact';
  /** CSS pixels per picture pixel. */
  readonly s: number;
  /** The whole picture. */
  readonly w: number;
  readonly h: number;
  readonly bezel: Box;
  readonly glass: Box;
  /** Where the desk's top edge is. */
  readonly deskTop: number;
  /** One "desktop pixel" of the wallpaper (its icons are drawn in multiples of it), in picture pixels. */
  readonly u: number;
  /** Height of the wallpaper's taskbar, in picture pixels. */
  readonly bar: number;
  /** Width of the wallpaper's start button, with its one-pixel margin, in picture pixels. */
  readonly start: number;
  /**
   * The wallpaper is painted this size and blown up `zoom` times onto the glass:
   * about as many pixels as the desk scene's own screen, so the sun, the tree and
   * the hills come out exactly as there.
   */
  readonly paper: { readonly w: number; readonly h: number; readonly bar: number; readonly zoom: number };
  readonly note: Spot;
  readonly lamp: Spot;
  /** Things on the desk; left out on a phone. */
  readonly tower?: Spot;
  readonly cage?: Spot;
  readonly keyboard?: Spot;
  readonly mouse?: Spot;
  readonly mug?: Spot;
  readonly fan?: Spot;
  /** Where PAL's window stands in the glass, in CSS pixels from the glass's edges. */
  /**
   * Where PAL's window stands in the glass, in CSS pixels. `height` is fixed for the whole game,
   * so the window never grows or shrinks with what it shows; it may reach over the taskbar.
   */
  readonly win: { readonly left: number; readonly top: number; readonly bottom: number; readonly height: number };
}

/** Room kept free round the picture: the page's gutter, the path of hearts at the top. */
export const GUTTER = 16;
export const TOP_ROOM = 56;
export const BOTTOM_ROOM = 16;
/** PAL's window is this wide at most. */
export const WIN_W = 480;

/** Sizes of the things, as in the desk scene. */
const CASE_W = 30;
const CASE_H = 64;
const CAGE_H = 18;
const DESK_FULL = 18;
const DESK_COMPACT = 8;
/** Above the glass: the note sticks out over the bezel. */
const ABOVE_GLASS = 11;
/** Under the glass: the bezel's chin, the stand, then the desk. */
const BELOW_GLASS = 6 + 8;

/** Every picture pixel the full desk adds round the glass. */
// mug and fan on the left (14), the bezel (4 + 4), a gap with the drive in it (11), the case, a margin (7)
export const FULL_EXTRA_W = 14 + 8 + 11 + CASE_W + 7;
export const FULL_EXTRA_H = ABOVE_GLASS + BELOW_GLASS + DESK_FULL;
const COMPACT_EXTRA_W = 16;
const COMPACT_EXTRA_H = ABOVE_GLASS + BELOW_GLASS + DESK_COMPACT;

/** The glass never gets larger than this (CSS pixels), however big the page. */
const GLASS_MAX_W = 1000;
const GLASS_MAX_H = 640;
/** Wider than this (picture pixels) and the desktop would draw its icons three pixels to one. */
const GW_MAX = 224;
/** The glass the window would like to have (CSS pixels). */
const GLASS_WANT_W = 560;
const GLASS_WANT_H = 600;

const quarter = (n: number): number => Math.floor(n * 4) / 4;
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

export function layoutPc(viewW: number, viewH: number): PcLayout {
  // The card's border (3px each side) and its shadow under it are outside the picture.
  const availW = Math.max(200, viewW - GUTTER * 2 - 6);
  const availH = Math.max(240, viewH - TOP_ROOM - BOTTOM_ROOM - 12);

  // As big as the desk scene, but the glass comes first: the pixels shrink before it does.
  let s = clamp((availH - GLASS_WANT_H) / FULL_EXTRA_H, 3, 5);
  s = Math.min(s, (availW - GLASS_WANT_W) / FULL_EXTRA_W);
  if (s >= 2.5) return full(quarter(s), availW, availH);
  return compact(availW, availH);
}

function full(s: number, availW: number, availH: number): PcLayout {
  const gw = even(Math.min(Math.floor(availW / s) - FULL_EXTRA_W, Math.floor(GLASS_MAX_W / s), GW_MAX));
  const gh = even(Math.min(Math.floor(availH / s) - FULL_EXTRA_H, Math.floor(GLASS_MAX_H / s)));
  const bezel = { x: 14, y: ABOVE_GLASS - 4, w: gw + 8, h: gh + 10 };
  const glass = { x: bezel.x + 4, y: ABOVE_GLASS, w: gw, h: gh };
  const deskTop = bezel.y + bezel.h + 8;
  const right = bezel.x + bezel.w;
  const cx = Math.round(bezel.x + bezel.w / 2);
  const tower = { x: right + 11, y: deskTop + 3 - CASE_H };
  const paper = desktop(gw, gh, s);
  return {
    mode: 'full',
    s,
    w: gw + FULL_EXTRA_W,
    h: gh + FULL_EXTRA_H,
    bezel,
    glass,
    deskTop,
    ...paper,
    note: { x: right - 12, y: 1 },
    lamp: { x: right - 6, y: bezel.y + bezel.h - 4 },
    tower,
    cage: { x: tower.x, y: tower.y - CAGE_H },
    // At the very front: only the keyboard's two back rows are in the picture.
    keyboard: { x: cx - 31, y: deskTop + DESK_FULL - 10 },
    mouse: { x: cx + 35, y: deskTop + 7 },
    mug: { x: 3, y: deskTop + 2 },
    // Mostly off the left edge, so only a piece of it peeks in.
    fan: { x: -10, y: deskTop - 12 },
    win: windowPlace(gw, gh, s, paper, true),
  };
}

function compact(availW: number, availH: number): PcLayout {
  const s = quarter(clamp(availW / 200, 2, 4));
  const gw = even(Math.min(Math.floor(availW / s) - COMPACT_EXTRA_W, Math.floor(GLASS_MAX_W / s), GW_MAX));
  const gh = even(Math.max(60, Math.min(Math.floor(availH / s) - COMPACT_EXTRA_H, Math.floor(820 / s))));
  const bezel = { x: 4, y: ABOVE_GLASS - 4, w: gw + 8, h: gh + 10 };
  const glass = { x: bezel.x + 4, y: ABOVE_GLASS, w: gw, h: gh };
  const right = bezel.x + bezel.w;
  const paper = desktop(gw, gh, s);
  return {
    mode: 'compact',
    s,
    w: gw + COMPACT_EXTRA_W,
    h: gh + COMPACT_EXTRA_H,
    bezel,
    glass,
    deskTop: bezel.y + bezel.h + 8,
    ...paper,
    note: { x: right - 12, y: 1 },
    lamp: { x: right - 6, y: bezel.y + bezel.h - 4 },
    win: windowPlace(gw, gh, s, paper, false),
  };
}

const even = (n: number): number => n - (n % 2);

/** The desk scene's screen is this many pixels wide; the wallpaper is drawn for about that. */
const PAPER_W = 90;

type Desktop = Pick<PcLayout, 'u' | 'bar' | 'start' | 'paper'>;

/** The wallpaper's own measures for a glass this size (they follow `wallpaper.ts`). */
function desktop(gw: number, gh: number, s: number): Desktop {
  // A big glass gets the wallpaper painted at half size and doubled, so it keeps the desk's chunky pixels.
  const zoom = gw >= PAPER_W * 1.75 ? 2 : 1;
  const w = gw / zoom;
  const h = gh / zoom;
  const u = Math.max(1, Math.round(w / PAPER_W));
  // A taskbar about as tall as in the desk scene, whatever the pixel size.
  const bar = Math.max(9, Math.round(30 / (s * zoom)));
  const start = Math.max(9, Math.round(w * 0.12)) + 1;
  return { u: u * zoom, bar: bar * zoom, start: start * zoom, paper: { w, h, bar, zoom } };
}

/**
 * Where the window stands in the glass: at the top, so that it only ever grows
 * downwards, clear of the taskbar, and if there is room clear of the desktop
 * icons on the left (two columns of them) so they can still be clicked.
 */
/** The tallest PAL's window gets on a big screen; more would only be empty space. */
const WIN_MAX_H = 540;

function windowPlace(gw: number, gh: number, s: number, { u }: Desktop, roomy: boolean): PcLayout['win'] {
  const glassW = gw * s;
  const winW = Math.min(WIN_W, glassW - 16);
  const free = glassW - winW;
  const icons = 23 * u * s;
  let left = free / 2;
  if (roomy && left < icons) left = clamp(icons, 8, free - 8);
  return {
    left: Math.round(Math.max(8, left)),
    top: 8,
    // The window may stand over the taskbar: that is room it needs more than the taskbar does.
    bottom: 8,
    height: Math.round(roomy ? Math.min(WIN_MAX_H, gh * s - 16) : gh * s - 16),
  };
}
