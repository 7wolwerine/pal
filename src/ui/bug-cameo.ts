import { BUG_WARNINGS, pickLine, type WarningScene } from '../content/bug.ts';
import type { GameContext } from '../game.ts';
import { ANTICS, BUG_PX, Beetle } from './beetle.ts';
import type { BugFrame } from './bug-sprite.ts';
import { prefersReducedMotion, sleep } from './dom.ts';

/** BUG strolls into the scene and gets in the way (and the witness notes that he did). */
export function bugWarns(ctx: GameContext, host: HTMLElement, where: WarningScene, opts: CameoOptions = {}): Promise<void> {
  const line = pickLine(BUG_WARNINGS[where]);
  ctx.witness.record({ scene: where, kind: 'bug-warning', data: { line } });
  // On the computer he never walks into PAL's window: he walks along the top of the monitor's frame.
  const pc = host.classList.contains('win') ? host.closest<HTMLElement>('.pc') : null;
  const monitor = pc?.querySelector<HTMLElement>('.pc__monitor');
  if (pc && monitor) {
    const track = (): Track => {
      const p = pc.getBoundingClientRect();
      const m = monitor.getBoundingClientRect();
      const y = m.top - p.top - BUG_PX + Math.round((BUG_PX / 32) * 2) + 2;
      let from = m.left;
      let to = m.right;
      // Keep clear of the path of hearts at the top of the page: walk only the part of the edge beside it.
      const hearts = document.querySelector<HTMLElement>('.journey');
      const j = hearts && !hearts.hidden ? hearts.getBoundingClientRect() : undefined;
      if (j && j.width > 4 && j.bottom > p.top + y - 30) {
        if (to - (j.right + 8) >= BUG_PX * 2.5) from = Math.max(from, j.right + 8);
        else to = Math.min(to, j.left - 8);
      }
      return { left: from - p.left, width: Math.max(BUG_PX, to - from), y };
    };
    return bugCameo(pc, line, { ...opts, track });
  }
  return bugCameo(host, line, opts);
}

/** A line he walks along instead of the host's bottom edge, in the host's own pixels. */
export interface Track {
  readonly left: number;
  readonly width: number;
  /** Where his top edge is while he walks. */
  readonly y: number;
}

export interface CameoOptions {
  /** The side he walks in from. He leaves by the other one. */
  readonly side?: 'left' | 'right';
  /** The face he pulls while he talks. */
  readonly mood?: BugFrame;
  /** How long he stands there talking, in ms. */
  readonly ms?: number;
  /** Walk along this line instead of the host's bottom edge. */
  readonly track?: () => Track;
}

type VisitListener = (visiting: boolean) => void;
const listeners = new Set<VisitListener>();
let visits = 0;

/** True while BUG is paying some scene a visit. There is only ever one of him. */
export function bugVisiting(): boolean {
  return visits > 0;
}

/** Tells whoever else shows BUG that a visit starts or ends, so that he is never in two places. */
export function onBugVisit(listener: VisitListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function announce(delta: 1 | -1): void {
  const was = visits > 0;
  visits = Math.max(0, visits + delta);
  const is = visits > 0;
  if (was !== is) for (const listener of listeners) listener(is);
}

/**
 * A small performance. BUG walks in from one side of `host`, strolls along
 * its bottom edge, stops where he is in the way, does one of his turns, says
 * his line, and after a while walks off by the other side. Poking him only
 * offends him; the third poke sends him flying. `host` must be positioned.
 * Resolves once he has gone.
 */
async function bugCameo(host: HTMLElement, line: string, opts: CameoOptions = {}): Promise<void> {
  const motion = !prefersReducedMotion();
  const fromLeft = (opts.side ?? 'right') === 'left';
  const beetle = new Beetle();
  beetle.el.classList.add('bug--visit');
  beetle.leaveWhenShooed = true;

  const base = (): number => opts.track?.().left ?? 0;
  const width = (): number => opts.track?.().width ?? (host.clientWidth || 320);
  const floor = (): number => opts.track?.().y ?? (host.clientHeight || 240) - BUG_PX - 4;
  // Along the monitor he comes and goes at its corners; in a scene, from beyond its sides.
  const off = (left: boolean): number => (opts.track ? base() + (left ? 0 : width() - BUG_PX) : left ? -BUG_PX - 10 : width() + 10);
  /** Still on stage: not flown off, and the scene he walked into is still there. */
  const here = (): boolean => !beetle.left && beetle.el.isConnected;
  /** Waits, but not a moment longer than he is on stage. */
  const hold = async (ms: number): Promise<void> => {
    const until = performance.now() + ms;
    while (here() && performance.now() < until) await sleep(Math.min(100, Math.max(10, until - performance.now())));
  };

  announce(1);
  try {
    // Whoever else was showing him gets a moment to clear the stage.
    await sleep(240);
    if (!host.isConnected) return;
    // He stops a little past the middle, seen from where he came in: right where things are.
    const reach = 0.4 + Math.random() * 0.22;
    const stopAt = (): number => {
      const span = Math.max(0, width() - BUG_PX);
      return base() + span * (fromLeft ? reach : 1 - reach);
    };
    host.append(beetle.el);
    if (motion) {
      beetle.jump(off(fromLeft), floor());
      await beetle.stroll(stopAt(), floor(), 64);
    } else {
      beetle.hide();
      beetle.jump(stopAt(), floor());
      void beetle.el.offsetWidth;
      beetle.hide(false);
    }
    await hold(250);

    // One of his turns, to whoever is watching.
    if (here()) {
      beetle.face(fromLeft ? 'right' : 'left');
      const antic = ANTICS[Math.floor(Math.random() * ANTICS.length)] ?? 'tongue';
      if (opts.mood === 'angry' && Math.random() < 0.35) await beetle.stomp(2);
      else await beetle.antic(antic);
    }

    // His line, with the face that goes with it.
    if (here()) {
      beetle.setMood(opts.mood && opts.mood !== 'panic' ? opts.mood : 'smug');
      beetle.say(line);
      await hold(opts.ms ?? Math.max(2600, 1500 + line.length * 55));
    }

    // And off he goes, by himself, across the rest of the scene.
    if (here()) {
      beetle.say('');
      beetle.setMood('stand');
      if (motion) await beetle.stroll(off(!fromLeft), floor(), 64);
      beetle.hide();
      await sleep(motion ? 0 : 250);
    } else if (beetle.left) {
      // Shooed: let him finish flying out of sight.
      await sleep(motion ? 700 : 0);
    }
  } finally {
    beetle.stop();
    beetle.el.remove();
    announce(-1);
  }
}
