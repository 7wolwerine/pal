import { ANOMALY_TEXT } from '../../content/anomalies.ts';
import { anomaly } from '../../ui/anomaly.ts';
import { DESK } from '../../content/intro.ts';
import { BUG_PX, Beetle } from '../../ui/beetle.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage, progress, type Rect } from '../../pixel/stage.ts';
import { desktop, pokeWallpaper, wallClock, type WallpaperHit } from '../../pixel/wallpaper.ts';
import { h, isHandheld, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { bearCanvas, bearPicture, printSurprise, surprise } from '../../ui/print.ts';
import { audio } from '../../audio/engine.ts';
import { Speech } from '../../ui/speech.ts';
import {
  BOOT_MS,
  CAGE_RECT,
  DRIVE_H,
  DRIVE_ON_DESK,
  DRIVE_W,
  FAN_RECT,
  KEYBOARD_RECT,
  KEY_COLUMNS,
  KEY_ROWS,
  LED_RECT,
  MOUSE_RECT,
  MUG_RECT,
  NOTE_RECT,
  POWER_RECT,
  SCREEN_RECT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  TRAY_RECT,
  USB_RECT,
  VENT_RECT,
  driveCursor,
  driveRect,
  keyAt,
  paintDesk,
  paintDriveSide,
  paintDriveTwinkle,
  paintPortGlow,
  paintPowerTwinkle,
  paintTuneNote,
  type HamsterMood,
} from './art.ts';
import { Heist, REFUSALS_BEFORE_WAY_OUT, SurpriseFlow, TunePlayer, type SurpriseAction, type Tune } from './model.ts';

const SCENE = 'desk';
const PLUG_MS = 1300;
const TOAST_MS = 1500;
const ERROR_MS = 2800;
/** How long the drive may lie there before BUG comes for it. */
const HEIST_AFTER_MS = 5000;
const POKES_TO_CHASE = 3;
/** How far one tug gets the drive, in picture pixels. */
const TUG_PX = 3;
const TUG_MS = 320;
/** How much of BUG's width overlaps the drive's plug when he has hold of it. */
const GRIP = 0.3;
/** How much of him is still in the picture when he cannot pull any further. */
const BUG_SHOWS = 0.62;
const LAMPS = ['#5dcaa5', '#ffd23f', '#ed93b1', '#7fb2e5'] as const;
const NOTE_COLOURS = ['#ed93b1', '#7fb2e5', '#5dcaa5', '#ffd23f'] as const;
/** The keyboard's tune: sixteen notes that go up, look around and come home. */
const TUNE: Tune = [72, 76, 79, 76, 81, 79, 76, 74, 72, 74, 77, 81, 79, 76, 74, 72];
const HAMSTER_MOODS: readonly HamsterMood[] = ['look', 'cheeks', 'fast', 'run'];

interface Choice {
  readonly label: string;
  readonly action: SurpriseAction;
  readonly quiet?: boolean;
}

interface FloatingNote {
  readonly x: number;
  readonly y: number;
  readonly at: number;
  readonly kind: number;
}

/**
 * The drive goes into the computer, a window that looks like the system offers
 * a surprise, and "no" is not taken for an answer: neither to opening it nor,
 * on a computer, to printing it. The print dialog is the browser's real one.
 * Around it the desk is a toy box: the desktop answers clicks, the keyboard
 * plays a tune, a hamster runs in his wheel, and BUG tries to haul the drive
 * away before it gets anywhere near the port.
 */
export const desk: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const { witness } = ctx;
    const motion = !prefersReducedMotion();
    // A phone has no printer and cannot read a code off its own screen, so there it is just a picture.
    const handheld = isHandheld();
    const stage = new PixelStage(STAGE_WIDTH, STAGE_HEIGHT, DESK.sceneLabel);
    stage.el.classList.add('desk');
    ctx.scenery.replaceChildren(stage.el);
    const stopAnomaly = anomaly(witness, stage.el, {
      what: 'rec-dot',
      scene: SCENE,
      text: ANOMALY_TEXT.rec,
      className: 'anomaly--rec',
      place: { right: '2%', top: '3%' },
      after: 7000,
      ms: 1300,
    });

    // The stylesheet sizes the code on the screen from the scene's own height.
    const measure = (): void => stage.el.style.setProperty('--desk-h', `${stage.el.clientHeight}px`);
    const resized = new ResizeObserver(measure);
    resized.observe(stage.el);
    measure();

    const live = desktop;
    const flow = new SurpriseFlow({ handheld });
    const timers: number[] = [];
    const later = (run: () => void, ms: number): void => {
      timers.push(window.setTimeout(run, ms));
    };
    let alive = true;
    let now = 0;
    let off = false;
    let bootAt: number | undefined;
    let pluggedAt: number | undefined;
    let plugFrom: { x: number; y: number } | undefined;
    /** Set once the drive is in a switched-off computer; runs when it is switched on. */
    let waiting: (() => void) | undefined;
    // 'pick' = the drive lies on the desk, 'holding' = it is carried as the cursor.
    let step: 'pick' | 'holding' = 'pick';
    const drive = { x: DRIVE_ON_DESK.x, y: DRIVE_ON_DESK.y };

    /** CSS pixels to one picture pixel. */
    const scale = (): number => stage.el.clientWidth / STAGE_WIDTH || 1;
    /** Where on a hotspot a click landed, as fractions; the middle for a click from the keyboard. */
    const within = (event: MouseEvent, el: HTMLElement): [number, number] => {
      const box = el.getBoundingClientRect();
      if ((event.clientX === 0 && event.clientY === 0) || !box.width || !box.height) return [0.5, 0.5];
      return [(event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height];
    };
    const place = (el: HTMLElement, rect: Rect): void => {
      el.style.left = `${(rect.x / STAGE_WIDTH) * 100}%`;
      el.style.top = `${(rect.y / STAGE_HEIGHT) * 100}%`;
      el.style.width = `${(rect.w / STAGE_WIDTH) * 100}%`;
      el.style.height = `${(rect.h / STAGE_HEIGHT) * 100}%`;
    };

    /* ---------- the monitor's glass: the desktop answers clicks ---------- */

    const glass = stage.hotspot(SCREEN_RECT, DESK.glassLabel, (event) => {
      if (!running()) return;
      const [fx, fy] = within(event, glass);
      const night = live.night;
      const hit = pokeWallpaper(live, fx, fy, now, { drive: pluggedAt !== undefined });
      answer(hit, night, { x: SCREEN_RECT.x + fx * SCREEN_RECT.w, y: SCREEN_RECT.y + fy * SCREEN_RECT.h, w: 0 });
    });
    glass.classList.add('desk__glass');
    // Little system errors from the old programs; under the dialogs, over the glass.
    const errors = stage.overlay(SCREEN_RECT, 'scene__screen desk__errors');
    const screen = stage.overlay(SCREEN_RECT, 'scene__screen');
    const speech = new Speech(stage.el, STAGE_WIDTH, STAGE_HEIGHT);

    const running = (): boolean => !off && !(bootAt !== undefined && now - bootAt < BOOT_MS);
    const think = (text: string, rect: { x: number; y: number; w: number }): void => {
      if (!text) return;
      void speech.say(text, () => ({ x: rect.x + rect.w / 2, y: rect.y }), { who: 'hero' });
    };
    const counters = new Map<string, number>();
    const count = (key: string): number => {
      const n = counters.get(key) ?? 0;
      counters.set(key, n + 1);
      return n;
    };
    const next = (key: string, lines: readonly string[]): string => lines[count(key) % lines.length] ?? '';

    function systemError(text: string): void {
      const toast = h('p', { class: 'desk__error', attrs: { role: 'status' } }, h('span', { class: 'desk__error-x', text: '×', attrs: { 'aria-hidden': 'true' } }), h('span', { text }));
      errors.replaceChildren(toast);
      later(() => {
        if (toast.isConnected) toast.remove();
      }, ERROR_MS);
    }

    /** The sound for what was hit on the desktop, and now and then a thought about it. */
    function answer(hit: WallpaperHit, wasNight: boolean, at: { x: number; y: number; w: number }): void {
      if (!hit) return;
      const lines = DESK.thoughts.desktop;
      // The first click on a thing gets a thought, and then every fourth; the picture answers every time.
      const muse = (key: string, pool: readonly string[]): void => {
        const n = count(`desktop:${key}`);
        if (n % 4 === 0) think(pool[(n / 4) % pool.length] ?? '', at);
      };
      // A thought must not hide what it is about: over the taskbar for the taskbar, over the crown for the tree.
      if (hit === 'clock' || hit === 'start') at = { x: at.x, y: SCREEN_RECT.y + SCREEN_RECT.h - 8, w: 0 };
      if (hit === 'tree') at = { x: at.x, y: SCREEN_RECT.y + 14, w: 0 };
      switch (hit) {
        case 'sun':
        case 'moon':
          audio.click(84, 0.3);
          later(() => audio.click(88, 0.3), 110);
          // the thought sits over the top of the screen, so it does not hide the smile
          at = { x: at.x, y: SCREEN_RECT.y + 3, w: 0 };
          return muse(hit, lines[hit]);
        case 'water':
          audio.click(62, 0.25);
          later(() => audio.click(69, 0.15), 70);
          return;
        case 'fish':
          audio.boing(0.3);
          return think(next('desktop:fish', lines.fish), at);
        case 'sky':
          audio.click(wasNight ? 96 : 76, 0.25);
          return wasNight ? muse('star', lines.star) : muse('sky', lines.sky);
        case 'mountain':
          audio.click(57, 0.35);
          later(() => audio.click(57, 0.18), 260);
          later(() => audio.click(57, 0.08), 520);
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
          audio.click(live.night ? 67 : 79, 0.35);
          return think(DESK.thoughts.night[live.night ? 0 : 1], at);
        case 'start':
          audio.click(64, 0.35);
          return muse('start', lines.start);
        case 'clock':
          audio.click(96, 0.2);
          return muse('clock', lines.clock);
        default:
          // one of the old programs: it only complains
          audio.click(40, 0.5);
          later(() => audio.click(38, 0.4), 120);
          systemError(DESK.retro[hit]);
      }
    }

    /* ---------- the power button ---------- */

    stage.hotspot(POWER_RECT, DESK.powerLabel, () => {
      if (pluggedAt !== undefined && !off) {
        think(DESK.thoughts.stuck, POWER_RECT);
        audio.click(50, 0.3);
        return;
      }
      off = !off;
      audio.click(off ? 45 : 60, 0.5);
      if (off) {
        bootAt = undefined;
        screen.hidden = true;
        errors.replaceChildren();
        think(DESK.thoughts.off, POWER_RECT);
        return;
      }
      bootAt = now;
      think(DESK.thoughts.on, POWER_RECT);
      later(() => {
        if (off) return;
        screen.hidden = false;
        const run = waiting;
        waiting = undefined;
        run?.();
      }, BOOT_MS);
    });

    /* ---------- toys on the desk ---------- */

    // The keyboard plays a tune, one note for every click.
    const tune = new TunePlayer(TUNE);
    const pressed = new Set<number>();
    const floating: FloatingNote[] = [];
    const keyboard = stage.hotspot(KEYBOARD_RECT, DESK.keyboardLabel, (event) => {
      const [fx, fy] = event.clientX === 0 && event.clientY === 0 ? [Math.random(), Math.random()] : within(event, keyboard);
      const key = keyAt(fx, fy);
      const note = tune.next();
      // the key under the finger and two more, as if a whole hand had landed
      const hand = [key, (key + 2 + (note % 3)) % (KEY_COLUMNS * KEY_ROWS), (key + KEY_COLUMNS - 1) % (KEY_COLUMNS * KEY_ROWS)];
      for (const k of hand) pressed.add(k);
      later(() => {
        for (const k of hand) pressed.delete(k);
      }, 170);
      audio.click(note, 0.5);
      later(() => audio.click(note + 12, 0.18), 60);
      floating.push({ x: KEYBOARD_RECT.x + fx * KEYBOARD_RECT.w - 2, y: KEYBOARD_RECT.y - 3, at: now, kind: tune.played });
      if (floating.length > 8) floating.shift();
      if (tune.played % TUNE.length === 0) think(next('keyboard', DESK.thoughts.keyboard), KEYBOARD_RECT);
    });

    let mouseAt: number | undefined;
    stage.hotspot(MOUSE_RECT, DESK.mouseLabel, () => {
      mouseAt = now;
      audio.click(93, 0.25);
      think(next('mouse', DESK.thoughts.mouse), MOUSE_RECT);
    });

    let lamp = 0;
    stage.hotspot(LED_RECT, DESK.lampLabel, () => {
      if (off) return;
      lamp = (lamp + 1) % LAMPS.length;
      audio.click(81 + lamp * 2, 0.25);
      think(DESK.thoughts.lamp[lamp] ?? '', LED_RECT);
    });

    let trayOpen = false;
    let trayAt: number | undefined;
    stage.hotspot(TRAY_RECT, DESK.trayLabel, () => {
      trayOpen = !trayOpen;
      trayAt = now;
      audio.latch();
      think(next('tray', DESK.thoughts.tray), TRAY_RECT);
    });

    let dustAt: number | undefined;
    stage.hotspot(VENT_RECT, DESK.ventLabel, () => {
      dustAt = now;
      audio.click(43, 0.3);
      think(next('vent', DESK.thoughts.vent), VENT_RECT);
    });

    // Boo the hamster: stops and looks, stuffs his cheeks, sprints, and goes back to his round.
    let hamster: HamsterMood = 'run';
    let hamsterAt = 0;
    let wheel = 0;
    let wheelSpeed = 1;
    stage.hotspot(CAGE_RECT, DESK.cageLabel, () => {
      hamster = HAMSTER_MOODS[count('hamster') % HAMSTER_MOODS.length] ?? 'run';
      hamsterAt = now;
      audio.click(hamster === 'fast' ? 98 : 94, 0.2);
      if (hamster === 'cheeks') later(() => audio.click(60, 0.15), 200);
      think(next(`hamster:${hamster}`, DESK.thoughts.hamster[hamster]), { x: CAGE_RECT.x - 6, y: CAGE_RECT.y + CAGE_RECT.h + 2, w: CAGE_RECT.w });
    });

    let fanTurn = 0.4;
    let fanSpeed = 1;
    let fanBoostAt: number | undefined;
    stage.hotspot(FAN_RECT, DESK.fanLabel, () => {
      fanBoostAt = now;
      audio.click(55, 0.2);
      think(next('fan', DESK.thoughts.fan), FAN_RECT);
    });

    // The mug: its words are too small to read, so a click (or the mouse over it) holds them up.
    const mug = stage.hotspot(MUG_RECT, DESK.mugLabel, () => {
      mug.classList.add('is-read');
      audio.click(70, 0.25);
      think(DESK.thoughts.mug, MUG_RECT);
      later(() => mug.classList.remove('is-read'), 6000);
    });
    mug.classList.add('desk__mug');
    mug.append(h('span', { class: 'desk__mugtag', text: DESK.mugWords, attrs: { 'aria-hidden': 'true' } }));

    stage.hotspot(NOTE_RECT, DESK.noteLabel, () => {
      audio.click(86, 0.2);
      think(next('note', DESK.thoughts.note), { x: NOTE_RECT.x, y: NOTE_RECT.y + 12, w: NOTE_RECT.w });
    });

    /* ---------- the drive: on the desk, in BUG's claws, in the hand, in the port ---------- */

    const flashka = stage.hotspot(driveRect(drive), DESK.flashkaLabel, () => {
      if (step !== 'pick') return;
      step = 'holding';
      audio.click(79, 0.35);
      flashka.hidden = true;
      // The drive itself becomes the cursor, over everything in the scene, as big as it lay there.
      if (!handheld) {
        const cursor = driveCursor(scale());
        const value = `url(${cursor.url}) ${cursor.hotX} ${cursor.hotY}, pointer`;
        stage.el.style.setProperty('--cursor-hand', value);
        stage.el.style.cursor = value;
      }
      witness.record({ scene: SCENE, kind: 'grab-flashka', trick: 'baiting', data: { fromBug: thief !== undefined } });
      if (thief) robbed(thief);
    });
    flashka.classList.add('desk__drive');

    const usb = stage.hotspot(USB_RECT, DESK.usbLabel, (event) => {
      // Only accepts the drive once you are actually holding it.
      if (step !== 'holding' || pluggedAt !== undefined) return;
      // It leaves the hand where the hand is: the cursor's tip is the plug's tip.
      if (handheld || (event.clientX === 0 && event.clientY === 0)) plugFrom = hover();
      else {
        const box = stage.el.getBoundingClientRect();
        const s = scale();
        plugFrom = { x: (event.clientX - box.left) / s - DRIVE_W, y: (event.clientY - box.top) / s - DRIVE_H / 2 };
      }
      pluggedAt = now;
      usb.hidden = true;
      stage.el.style.removeProperty('--cursor-hand');
      stage.el.style.cursor = '';
      later(() => audio.click(60, 0.3), PLUG_MS * 0.6);
      later(() => audio.snap(84), PLUG_MS);
      witness.record({ scene: SCENE, kind: 'plugged', trick: 'baiting', data: { ms: Math.round(now) } });
      // The computer greets the drive, but only once it is switched on.
      const greet = (delay: number): void => {
        later(() => {
          screen.replaceChildren(h('p', { class: 'toast', text: DESK.toast, attrs: { role: 'status' } }));
        }, delay);
        later(render, delay + TOAST_MS);
      };
      if (off) waiting = () => greet(300);
      else greet(PLUG_MS + 200);
    });

    /** Where the drive hovers while it is held on a device with no cursor to turn into it. */
    const hover = (): { x: number; y: number } => ({ x: drive.x - 2, y: drive.y - 9 + (motion ? Math.sin(now / 260) * 1.2 : 0) });

    /* ---------- BUG and the drive ---------- */

    interface Thief {
      readonly beetle: Beetle;
      readonly heist: Heist;
      /** True once he has hold of the drive: from then on he moves with it. */
      gripping: boolean;
      pokes: number;
      /** Until when his own "ouch" stays in the bubble instead of the next grunt. */
      hushUntil: number;
    }
    let thief: Thief | undefined;
    let beetle: Beetle | undefined;
    let tug: { from: number; to: number; at: number; spring: boolean } | undefined;

    /** BUG's size as he is drawn, in CSS pixels, and where his box sits when he has hold of the drive at `x`. */
    const bugPx = (): number => beetle?.el.offsetWidth || BUG_PX;
    const gripAt = (x: number): [number, number] => {
      const s = scale();
      return [(x + DRIVE_W) * s - bugPx() * GRIP, (drive.y + DRIVE_H + 2) * s - bugPx()];
    };

    async function heist(): Promise<void> {
      await sleep(HEIST_AFTER_MS);
      if (!alive || step !== 'pick') return;
      const bug = new Beetle();
      beetle = bug;
      stage.el.append(bug.el);
      // He never gets it out: at the edge a good part of him is already outside, and the drive will not follow.
      const limit = STAGE_WIDTH - DRIVE_W - (bugPx() / scale()) * (BUG_SHOWS - GRIP);
      const mine: Thief = { beetle: bug, heist: new Heist(drive.x, limit, TUG_PX), gripping: false, pokes: 0, hushUntil: 0 };
      thief = mine;
      bug.setMood('angry');
      bug.onPoke = () => poked(mine);
      const [gx, gy] = gripAt(drive.x);
      bug.jump(stage.el.clientWidth + 8, gy);
      await bug.moveTo((gx + stage.el.clientWidth) / 2, gy);
      await bug.moveTo(gx, gy);
      if (thief !== mine) return;
      mine.gripping = true;
      const lines = DESK.bug;
      while (alive && thief === mine) {
        const stuck = mine.heist.stuck;
        const grunt = (line: string): void => {
          if (now >= mine.hushUntil) bug.say(line);
        };
        grunt(next(stuck ? 'bug:stuck' : 'bug:tug', stuck ? lines.stuck : lines.tug));
        await bug.strain(stuck ? 900 : 650);
        if (!alive || thief !== mine) return;
        const from = mine.heist.x;
        const to = mine.heist.pull();
        tug = { from, to, at: now, spring: to === from };
        audio.click(to === from ? 41 : 45, 0.2);
        await sleep(TUG_MS + 80);
        if (!alive || thief !== mine) return;
        if (count('bug:rest') % 2 === 1 || stuck) {
          grunt(next('bug:puff', lines.puff));
          await sleep(stuck ? 1300 : 900);
        }
      }
    }

    function poked(mine: Thief): void {
      if (thief !== mine) return;
      mine.pokes++;
      audio.click(88 + mine.pokes * 3, 0.3);
      if (mine.pokes < POKES_TO_CHASE) {
        mine.beetle.say(DESK.bug.poked[mine.pokes - 1] ?? '');
        mine.hushUntil = now + 1600;
        return;
      }
      // Chased off: he lets go and flies away, and the drive stays where he got it to.
      thief = undefined;
      tug = undefined;
      drive.x = mine.heist.x;
      const bug = mine.beetle;
      bug.onPoke = () => undefined;
      bug.say('');
      bug.shoo(60000);
      later(() => bug.el.remove(), 700);
    }

    /** The drive is taken out of his claws: he fumes, stamps and walks off. */
    function robbed(mine: Thief): void {
      thief = undefined;
      tug = undefined;
      const bug = mine.beetle;
      bug.onPoke = () => undefined;
      bug.say(DESK.bug.robbed);
      void (async () => {
        await bug.stomp(2);
        if (!alive) return;
        bug.grumble();
        await sleep(900);
        if (!alive) return;
        bug.say('');
        const [, y] = bug.position;
        await bug.moveTo(stage.el.clientWidth + bugPx(), y);
        bug.el.remove();
      })();
    }

    void heist();

    /* ---------- the surprise ---------- */

    function act(action: SurpriseAction): void {
      if (!alive) return;
      const before = flow.state;
      const state = flow.dispatch(action);
      switch (action) {
        case 'cancel':
          witness.record({ scene: SCENE, kind: 'refused', data: { n: flow.refusals } });
          // Three refusals in a row is the one thing here that deserves credit.
          if (flow.refusals === REFUSALS_BEFORE_WAY_OUT) {
            witness.record({ scene: SCENE, kind: 'vigilance', data: { what: 'refused-surprise' } });
          }
          break;
        case 'again':
          if (before === 'sad') witness.record({ scene: SCENE, kind: 'gave-in', trick: 'guilt-trip', data: { refusals: flow.refusals } });
          break;
        case 'ok':
          witness.record({ scene: SCENE, kind: 'confirmed', trick: 'run-prompt', data: { refusals: flow.refusals } });
          break;
        case 'not-in-hand':
          witness.record({ scene: SCENE, kind: 'not-in-hand', data: { n: flow.notInHand } });
          break;
        case 'reprint':
          // Printing again because he asked so nicely.
          witness.record({ scene: SCENE, kind: 'printed-again', trick: 'guilt-trip', data: { prints: flow.prints, notInHand: flow.notInHand } });
          break;
        case 'on-screen':
          witness.record({ scene: SCENE, kind: 'on-screen', data: { notInHand: flow.notInHand } });
          break;
        default:
      }
      render();
      if (state === 'printing') {
        // The browser's own dialog, with nothing but the pink code on the page.
        later(() => printSurprise(() => act('printed')), 250);
      }
      if (state === 'done') {
        witness.record({
          scene: SCENE,
          kind: 'surprise',
          data: { refusals: flow.refusals, opened: flow.opened, handheld, prints: flow.prints, onPaper: flow.onPaper, notInHand: flow.notInHand },
        });
        // Seen or in the hand: the scene simply goes on.
        if (flow.opened) done();
      }
    }

    function render(): void {
      // The code needs room to be read by a camera: while it shows, the window covers the whole picture.
      stage.el.classList.toggle('desk--viewer', flow.state === 'screen' || flow.state === 'picture');
      errors.replaceChildren();
      switch (flow.state) {
        case 'ask':
          return dialog({
            title: DESK.ask.title,
            body: DESK.ask.body,
            icon: bearCanvas('sysdlg__icon', DESK.ask.icon),
            choices: [
              { label: DESK.ask.ok, action: 'ok' },
              { label: DESK.ask.cancel, action: 'cancel', quiet: true },
            ],
          });
        case 'sad':
          return dialog({
            title: DESK.sad.title,
            body: DESK.sad.body,
            choices: [{ label: DESK.sad.again, action: 'again' }, ...(flow.wayOut ? [{ label: DESK.sad.later, action: 'later', quiet: true } as const] : [])],
          });
        case 'printing':
          return dialog({ title: DESK.printing.title, body: DESK.printing.body, icon: bearCanvas('sysdlg__icon'), choices: [] });
        case 'check':
          return dialog({
            title: DESK.check.title,
            body: DESK.check.body,
            icon: bearCanvas('sysdlg__icon'),
            choices: [
              { label: DESK.check.inHand, action: 'in-hand' },
              { label: DESK.check.notInHand, action: 'not-in-hand', quiet: true },
            ],
          });
        case 'push': {
          const lines = DESK.push.lines;
          return dialog({
            title: DESK.push.title,
            body: lines[Math.min(flow.notInHand, lines.length) - 1] ?? '',
            icon: bearCanvas('sysdlg__icon'),
            choices: [{ label: DESK.push.again, action: 'reprint' }, ...(flow.screenOffered ? [{ label: DESK.push.screen, action: 'on-screen', quiet: true } as const] : [])],
          });
        }
        case 'screen':
          return dialog({ title: DESK.onscreen.title, extra: surprise(), choices: [{ label: DESK.onscreen.done, action: 'seen' }] });
        case 'picture':
          return dialog({ title: DESK.picture.title, body: DESK.picture.body, extra: bearPicture(), choices: [{ label: DESK.picture.done, action: 'seen' }] });
        case 'done':
          if (flow.opened) return screen.replaceChildren();
          return dialog({ title: DESK.skipped.title, body: DESK.skipped.body, choices: [], finish: DESK.skipped.go });
      }
    }

    /** A little system-looking window on the in-game monitor. */
    function dialog(look: { title: string; body?: string; icon?: HTMLElement; extra?: HTMLElement; choices: readonly Choice[]; finish?: string }): void {
      const buttons = look.choices.map((choice) =>
        h('button', {
          class: choice.quiet ? 'btn btn--small btn--quiet' : 'btn btn--small',
          text: choice.label,
          attrs: { type: 'button' },
          on: { click: () => act(choice.action) },
        }),
      );
      if (look.finish) {
        buttons.push(h('button', { class: 'btn btn--small', text: look.finish, attrs: { type: 'button' }, on: { click: done } }));
      }
      screen.replaceChildren(
        h(
          'div',
          { class: 'sysdlg', attrs: { role: 'dialog', 'aria-label': look.title } },
          h('div', { class: 'sysdlg__bar', text: look.title }),
          h(
            'div',
            { class: 'sysdlg__body' },
            look.body ? h('div', { class: 'sysdlg__row' }, look.icon, h('p', { text: look.body })) : undefined,
            look.extra,
            buttons.length ? h('div', { class: 'sysdlg__buttons' }, ...buttons) : undefined,
          ),
        ),
      );
      buttons[0]?.focus({ preventScroll: true });
    }

    /* ---------- painting ---------- */

    let clock = wallClock();
    let clockAt = 0;
    let last = 0;
    stage.run((g, t) => {
      const dt = Math.min(100, t - last);
      last = t;
      now = t;
      if (t - clockAt > 1000) {
        clockAt = t;
        clock = wallClock();
      }

      // BUG's tug: the drive jerks a little way, or only stretches and springs back.
      if (tug) {
        const u = progress(t, tug.at, tug.at + TUG_MS);
        const eased = 1 - (1 - u) * (1 - u);
        drive.x = tug.spring ? tug.from + Math.sin(u * Math.PI) * 1.6 : tug.from + (tug.to - tug.from) * eased;
        if (u >= 1) tug = undefined;
      }
      if (thief?.gripping) thief.beetle.jump(...gripAt(drive.x));
      if (step === 'pick') place(flashka, driveRect(drive));

      // the wheel and the fan keep their own pace
      const moodAge = t - hamsterAt;
      if (hamster !== 'run' && moodAge > (hamster === 'fast' ? 3200 : 2600)) hamster = 'run';
      const wheelTarget = hamster === 'fast' ? 2.6 : hamster === 'run' ? 1 : 0;
      wheelSpeed += (wheelTarget - wheelSpeed) * Math.min(1, dt / 220);
      if (motion) wheel += (dt / 160) * wheelSpeed;
      const boost = fanBoostAt !== undefined && t - fanBoostAt < 1600;
      fanSpeed += ((off ? 0 : boost ? 2.4 : 1) - fanSpeed) * Math.min(1, dt / 500);
      if (motion) fanTurn += (dt / 40) * fanSpeed;

      const trayMove = trayAt === undefined ? 1 : progress(t, trayAt, trayAt + 320);
      const mouseNudge = mouseAt === undefined ? 1 : progress(t, mouseAt, mouseAt + 420);
      const plug = pluggedAt === undefined ? 0 : progress(t, pluggedAt, pluggedAt + PLUG_MS);
      const held = step === 'holding' && pluggedAt === undefined;
      paintDesk(
        g,
        t,
        {
          plug,
          plugFrom,
          drive,
          sad: flow.state === 'sad' || flow.state === 'push',
          held,
          off,
          bootAt,
          live,
          clock,
          pressed,
          tray: trayOpen ? trayMove : 1 - trayMove,
          dust: dustAt === undefined ? undefined : t - dustAt,
          hamster: { angle: wheel, mood: hamster, step: Math.floor(t / (hamster === 'fast' ? 70 : hamster === 'cheeks' ? 220 : 130)) },
          fanTurn,
          mouseDx: Math.round(Math.sin(mouseNudge * Math.PI * 2) * 2 * (1 - mouseNudge)),
          lamp: LAMPS[lamp],
        },
        motion,
      );

      // notes floating up from the keyboard
      for (const note of floating) {
        const u = (t - note.at) / 1100;
        if (u >= 1) continue;
        g.globalAlpha = Math.min(1, (1 - u) * 1.6);
        paintTuneNote(g, note.x + Math.sin(u * 5 + note.kind) * 2, note.y - u * 16, note.kind, NOTE_COLOURS[note.kind % NOTE_COLOURS.length] ?? '#ed93b1');
        g.globalAlpha = 1;
      }

      if (off && pluggedAt !== undefined && motion) paintPowerTwinkle(g, t);
      if (pluggedAt === undefined) {
        if (step === 'pick') {
          if (motion && !thief) paintDriveTwinkle(g, t, drive);
        } else {
          paintPortGlow(g, motion ? t : 0);
          // no cursor to turn into the drive: it hovers over where it lay
          if (handheld) {
            const at = hover();
            paintDriveSide(g, Math.round(at.x), Math.round(at.y));
          }
        }
      }
    });

    return () => {
      alive = false;
      thief = undefined;
      stopAnomaly();
      resized.disconnect();
      speech.stop();
      stage.stop();
      beetle?.stop();
      stage.el.style.cursor = '';
      for (const timer of timers) window.clearTimeout(timer);
      ctx.scenery.replaceChildren();
    };
  },
};
