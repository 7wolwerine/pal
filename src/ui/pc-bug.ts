import { BUG_RESIDENT, BUG_SCENE, pickLine } from '../content/bug.ts';
import { BUG_PX, Beetle } from './beetle.ts';
import { bugVisiting, onBugVisit } from './bug-cameo.ts';
import { prefersReducedMotion, sleep } from './dom.ts';

/** Scenes that bring a BUG of their own. There is only ever one of him on screen. */
const OWN_BUG: ReadonlySet<string> = new Set(['dontclick', 'fidgets', 'flower', 'rescue', 'crash']);
/** From the crash on he is gone for good. */
const AFTER_BUG: ReadonlySet<string> = new Set(['crash', 'reveal']);

/** How long he may stand in front of something the player needs, in ms. */
const IN_THE_WAY_MS = 2600;
/** How long three pokes keep him away, in ms. */
const SHOOED_MS = 9000;

type SpotKind = 'perch' | 'bar' | 'peek' | 'press' | 'block';

interface Spot {
  readonly kind: SpotKind;
  readonly name: string;
  /** Where his top-left corner goes, in viewport pixels. Read again while he stays, in case things move. */
  readonly at: () => readonly [number, number] | undefined;
  readonly face: 'left' | 'right';
}

export interface PcBug {
  /** Tells him which scene is on, so that he knows whether the computer is his to haunt. */
  setScene(id: string): void;
  stop(): void;
}

/**
 * BUG as the resident pest of the computer the window scenes happen on. He
 * flies about with his wing cases open, sits on a corner of the monitor or on
 * the case, lands on the window's title bar, peeks in from the edge of the
 * screen, and plays the fool: tongue out, raspberries, aping the player,
 * pretending to press a button, standing in front of something and wandering
 * off again. Three pokes send him flying for a while. Only his own small body
 * takes clicks, he never stays in front of a control for more than a few
 * seconds, and he keeps off PAL's bubble.
 */
export function attachPcBug(pc: HTMLElement): PcBug {
  const motion = !prefersReducedMotion();
  const beetle = new Beetle();
  beetle.el.classList.add('bug--resident', 'bug--gone');
  beetle.awayMs = SHOOED_MS;
  pc.append(beetle.el);

  let scene = '';
  let dead = false;
  let stopped = false;
  /** On stage (even if shooed off for the moment). */
  let present = false;

  const allowed = (): boolean =>
    !stopped && !dead && scene !== '' && !OWN_BUG.has(scene) && !pc.hidden && pc.isConnected && !bugVisiting() && document.visibilityState !== 'hidden';

  const vanish = (): void => {
    present = false;
    beetle.say('');
    beetle.hide();
    beetle.el.classList.remove('bug--peek', 'bug--unpeek');
  };

  const stopVisits = onBugVisit((visiting) => {
    if (visiting) vanish();
  });

  // ---- where things are ----

  const find = (selector: string): HTMLElement | undefined => {
    const el = pc.querySelector<HTMLElement>(selector);
    if (!el) return undefined;
    const box = el.getBoundingClientRect();
    return box.width > 4 && box.height > 4 ? el : undefined;
  };
  const rectOf = (selector: string): DOMRect | undefined => find(selector)?.getBoundingClientRect();

  /** Viewport pixels into the pixels of whatever he is positioned in. */
  const toLocal = (x: number, y: number): [number, number] => {
    const origin = (beetle.el.offsetParent ?? pc).getBoundingClientRect();
    return [x - origin.left, y - origin.top];
  };

  /** His feet are two of his own pixels above the bottom of his sprite. */
  const FEET = Math.round((BUG_PX / 32) * 2);
  const onTopOf = (box: DOMRect, fx: number): [number, number] => [box.left + (box.width - BUG_PX) * fx, box.top - BUG_PX + FEET + 2];

  /**
   * Where he may be: on the physical computer only, never inside the screen. Along the
   * top edge of the monitor's frame (clear of the sticky note at the right), or on the case.
   */
  function spots(): Spot[] {
    const list: Spot[] = [];
    const perch = (name: string, selector: string, fx: number, face: Spot['face']): void => {
      list.push({
        kind: 'perch',
        name,
        face,
        at: () => {
          const box = rectOf(selector);
          return box && onTopOf(box, fx);
        },
      });
    };
    perch('monitor-left', '.pc__monitor', 0.03, 'right');
    perch('monitor-a', '.pc__monitor', 0.3, 'right');
    perch('monitor-b', '.pc__monitor', 0.55, 'left');
    perch('monitor-c', '.pc__monitor', 0.78, 'left');
    // The case is hidden on narrow screens; then the monitor's edge has to do.
    perch('tower', '.pc__tower', 0.5, 'left');
    return list;
  }

  const overlaps = (a: DOMRect | { left: number; top: number; right: number; bottom: number }, b: DOMRect): boolean =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  /** Whether standing at (x, y) would leave him on screen and off PAL's bubble. */
  function fits(x: number, y: number, _kind: SpotKind): boolean {
    const body = { left: x, top: y, right: x + BUG_PX, bottom: y + BUG_PX };
    // On screen, with room for most of him.
    if (body.top < -BUG_PX * 0.12 || body.bottom > window.innerHeight + 4) return false;
    if (body.left < 2 || body.right > window.innerWidth - 2) return false;
    // PAL's words are never his to cover, body or bubble (the bubble sits above his head).
    const mine = { left: x - 50, top: y - 54, right: x + BUG_PX + 50, bottom: y + BUG_PX };
    for (const selector of ['.pal__bubble', '.pal__who']) {
      const box = rectOf(selector);
      if (box && overlaps(mine, box)) return false;
    }
    // Nor does he stand behind the hearts of the journey bar at the top, with his head and his words cut off.
    const journey = document.querySelector<HTMLElement>('.journey');
    if (journey && !journey.hidden) {
      const box = journey.getBoundingClientRect();
      if (box.width > 4 && overlaps({ left: x, top: y - 30, right: x + BUG_PX, bottom: y + BUG_PX }, box)) return false;
    }
    return true;
  }

  const coversPal = (): boolean => {
    const bubble = rectOf('.pal__bubble');
    if (!bubble) return false;
    const body = beetle.el.getBoundingClientRect();
    if (overlaps(body, bubble)) return true;
    return beetle.talking && overlaps(beetle.bubble.getBoundingClientRect(), bubble);
  };

  // ---- what he does ----

  let lastSpot = '';

  function choose(): { spot: Spot; x: number; y: number } | undefined {
    const options: { spot: Spot; x: number; y: number; weight: number }[] = [];
    for (const spot of spots()) {
      if (spot.name === lastSpot) continue;
      const at = spot.at();
      if (!at || !fits(at[0], at[1], spot.kind)) continue;
      const weight = spot.kind === 'perch' ? 3 : spot.kind === 'bar' ? 2.5 : spot.kind === 'peek' ? 1.2 : 1.4;
      options.push({ spot, x: at[0], y: at[1], weight });
    }
    let roll = Math.random() * options.reduce((sum, o) => sum + o.weight, 0);
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) return option;
    }
    return options[0];
  }

  const ok = (): boolean => present && allowed();

  /** Says a line for as long as it takes to read, unless the stage is taken from him first. */
  const quip = (pool: readonly string[]): void => {
    if (!ok() || beetle.away) return;
    const line = pickLine(pool);
    beetle.say(line);
    window.setTimeout(() => {
      // Only wipe the line if it is still this one.
      if (beetle.line === line) beetle.say('');
    }, 1700 + line.length * 50);
  };

  /** Stays where he is for a while, keeping to his spot if it moves, and bolts if he ends up on PAL's words. */
  async function dwell(spot: Spot, ms: number): Promise<void> {
    const until = performance.now() + ms;
    while (ok() && performance.now() < until) {
      await sleep(200);
      if (!ok()) return;
      if (beetle.away || beetle.busy) continue;
      if (coversPal()) return;
      const at = spot.at();
      if (!at) return;
      const [x, y] = toLocal(at[0], at[1]);
      const [nowX, nowY] = beetle.position;
      if (spot.kind !== 'bar' && Math.hypot(x - nowX, y - nowY) > 3) beetle.jump(x, y);
      else if (spot.kind === 'bar' && Math.abs(y - nowY) > 3) beetle.jump(nowX, y);
    }
  }

  /** In from somewhere above the monitor, wing cases open. */
  async function arrive(x: number, y: number): Promise<void> {
    present = true;
    const [lx, ly] = toLocal(x, y);
    if (motion) {
      const fromLeft = Math.random() < 0.5;
      beetle.jump(lx + (fromLeft ? -220 : 220), ly - 200);
      beetle.hide(false);
      await beetle.flyTo(lx, ly);
    } else {
      beetle.jump(lx, ly);
      beetle.hide(false);
    }
  }

  async function perform(spot: Spot): Promise<void> {
    beetle.face(spot.face);
    switch (spot.kind) {
      case 'perch': {
        beetle.setMood('sit');
        await dwell(spot, 500 + Math.random() * 900);
        if (!ok()) return;
        const sceneLines = BUG_SCENE[scene];
        if (sceneLines && Math.random() < 0.5) {
          const pick = sceneLines[Math.floor(Math.random() * sceneLines.length)];
          if (pick) {
            beetle.setMood(pick.mood);
            quip([pick.line]);
            if (pick.mood === 'angry' && motion) await beetle.stomp(2);
            await dwell(spot, 2400 + pick.line.length * 45);
            if (!ok()) return;
            beetle.setMood('sit');
            await dwell(spot, 1800 + Math.random() * 2400);
            return;
          }
        }
        const turn = Math.floor(Math.random() * 8);
        if (turn === 0) {
          quip(BUG_RESIDENT.idle);
          await beetle.tongue(1100);
        } else if (turn === 1) {
          quip(BUG_RESIDENT.mimic);
          await beetle.mimic(1700);
        } else if (turn === 2) {
          quip(BUG_RESIDENT.brag);
          await beetle.polish(1900);
        } else if (turn === 3) {
          quip(BUG_RESIDENT.brag);
          await beetle.flex(1700);
        } else if (turn === 4) {
          await beetle.yawn(1300);
          if (!ok()) return;
          quip(BUG_RESIDENT.nap);
          await beetle.doze(3200);
        } else if (turn === 5) {
          quip(BUG_RESIDENT.sulk);
          await beetle.turnBack(2200);
        } else if (turn === 6) {
          await beetle.raspberry(1200);
          if (ok()) quip(BUG_RESIDENT.idle);
        } else {
          quip(BUG_RESIDENT.idle);
          await beetle.ignore(1800);
        }
        await dwell(spot, 2600 + Math.random() * 3200);
        return;
      }
      case 'bar': {
        // Up and down the title bar, as if he owned the window.
        beetle.setMood('smug');
        const bar = rectOf('.win__bar');
        if (bar && motion) {
          const [, y] = beetle.position;
          const [left] = toLocal(bar.left, 0);
          const span = Math.max(0, bar.width * 0.62 - BUG_PX);
          await beetle.stroll(left + span * (0.15 + Math.random() * 0.3), y, 48);
          if (!ok()) return;
          await beetle.stroll(left + span * (0.6 + Math.random() * 0.4), y, 48);
          if (!ok()) return;
        }
        if (Math.random() < 0.5) {
          quip(BUG_RESIDENT.idle);
          await beetle.antic();
        } else {
          quip(BUG_RESIDENT.mimic);
          await beetle.mimic(1700);
        }
        await dwell(spot, 2200 + Math.random() * 2400);
        return;
      }
      case 'peek': {
        beetle.setMood('smug');
        await dwell(spot, 700);
        if (!ok()) return;
        if (Math.random() < 0.6) await beetle.tongue(1300);
        else await beetle.raspberry(1200);
        await dwell(spot, 900 + Math.random() * 900);
        return;
      }
      case 'press': {
        beetle.setMood('smug');
        quip(BUG_RESIDENT.press);
        await beetle.press(1700);
        await dwell(spot, Math.max(0, IN_THE_WAY_MS - 1700));
        return;
      }
      case 'block': {
        beetle.setMood('smug');
        quip(BUG_RESIDENT.block);
        if (Math.random() < 0.5) await beetle.turnBack(IN_THE_WAY_MS - 400);
        else await beetle.yawn(1500);
        await dwell(spot, 300);
        return;
      }
    }
  }

  async function goTo(spot: Spot, x: number, y: number): Promise<void> {
    lastSpot = spot.name;
    if (spot.kind === 'peek') {
      // He does not fly there: he is suddenly behind the edge, and leans in.
      beetle.hide();
      await sleep(present ? 240 : 0);
      if (!allowed()) return;
      present = true;
      beetle.jump(...toLocal(x, y));
      beetle.face(spot.face);
      beetle.el.classList.add('bug--peek');
      beetle.hide(false);
      await sleep(motion ? 420 : 0);
      return;
    }
    if (!present) await arrive(x, y);
    else await beetle.flyTo(...toLocal(x, y));
  }

  async function leavePeek(): Promise<void> {
    if (!beetle.el.classList.contains('bug--peek')) return;
    beetle.say('');
    beetle.el.classList.add('bug--unpeek');
    await sleep(motion ? 300 : 0);
    beetle.hide();
    await sleep(240);
    beetle.el.classList.remove('bug--peek', 'bug--unpeek');
    present = false;
  }

  void (async () => {
    while (!stopped) {
      // Wait for a scene that is his to haunt, and let it settle first.
      if (!allowed()) {
        if (present) vanish();
        await sleep(300);
        continue;
      }
      if (!present) {
        const settle = performance.now() + 2200 + Math.random() * 1800;
        while (allowed() && performance.now() < settle) await sleep(200);
        if (!allowed()) continue;
      }
      if (beetle.away) {
        await sleep(250);
        continue;
      }
      const next = choose();
      if (!next) {
        await sleep(800);
        continue;
      }
      await goTo(next.spot, next.x, next.y);
      if (!ok()) continue;
      await perform(next.spot);
      beetle.setMood('stand');
      await leavePeek();
      // Whatever he was in front of, he is off it now, before anything else.
      if (ok() && (next.spot.kind === 'press' || next.spot.kind === 'block')) beetle.say('');
    }
  })();

  return {
    setScene(id) {
      scene = id;
      // Nothing but the reveal follows the crash, so in a real game this never turns back.
      dead = AFTER_BUG.has(id);
      if (!allowed()) vanish();
    },
    stop() {
      stopped = true;
      stopVisits();
      beetle.stop();
      beetle.el.remove();
    },
  };
}
