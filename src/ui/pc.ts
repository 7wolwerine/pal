import { audio } from '../audio/engine.ts';
import { DESK } from '../content/intro.ts';
import { px } from '../pixel/stage.ts';
import { desktop, paintWallpaper, pokeWallpaper, wallClock, type WallpaperHit } from '../pixel/wallpaper.ts';
import {
  CASE_AT,
  CASE_SIZE,
  CAGE_SIZE,
  KEYBOARD_SIZE,
  MUG_SIZE,
  KEY_COLUMNS,
  KEY_ROWS,
  keyAt,
  paintCase,
  paintDriveSide,
  paintFan,
  paintHamsterCage,
  paintKeyboard,
  paintMouse,
  paintMug,
  paintNote,
  paintTuneNote,
  type HamsterMood,
} from '../scenes/desk/art.ts';
import { TunePlayer, type Tune } from '../scenes/desk/model.ts';
import { h, prefersReducedMotion } from './dom.ts';
import { layoutPc, type Box, type PcLayout } from './pc-layout.ts';
import { Speech } from './speech.ts';

/** The desk scene's own colours. */
const ROOM = {
  wall: '#f3e3c7',
  stripe: '#ecd8b8',
  desk: '#b98556',
  deskLight: '#cf9a6a',
  deskDark: '#a06f44',
  bezel: '#3b3a44',
  bezelDark: '#2f2e37',
  glass: '#101016',
  yellow: '#ffd23f',
} as const;
const LAMPS = ['#5dcaa5', '#ffd23f', '#ed93b1', '#7fb2e5'] as const;
const NOTE_COLOURS = ['#ed93b1', '#7fb2e5', '#5dcaa5', '#ffd23f'] as const;
/** The keyboard's tune, the same as at the desk. */
const TUNE: Tune = [72, 76, 79, 76, 81, 79, 76, 74, 72, 74, 77, 81, 79, 76, 74, 72];
const HAMSTER_MOODS: readonly HamsterMood[] = ['look', 'cheeks', 'fast', 'run'];
/** About twelve pictures a second is plenty for drifting clouds and a turning fan. */
const FRAME_MS = 80;
const ERROR_MS = 2800;

/** In the desk scene the drive sits in the upper port of a case standing at `CASE_AT`; these are from there. */
const DRIVE_IN_PORT = { x: 116, y: 55 };
const PORT_EDGE = 131;
const POWER = { x: 8, y: 19, w: 13, h: 13 };
const TRAY = { x: 3, y: 3, w: 24, h: 9 };
const VENT = { x: 3, y: 53, w: 24, h: 10 };

interface FloatingNote {
  readonly x: number;
  readonly y: number;
  readonly at: number;
  readonly kind: number;
}

interface Hotspot {
  readonly el: HTMLButtonElement;
  /** Where it goes in this layout, or nothing when the thing is not on the desk (a phone). */
  readonly rect: (L: PcLayout) => Box | undefined;
}

/**
 * The computer the player plugged the drive into. Every scene that happens in
 * PAL's window happens on this computer's screen, and it is the very desk of
 * the desk scene, in the same pixels: the striped wall, the monitor with the
 * living desktop (the same `desktop`, so day or night carries over), the case
 * with the pink drive still in its port and the hamster on top, keyboard,
 * mouse, fan and mug. It all still answers clicks, and the computer still
 * cannot be switched off. Only the glass is bigger, so the window fits in it,
 * and its size depends on the page alone: the window never makes it grow.
 */
export function createPc(win: HTMLElement): HTMLElement {
  const motion = !prefersReducedMotion();
  const room = h('canvas', { class: 'pc__room', attrs: { 'aria-hidden': 'true' } });
  const paper = h('canvas', { class: 'pc__wallpaper', attrs: { 'aria-hidden': 'true' } });
  const glass = h('button', { class: 'pc__glass', attrs: { type: 'button', 'aria-label': DESK.glassLabel } }, paper);
  // The taskbar is painted with the wallpaper; this only holds the minimised window's button over it.
  const taskbar = h('div', { class: 'pc__taskbar' }, h('span', { class: 'pc__start' }));
  const errors = h('div', { class: 'pc__errors' });
  const screen = h('div', { class: 'pc__screen' }, glass, win, taskbar, errors);
  const monitor = h('div', { class: 'pc__monitor' }, screen);
  const tower = h('div', { class: 'pc__tower', attrs: { 'aria-hidden': 'true' } });
  const pc = h('div', { class: 'pc' }, room, monitor, tower);

  const roomG = room.getContext('2d');
  const paperG = paper.getContext('2d');

  let L = layoutPc(viewW(), window.innerHeight);
  const started = performance.now();
  const now = (): number => performance.now() - started;

  /* ---------- little thoughts and system errors ---------- */

  let speech: Speech | undefined;
  let speechTimer = 0;
  /** A thought in a bubble over `at` (picture pixels of the desk). */
  function think(text: string, at: { x: number; y: number; w: number }): void {
    if (!text) return;
    speech?.stop();
    window.clearTimeout(speechTimer);
    const mine = new Speech(pc, L.w, L.h);
    speech = mine;
    void mine.say(text, () => ({ x: at.x + at.w / 2, y: at.y }), { who: 'hero' });
    // The bubble fades by itself; then its follower is stopped too, so nothing runs for nothing.
    speechTimer = window.setTimeout(() => {
      mine.stop();
      if (speech === mine) speech = undefined;
    }, 2600 + text.length * 85);
  }

  const counters = new Map<string, number>();
  const count = (key: string): number => {
    const n = counters.get(key) ?? 0;
    counters.set(key, n + 1);
    return n;
  };
  const next = (key: string, lines: readonly string[]): string => lines[count(key) % lines.length] ?? '';

  let errorTimer = 0;
  function systemError(text: string): void {
    const toast = h('p', { class: 'desk__error', attrs: { role: 'status' } }, h('span', { class: 'desk__error-x', text: '×', attrs: { 'aria-hidden': 'true' } }), h('span', { text }));
    errors.replaceChildren(toast);
    window.clearTimeout(errorTimer);
    errorTimer = window.setTimeout(() => toast.remove(), ERROR_MS);
  }

  /* ---------- the desktop on the glass ---------- */

  glass.addEventListener('click', (event) => {
    const box = paper.getBoundingClientRect();
    const keyboardClick = event.clientX === 0 && event.clientY === 0;
    const fx = keyboardClick || !box.width ? 0.5 : (event.clientX - box.left) / box.width;
    const fy = keyboardClick || !box.height ? 0.5 : (event.clientY - box.top) / box.height;
    const wasNight = desktop.night;
    const hit = pokeWallpaper(desktop, fx, fy, now(), { drive: true, bar: L.paper.bar });
    answer(hit, wasNight, { x: L.glass.x + fx * L.glass.w, y: L.glass.y + fy * L.glass.h, w: 0 });
    redraw();
  });

  /** The sound for what was hit on the desktop, and now and then a thought about it (as at the desk). */
  function answer(hit: WallpaperHit, wasNight: boolean, at: { x: number; y: number; w: number }): void {
    if (!hit) return;
    const lines = DESK.thoughts.desktop;
    const muse = (key: string, pool: readonly string[]): void => {
      const n = count(`desktop:${key}`);
      if (n % 4 === 0) think(pool[(n / 4) % pool.length] ?? '', at);
    };
    const g = L.glass;
    if (hit === 'clock' || hit === 'start') at = { x: at.x, y: g.y + g.h - L.bar - 1, w: 0 };
    if (hit === 'tree') at = { x: at.x, y: g.y + Math.round(g.h * 0.26), w: 0 };
    switch (hit) {
      case 'sun':
      case 'moon':
        audio.click(84, 0.3);
        window.setTimeout(() => audio.click(88, 0.3), 110);
        at = { x: at.x, y: g.y + 3, w: 0 };
        return muse(hit, lines[hit]);
      case 'water':
        audio.click(62, 0.25);
        window.setTimeout(() => audio.click(69, 0.15), 70);
        return;
      case 'fish':
        audio.boing(0.3);
        return think(next('desktop:fish', lines.fish), at);
      case 'sky':
        audio.click(wasNight ? 96 : 76, 0.25);
        return wasNight ? muse('star', lines.star) : muse('sky', lines.sky);
      case 'mountain':
        audio.click(57, 0.35);
        window.setTimeout(() => audio.click(57, 0.18), 260);
        window.setTimeout(() => audio.click(57, 0.08), 520);
        return muse('mountain', lines.mountain);
      case 'tree':
        audio.click(50, 0.25);
        return wasNight ? muse('owl', lines.owl) : muse('tree', lines.tree);
      case 'meadow':
        audio.click(88, 0.22);
        return muse('meadow', lines.meadow);
      case 'folder':
        audio.click(72, 0.35);
        return muse('folder', lines.folder);
      case 'bin':
        audio.crunch();
        return muse('bin', lines.bin);
      case 'drive':
        audio.click(91, 0.3);
        return muse('drive', lines.drive);
      case 'switch':
        audio.click(desktop.night ? 67 : 79, 0.35);
        return think(DESK.thoughts.night[desktop.night ? 0 : 1], at);
      case 'start':
        audio.click(64, 0.35);
        return muse('start', lines.start);
      case 'clock':
        audio.click(96, 0.2);
        return muse('clock', lines.clock);
      default:
        // one of the old programs: it only complains
        audio.click(40, 0.5);
        window.setTimeout(() => audio.click(38, 0.4), 120);
        systemError(DESK.retro[hit]);
    }
  }

  /* ---------- the things on the desk ---------- */

  const spots: Hotspot[] = [];
  function spot(label: string, rect: Hotspot['rect'], onClick: (event: MouseEvent, el: HTMLButtonElement) => void): HTMLButtonElement {
    const el = h('button', { class: 'scene__hotspot pc__spot', attrs: { type: 'button', 'aria-label': label } });
    el.addEventListener('click', (event) => {
      onClick(event, el);
      redraw();
    });
    spots.push({ el, rect });
    pc.append(el);
    return el;
  }
  const rectOf = (el: HTMLElement): Box => {
    const found = spots.find((s) => s.el === el)?.rect(L);
    return found ?? { x: 0, y: 0, w: 0, h: 0 };
  };
  const caseBox = (r: Box) => (l: PcLayout): Box | undefined => (l.tower ? { x: l.tower.x + r.x, y: l.tower.y + r.y, w: r.w, h: r.h } : undefined);

  // The power button: it reacts, but the computer is busy with something and will not switch off.
  const power = spot(DESK.powerLabel, caseBox(POWER), () => {
    audio.click(50, 0.3);
    think(DESK.thoughts.stuck, rectOf(power));
  });

  let trayOpen = false;
  let trayAt: number | undefined;
  const tray = spot(DESK.trayLabel, caseBox(TRAY), () => {
    trayOpen = !trayOpen;
    trayAt = now();
    audio.latch();
    think(next('tray', DESK.thoughts.tray), rectOf(tray));
  });

  let dustAt: number | undefined;
  const vent = spot(DESK.ventLabel, caseBox(VENT), () => {
    dustAt = now();
    audio.click(43, 0.3);
    think(next('vent', DESK.thoughts.vent), rectOf(vent));
  });

  // Boo the hamster: stops and looks, stuffs his cheeks, sprints, and goes back to his round.
  let hamster: HamsterMood = 'run';
  let hamsterAt = 0;
  let wheel = 0;
  let wheelSpeed = 1;
  const cage = spot(DESK.cageLabel, (l) => (l.cage ? { x: l.cage.x, y: l.cage.y, w: CAGE_SIZE.w, h: CAGE_SIZE.h } : undefined), () => {
    hamster = HAMSTER_MOODS[count('hamster') % HAMSTER_MOODS.length] ?? 'run';
    hamsterAt = now();
    audio.click(hamster === 'fast' ? 98 : 94, 0.2);
    if (hamster === 'cheeks') window.setTimeout(() => audio.click(60, 0.15), 200);
    const r = rectOf(cage);
    // Under the cage, so the bubble does not hide him.
    think(next(`hamster:${hamster}`, DESK.thoughts.hamster[hamster]), { x: r.x - 6, y: r.y + r.h + 2, w: r.w });
  });

  // The keyboard plays a tune, one note for every click.
  const tune = new TunePlayer(TUNE);
  const pressed = new Set<number>();
  const floating: FloatingNote[] = [];
  const keyboard = spot(DESK.keyboardLabel, (l) => (l.keyboard ? { x: l.keyboard.x, y: l.keyboard.y, w: KEYBOARD_SIZE.w, h: KEYBOARD_SIZE.h } : undefined), (event, el) => {
    const box = el.getBoundingClientRect();
    const random = (event.clientX === 0 && event.clientY === 0) || !box.width;
    const fx = random ? Math.random() : (event.clientX - box.left) / box.width;
    const fy = random ? Math.random() : (event.clientY - box.top) / box.height;
    const key = keyAt(fx, fy);
    const note = tune.next();
    // the key under the finger and two more, as if a whole hand had landed
    const all = KEY_COLUMNS * KEY_ROWS;
    const hand = [key, (key + 2 + (note % 3)) % all, (key + KEY_COLUMNS - 1) % all];
    for (const k of hand) pressed.add(k);
    window.setTimeout(() => {
      for (const k of hand) pressed.delete(k);
      redraw();
    }, 170);
    audio.click(note, 0.5);
    window.setTimeout(() => audio.click(note + 12, 0.18), 60);
    const r = rectOf(keyboard);
    floating.push({ x: r.x + fx * r.w - 2, y: r.y - 3, at: now(), kind: tune.played });
    if (floating.length > 8) floating.shift();
    if (tune.played % TUNE.length === 0) think(next('keyboard', DESK.thoughts.keyboard), r);
  });

  let mouseAt: number | undefined;
  const mouse = spot(DESK.mouseLabel, (l) => (l.mouse ? { x: l.mouse.x - 2, y: l.mouse.y - 2, w: 10, h: 10 } : undefined), () => {
    mouseAt = now();
    audio.click(93, 0.25);
    think(next('mouse', DESK.thoughts.mouse), rectOf(mouse));
  });

  let lamp = 0;
  const led = spot(DESK.lampLabel, (l) => ({ x: l.lamp.x - 3, y: l.lamp.y - 2, w: 8, h: 6 }), () => {
    lamp = (lamp + 1) % LAMPS.length;
    audio.click(81 + lamp * 2, 0.25);
    think(DESK.thoughts.lamp[lamp] ?? '', rectOf(led));
  });

  let fanTurn = 0.4;
  let fanSpeed = 1;
  let fanBoostAt: number | undefined;
  const fan = spot(DESK.fanLabel, (l) => (l.fan ? { x: Math.max(0, l.fan.x), y: l.fan.y, w: 19 - Math.max(0, -l.fan.x), h: 30 } : undefined), () => {
    fanBoostAt = now();
    audio.click(55, 0.2);
    think(next('fan', DESK.thoughts.fan), rectOf(fan));
  });

  // The mug: its words are too small to read, so a click (or the mouse over it) holds them up.
  let mugTimer = 0;
  const mug = spot(DESK.mugLabel, (l) => (l.mug ? { x: l.mug.x - 1, y: l.mug.y - 1, w: MUG_SIZE.w + 2, h: MUG_SIZE.h + 2 } : undefined), (_event, el) => {
    el.classList.add('is-read');
    audio.click(70, 0.25);
    think(DESK.thoughts.mug, rectOf(mug));
    window.clearTimeout(mugTimer);
    mugTimer = window.setTimeout(() => el.classList.remove('is-read'), 6000);
  });
  mug.classList.add('desk__mug');
  mug.append(h('span', { class: 'desk__mugtag', text: DESK.mugWords, attrs: { 'aria-hidden': 'true' } }));

  const note = spot(DESK.noteLabel, (l) => ({ x: l.note.x - 2, y: Math.max(0, l.note.y - 1), w: 13, h: 11 }), () => {
    audio.click(86, 0.2);
    const r = rectOf(note);
    think(next('note', DESK.thoughts.note), { x: r.x, y: r.y + r.h + 1, w: r.w });
  });

  /* ---------- painting ---------- */

  let clock = wallClock();
  let clockAt = -Infinity;
  let last = 0;

  function paint(): void {
    const t = now();
    const dt = Math.min(200, t - last);
    last = t;
    if (t - clockAt > 1000) {
      clockAt = t;
      clock = wallClock();
    }
    // the wheel and the fan keep their own pace
    if (hamster !== 'run' && t - hamsterAt > (hamster === 'fast' ? 3200 : 2600)) hamster = 'run';
    const wheelTarget = hamster === 'fast' ? 2.6 : hamster === 'run' ? 1 : 0;
    wheelSpeed += (wheelTarget - wheelSpeed) * Math.min(1, dt / 220);
    if (motion) wheel += (dt / 160) * wheelSpeed;
    const boost = fanBoostAt !== undefined && t - fanBoostAt < 1600;
    fanSpeed += ((boost ? 2.4 : 1) - fanSpeed) * Math.min(1, dt / 500);
    if (motion) fanTurn += (dt / 40) * fanSpeed;

    if (paperG) {
      paintWallpaper(paperG, 0, 0, L.paper.w, L.paper.h, { drive: true, live: desktop, clock, t, still: !motion, bar: L.paper.bar });
    }
    if (roomG) paintRoom(roomG, t);
  }

  function paintRoom(g: CanvasRenderingContext2D, t: number): void {
    const blink = motion ? Math.floor(t / 400) % 2 === 0 : true;
    const { bezel, glass: gl, deskTop } = L;
    g.clearRect(0, 0, L.w, L.h);
    px(g, ROOM.wall, 0, 0, L.w, deskTop);
    for (let x = 4; x < L.w; x += 12) px(g, ROOM.stripe, x, 0, 2, deskTop);
    px(g, ROOM.desk, 0, deskTop, L.w, L.h - deskTop);
    px(g, ROOM.deskLight, 0, deskTop, L.w, 1);
    px(g, ROOM.deskDark, 0, L.h - 2, L.w, 2);

    // The monitor on its stand.
    const cx = Math.round(bezel.x + bezel.w / 2);
    const chin = bezel.y + bezel.h;
    px(g, ROOM.bezelDark, cx - 7, chin, 14, 6);
    px(g, ROOM.bezelDark, cx - 17, chin + 6, 34, 3);
    px(g, ROOM.bezel, bezel.x, bezel.y, bezel.w, bezel.h);
    px(g, ROOM.glass, gl.x, gl.y, gl.w, gl.h);
    px(g, LAMPS[lamp] ?? LAMPS[0], L.lamp.x, L.lamp.y, 2, 2);
    paintNote(g, L.note.x, L.note.y);

    if (L.keyboard) paintKeyboard(g, L.keyboard.x, L.keyboard.y, pressed);
    if (L.mouse) {
      const nudge = mouseAt === undefined ? 1 : Math.min(1, (t - mouseAt) / 420);
      paintMouse(g, L.mouse.x + Math.round(Math.sin(nudge * Math.PI * 2) * 2 * (1 - nudge)), L.mouse.y);
    }
    if (L.fan) paintFan(g, L.fan.x, L.fan.y, motion ? t : 0, true, fanTurn);
    if (L.mug) paintMug(g, L.mug.x, L.mug.y);

    if (L.tower) {
      const move = trayAt === undefined ? 1 : Math.min(1, (t - trayAt) / 320);
      paintCase(g, L.tower.x, L.tower.y, { blink, tray: trayOpen ? move : 1 - move, dust: dustAt === undefined ? undefined : t - dustAt });
      // The drive is still in the port, as it was left: drawn where the desk scene draws it.
      g.save();
      g.translate(L.tower.x - CASE_AT.x, L.tower.y - CASE_AT.y);
      paintDriveSide(g, DRIVE_IN_PORT.x, DRIVE_IN_PORT.y, PORT_EDGE);
      if (blink) px(g, ROOM.yellow, DRIVE_IN_PORT.x + 11, DRIVE_IN_PORT.y + 2, 1, 1);
      g.restore();
    }
    if (L.cage) {
      const step = Math.floor(t / (hamster === 'fast' ? 70 : hamster === 'cheeks' ? 220 : 130));
      paintHamsterCage(g, L.cage.x, L.cage.y, { angle: wheel, mood: hamster, step });
    }

    // notes floating up from the keyboard
    for (const n of floating) {
      const u = (t - n.at) / 1100;
      if (u >= 1 || u < 0) continue;
      g.globalAlpha = Math.min(1, (1 - u) * 1.6);
      paintTuneNote(g, n.x + Math.sin(u * 5 + n.kind) * 2, n.y - u * 16, n.kind, NOTE_COLOURS[n.kind % NOTE_COLOURS.length] ?? '#ed93b1');
      g.globalAlpha = 1;
    }
  }

  /* ---------- size ---------- */

  /**
   * The height the layout is drawn for. On a phone the on-screen keyboard makes the page
   * shorter (but not narrower) while a field is being typed in: the computer keeps its size
   * then, instead of shrinking and jumping under the player's thumb.
   */
  let laidW = 0;
  let laidH = 0;
  const typing = (): boolean => {
    const el = document.activeElement;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
  };

  function relayout(): void {
    const w = viewW();
    const keyboard = typing() && w === laidW && window.innerHeight < laidH;
    if (!keyboard) laidH = window.innerHeight;
    laidW = w;
    L = layoutPc(w, laidH);
    const s = L.s;
    const css = (n: number): string => `${Math.round(n * s * 100) / 100}px`;
    pc.dataset.mode = L.mode;
    const set = (name: string, value: string): void => pc.style.setProperty(name, value);
    set('--pc-s', `${s}px`);
    set('--pc-w', css(L.w));
    set('--pc-h', css(L.h));
    set('--pc-mx', css(L.bezel.x));
    set('--pc-my', css(L.bezel.y));
    set('--pc-mw', css(L.bezel.w));
    set('--pc-mh', css(L.bezel.h));
    set('--pc-gx', css(L.glass.x - L.bezel.x));
    set('--pc-gy', css(L.glass.y - L.bezel.y));
    set('--pc-gw', css(L.glass.w));
    set('--pc-gh', css(L.glass.h));
    set('--pc-bar', css(L.bar));
    set('--pc-u', css(L.u));
    set('--pc-start', css(L.start));
    set('--pc-win-left', `${L.win.left}px`);
    set('--pc-win-top', `${L.win.top}px`);
    set('--pc-win-bottom', `${L.win.bottom}px`);
    if (L.tower && L.cage) {
      set('--pc-tx', css(L.tower.x));
      set('--pc-ty', css(L.cage.y));
      set('--pc-tw', css(CASE_SIZE.w));
      set('--pc-th', css(CASE_SIZE.h + CAGE_SIZE.h));
    }
    tower.hidden = !L.tower;
    room.width = L.w;
    room.height = L.h;
    paper.width = L.paper.w;
    paper.height = L.paper.h;
    for (const g of [roomG, paperG]) if (g) g.imageSmoothingEnabled = false;
    for (const { el, rect } of spots) {
      const r = rect(L);
      el.hidden = !r;
      if (!r) continue;
      el.style.left = `${(r.x / L.w) * 100}%`;
      el.style.top = `${(r.y / L.h) * 100}%`;
      el.style.width = `${(r.w / L.w) * 100}%`;
      el.style.height = `${(r.h / L.h) * 100}%`;
    }
    // Only while it is seen: the desktop is shared, and painting it here measures it for the PC.
    if (visible()) paint();
  }

  /* ---------- running only while it can be seen ---------- */

  let frame = 0;
  let painted = 0;
  const visible = (): boolean =>
    !pc.hidden && pc.isConnected && document.visibilityState !== 'hidden' && document.documentElement.dataset.theme !== 'revealed';
  const tick = (time: number): void => {
    frame = 0;
    if (!visible()) return;
    if (time - painted >= FRAME_MS) {
      painted = time;
      paint();
    }
    frame = requestAnimationFrame(tick);
  };
  const wake = (): void => {
    if (!frame && visible()) frame = requestAnimationFrame(tick);
  };
  /** Paints at once after a click, without waiting for the next of the slow frames. */
  function redraw(): void {
    if (!visible()) return;
    painted = performance.now();
    paint();
  }

  new MutationObserver(wake).observe(pc, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(wake).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('visibilitychange', wake);
  let resizing = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizing);
    resizing = requestAnimationFrame(() => {
      relayout();
      wake();
    });
  });
  // Once the keyboard is up, bring the field being typed in to the middle of what is left.
  document.addEventListener('focusin', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if (pc.dataset.mode !== 'compact') return;
    window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350);
  });
  relayout();
  // The frame is put on the page after this returns.
  requestAnimationFrame(wake);
  return pc;
}

/** The page's width without its scrollbar. */
function viewW(): number {
  return document.documentElement.clientWidth || window.innerWidth;
}
