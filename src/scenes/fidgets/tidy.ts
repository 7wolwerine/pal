import { audio } from '../../audio/engine.ts';
import { FIDGETS } from '../../content/fidgets.ts';
import type { GameContext } from '../../game.ts';
import { h, sleep } from '../../ui/dom.ts';
import { BUG_PX, Beetle } from '../../ui/beetle.ts';
import { gearBoard } from './gearboard.ts';
import { BOOKS, FidgetModel, SCREWS, TILT_MAX, alignedValue, isAligned, screwOut, type Control, type ControlKind } from './model.ts';

const SCENE = 'fidgets';
/** How far (px) a press has to travel before it counts as a drag rather than a click. */
const DRAG_START = 5;
/** The widest BUG's bubble gets (see `.bug__bubble`), px. */
const BUBBLE_MAX = 190;
/** Where BUG prefers to make his last stand: the middle of the panel, so his bubble has room. */
const STAND_ORDER = ['book', 'chain', 'screw', 'plug', 'mail', 'tilt'];

interface Cell {
  readonly el: HTMLElement;
  /** Makes the control on screen match the model. */
  sync(): void;
}

interface ChangeOptions {
  /** A value set by dragging, instead of a click. */
  readonly drag?: number;
  /** Which part of the control a click meant (which screw). */
  readonly part?: number;
}

type Change = (id: string, options?: ChangeOptions) => void;

/**
 * The panel of nearly-done things. Nothing asks the player to fix them. When
 * they do, BUG grumbles and stamps; after each tidy-up he marches over and,
 * with real effort, puts some of them wrong again — three times — and finally
 * makes a last stand. Below the panel, cogs wait to go back on their pegs.
 * Resolves once the player has out-stubborned him.
 */
export function tidy(ctx: GameContext, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const { witness, stage, pal } = ctx;
    const model = new FidgetModel();
    const cells = new Map<string, Cell>();
    const startedAt = performance.now();
    let roundStartedAt = startedAt;
    let touched = false;
    let busy = false;
    let lastPlea = 0;
    let pleas = 0;

    const beetle = new Beetle();
    const panel = h('div', { class: 'fidgets' });

    /**
     * Keeps BUG far enough from the edges of PAL's window that his widest bubble
     * is not cut off by it: the window clips, and his bubble only knows the screen.
     */
    const inside = (x: number): number => {
      let clip: Element | null = panel.parentElement;
      while (clip && getComputedStyle(clip).overflowX === 'visible') clip = clip.parentElement;
      if (!clip) return x;
      const p = panel.getBoundingClientRect();
      const c = clip.getBoundingClientRect();
      const overhang = Math.max(0, (BUBBLE_MAX - BUG_PX) / 2) + 4;
      const lo = c.left - p.left + overhang;
      const hi = c.right - p.left - BUG_PX - overhang;
      return lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, x));
    };
    // His corner is on the panel's top edge, but never so high that he covers PAL's bubble.
    const corner = (): [number, number] => {
      const bubble = ctx.pal.el.querySelector('.pal__bubble')?.getBoundingClientRect();
      const clear = bubble && bubble.height ? bubble.bottom - panel.getBoundingClientRect().top - 6 : -Infinity;
      return [inside(panel.clientWidth - BUG_PX - 2), Math.max(-BUG_PX + 12, Math.min(clear, -BUG_PX * 0.45))];
    };
    const above = (id: string): [number, number] => {
      const cell = cells.get(id)?.el;
      if (!cell) return corner();
      return [inside(cell.offsetLeft + cell.offsetWidth / 2 - BUG_PX / 2), cell.offsetTop - BUG_PX + 18];
    };

    const maybeComplete = (): void => {
      if (!busy && gears.complete && model.allAligned) void tidied();
    };

    const touch = (what: string): void => {
      if (touched) return;
      touched = true;
      witness.record({
        scene: SCENE,
        kind: 'first-touch',
        trick: 'completion-urge',
        data: { control: what, ms: Math.round(performance.now() - startedAt) },
      });
    };

    /** BUG does not like this one bit: a scribble, a stamp, sometimes a word. */
    const grumble = (id: string): void => {
      const now = performance.now();
      if (busy || beetle.busy || beetle.away || now - lastPlea < 1500) return;
      lastPlea = now;
      pleas++;
      void (async () => {
        const [x, y] = above(id);
        await beetle.moveTo(x, y);
        if (signal.aborted || busy) return;
        if (pleas % 3 === 0) beetle.say(FIDGETS.bugPlead[(pleas / 3 - 1) % FIDGETS.bugPlead.length] ?? '');
        else beetle.grumble();
        await beetle.stomp(2);
        if (signal.aborted || busy) return;
        await sleep(400);
        if (signal.aborted || busy) return;
        beetle.say('');
        beetle.setMood('stand');
        const [cx, cy] = corner();
        await beetle.moveTo(cx, cy);
      })();
    };

    const change: Change = (id, options = {}) => {
      if (busy) return;
      touch(id);
      const control = model.get(id);
      const before = control.value;
      const dragged = options.drag !== undefined;
      const finished = options.drag === undefined ? model.poke(id, options.part) : model.drag(id, options.drag);
      const after = control.value;
      if (after === before && !finished) return;
      if (!dragged) witness.tally('fidget');
      const cell = cells.get(id);
      cell?.sync();
      if (!isAligned(control)) cell?.el.classList.remove('cell--done');
      feel(control.kind, before, after, dragged);
      if (finished) {
        window.setTimeout(() => audio.snap(76 + model.controls.indexOf(control) * 2), control.kind === 'screw' ? 160 : 0);
        cell?.el.classList.add('cell--done');
        grumble(id);
      }
      maybeComplete();
    };

    model.controls.forEach((control) => {
      const cell = buildCell(control, change);
      cells.set(control.id, cell);
      panel.append(cell.el);
    });

    // The cogs live below the panel's little things, across its whole width.
    const gearLamp = h('span', { class: 'lamp', attrs: { 'aria-hidden': 'true' } });
    const gears = gearBoard(FIDGETS.gearsLabel, FIDGETS.gearLabel, (_id, all) => {
      touch('gears');
      witness.tally('fidget');
      if (!all) return;
      gearLamp.classList.add('lamp--on');
      gearCell.classList.add('cell--done');
      witness.record({ scene: SCENE, kind: 'gear-back', trick: 'completion-urge', data: { gears: 4, ms: Math.round(performance.now() - startedAt) } });
      grumble('gears');
      maybeComplete();
    });
    const gearCell = h('div', { class: 'cell cell--gears', attrs: { role: 'group', 'aria-label': FIDGETS.gearsLabel } }, gearLamp);
    gearCell.append(gears.el);
    cells.set('gears', { el: gearCell, sync: () => undefined });
    panel.append(gearCell, beetle.el);

    stage.replaceChildren(panel);
    for (const cell of cells.values()) cell.sync();
    requestAnimationFrame(() => {
      const [x, y] = corner();
      beetle.jump(x, y);
    });

    async function tidied(): Promise<void> {
      busy = true;
      const round = model.completeRound();
      // Shooed off just now? He comes back before he gets to work.
      await beetle.whenBack();
      if (signal.aborted) return;
      witness.record({
        scene: SCENE,
        kind: 'tidied',
        trick: round === 1 ? 'completion-urge' : 'sunk-cost',
        data: { round, ms: Math.round(performance.now() - roundStartedAt) },
      });

      if (model.finished) {
        await lastStand();
        if (signal.aborted) return;
        panel.inert = true;
        panel.classList.add('fidgets--done');
        beetle.setMood('sad');
        beetle.say(FIDGETS.bugResigns);
        await sleep(1700);
        if (signal.aborted) return;
        beetle.say('');
        // He trudges off the edge of the panel and is gone.
        const [, y] = corner();
        await beetle.moveTo(panel.clientWidth + 20, y);
        beetle.el.classList.add('bug--gone');
        await sleep(600);
        gears.stop();
        if (!signal.aborted) resolve();
        return;
      }

      const lines = FIDGETS.bug[round - 1];
      await sleep(350);
      if (signal.aborted) return;
      beetle.say(lines?.before ?? '');
      await beetle.stomp(3);
      beetle.say('');
      for (const hit of model.planSabotage()) {
        if (signal.aborted) return;
        const [x, y] = above(hit.id);
        beetle.setMood('angry');
        await beetle.moveTo(x, y);
        if (signal.aborted) return;
        // Putting things wrong is hard work for a small beetle.
        await beetle.strain(1100);
        if (signal.aborted) return;
        model.set(hit.id, hit.value);
        audio.boing(0.25);
        const cell = cells.get(hit.id);
        cell?.sync();
        cell?.el.classList.remove('cell--done', 'cell--kicked');
        void cell?.el.offsetWidth;
        cell?.el.classList.add('cell--kicked');
        await beetle.cheer();
        await sleep(250);
      }
      if (signal.aborted) return;
      beetle.setMood('stand');
      const [cx, cy] = corner();
      await beetle.moveTo(cx, cy);
      beetle.say(lines?.after ?? '');
      // PAL sighs along with the player and keeps them going.
      void pal.say(FIDGETS.palMocks[round - 1] ?? '');
      roundStartedAt = performance.now();
      busy = false;
      window.setTimeout(() => beetle.say(''), 2600);
      maybeComplete();
    }

    /** BUG sits down on one control and will not budge; the player shoves him off by clicking. */
    function lastStand(): Promise<void> {
      return new Promise((done) => {
        const victim = STAND_ORDER.map((id) => model.get(id)).find(isAligned) ?? model.controls[0];
        if (!victim) {
          done();
          return;
        }
        model.set(victim.id, FidgetModel.spoil(victim.kind, () => 0.5));
        const cell = cells.get(victim.id);
        cell?.sync();
        cell?.el.classList.remove('cell--done');

        void (async () => {
          const [x, y] = above(victim.id);
          beetle.setMood('angry');
          await beetle.moveTo(x, y + 30);
          beetle.say(FIDGETS.bugGrab);
          await beetle.stomp(2);
        })();

        const need = FIDGETS.bugShove.length;
        let shoves = 0;
        const startedShoveAt = performance.now();
        const overlay = h('button', { class: 'shove', attrs: { type: 'button', 'aria-label': 'Brouk' } });
        overlay.addEventListener('click', () => {
          if (signal.aborted || shoves >= need) return;
          shoves++;
          witness.tally('shove');
          beetle.setMood(shoves % 2 ? 'panic' : 'angry');
          beetle.say(FIDGETS.bugShove[Math.min(shoves, need) - 1] ?? '');
          audio.click(50 + shoves * 3, 0.4);
          cell?.el.classList.remove('cell--kicked');
          void cell?.el.offsetWidth;
          cell?.el.classList.add('cell--kicked');
          if (shoves < need) return;
          overlay.remove();
          beetle.onPoke = undefined;
          witness.record({
            scene: SCENE,
            kind: 'beetle-overcome',
            trick: 'sunk-cost',
            data: { shoves, ms: Math.round(performance.now() - startedShoveAt) },
          });
          void (async () => {
            beetle.setMood('cry');
            beetle.say(FIDGETS.bugFlung);
            const [cx, cy] = corner();
            await beetle.fling(cx, cy);
            model.set(victim.id, alignedValue(victim.kind));
            cell?.sync();
            cell?.el.classList.add('cell--done');
            audio.snap(84);
            done();
          })();
        });
        cell?.el.append(overlay);
        // Clicking BUG himself counts as a shove too.
        beetle.onPoke = () => overlay.click();
        overlay.focus();
      });
    }

    signal.addEventListener('abort', () => {
      beetle.stop();
      gears.stop();
    });
  });
}

/** The sound of one thing being moved: every kind has its own. */
function feel(kind: ControlKind, before: number, after: number, dragged: boolean): void {
  switch (kind) {
    case 'tilt':
      if (Math.abs(after - before) >= 1) audio.click(58 + Math.abs(after) * 2, dragged ? 0.2 : 0.45);
      return;
    case 'screw':
      // A short ratchet as it bites into the plate.
      [0, 50, 100].forEach((ms, i) => window.setTimeout(() => audio.click(62 + i * 5, 0.32), ms));
      return;
    case 'chain':
      audio.click(after === 1 ? 82 : 64, 0.5);
      return;
    case 'book':
      audio.knock();
      return;
    case 'plug':
      audio.click(70, 0.4);
      return;
    case 'mail':
      audio.click(60 + after * 2, 0.45);
      return;
  }
}

/**
 * Lets a control be dragged as well as clicked. `axis` picks what movement
 * matters; `toValue` turns the distance dragged (px) into a new value.
 */
function draggable(
  el: HTMLElement,
  control: Control,
  change: Change,
  axis: 'x' | 'y',
  toValue: (start: number, delta: number) => number,
): void {
  let start: { x: number; y: number; value: number } | undefined;
  let dragging = false;
  let swallowClick = false;
  el.addEventListener('pointerdown', (event) => {
    start = { x: event.clientX, y: event.clientY, value: control.value };
    dragging = false;
    el.setPointerCapture(event.pointerId);
  });
  el.addEventListener('pointermove', (event) => {
    if (!start) return;
    const delta = axis === 'x' ? event.clientX - start.x : event.clientY - start.y;
    if (!dragging && Math.abs(delta) < DRAG_START) return;
    dragging = true;
    el.classList.add('fx--dragging');
    change(control.id, { drag: toValue(start.value, delta) });
  });
  const end = (): void => {
    if (dragging) swallowClick = true;
    start = undefined;
    dragging = false;
    el.classList.remove('fx--dragging');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', (event) => {
    if (swallowClick) {
      swallowClick = false;
      event.preventDefault();
      return;
    }
    change(control.id);
  });
}

function buildCell(control: Control, change: Change): Cell {
  const label = FIDGETS.controlLabels[control.kind];
  const lamp = h('span', { class: 'lamp', attrs: { 'aria-hidden': 'true' } });
  const { el: widget, sync } = buildWidget(control, label, change);
  const el = h('div', { class: `cell cell--${control.kind}`, attrs: { role: 'group', 'aria-label': label } }, lamp, widget);
  return {
    el,
    sync() {
      sync();
      lamp.classList.toggle('lamp--on', isAligned(control));
      if (control.kind === 'chain') el.classList.toggle('cell--warm', control.value === 1);
    },
  };
}

/** Where each book lies once it has fallen over; they fall in this order, so the last one is on top of the heap. */
const FALL_ORDER = [0, 4, 3, 1, 2] as const;

function buildWidget(control: Control, label: string, change: Change): { el: HTMLElement; sync(): void } {
  // Every widget is drawn in the same small box, which the stylesheet scales to fit the cell.
  const button = (cls: string, ...children: HTMLElement[]): HTMLButtonElement =>
    h('button', { class: `fx ${cls}`, attrs: { type: 'button', 'aria-label': label } }, h('span', { class: 'fx__art' }, ...children));

  switch (control.kind) {
    case 'tilt': {
      // A picture on a nail: drag sideways to straighten it, or give it a firm nudge with a click.
      const frame = h('span', { class: 'fx-tilt__frame' }, h('span', { class: 'fx-tilt__pic' }));
      const el = button('fx-tilt', h('span', { class: 'fx-tilt__nail' }), frame);
      draggable(el, control, change, 'x', (start, dx) => Math.max(-TILT_MAX, Math.min(TILT_MAX, start + dx / 5)));
      return { el, sync: () => el.style.setProperty('--tilt', `${control.value}deg`) };
    }
    case 'screw': {
      // Four screws stand proud of a plate. A click drives in the loose one nearest to it.
      const turned = Array.from({ length: SCREWS }, (_, i) => i * 37);
      const screws = Array.from({ length: SCREWS }, (_, i) =>
        h('span', { class: `fx-screw__s fx-screw__s--${i}` }, h('span', { class: 'fx-screw__shaft' }), h('span', { class: 'fx-screw__head' }, h('span', { class: 'fx-screw__slot' }))),
      );
      const el = button('fx-screw', h('span', { class: 'fx-screw__plate' }), ...screws);
      let last = control.value;
      el.addEventListener('click', (event) => {
        let part: number | undefined;
        if (event.detail > 0) {
          let best = Infinity;
          screws.forEach((s, i) => {
            if (!screwOut(control.value, i)) return;
            const r = s.getBoundingClientRect();
            const d = Math.hypot(event.clientX - (r.left + r.width / 2), event.clientY - (r.top + r.height / 2));
            if (d < best) {
              best = d;
              part = i;
            }
          });
        }
        change(control.id, { part });
      });
      return {
        el,
        sync: () => {
          screws.forEach((s, i) => {
            const out = screwOut(control.value, i);
            const was = screwOut(last, i);
            if (was && !out) turned[i] = (turned[i] ?? 0) + 540;
            if (!was && out) turned[i] = (turned[i] ?? 0) - 540;
            s.classList.toggle('fx-screw__s--out', out);
            s.style.setProperty('--turn', `${turned[i] ?? 0}deg`);
          });
          last = control.value;
        },
      };
    }
    case 'chain': {
      // A little lamp with a pull chain. Pull it (click, or drag it down) and the light comes on.
      const chain = h('span', { class: 'fx-chain__pull' }, h('span', { class: 'fx-chain__links' }), h('span', { class: 'fx-chain__bead' }));
      const el = button(
        'fx-chain',
        h('span', { class: 'fx-chain__glow' }),
        h('span', { class: 'fx-chain__rose' }),
        h('span', { class: 'fx-chain__cord' }),
        h('span', { class: 'fx-chain__cone' }),
        chain,
        h('span', { class: 'fx-chain__bulb' }),
        h('span', { class: 'fx-chain__shade' }),
      );
      let start: { y: number; id: number } | undefined;
      let pulled = 0;
      let swallowClick = false;
      const tug = (): void => {
        el.classList.remove('fx-chain--tug');
        void el.offsetWidth;
        el.classList.add('fx-chain--tug');
        audio.click(98, 0.18);
        // The light switches at the bottom of the pull.
        window.setTimeout(() => change(control.id), 120);
      };
      el.addEventListener('pointerdown', (event) => {
        start = { y: event.clientY, id: event.pointerId };
        pulled = 0;
        el.setPointerCapture(event.pointerId);
      });
      el.addEventListener('pointermove', (event) => {
        if (!start || event.pointerId !== start.id) return;
        const dy = event.clientY - start.y;
        if (pulled === 0 && dy < DRAG_START) return;
        pulled = Math.max(0, Math.min(16, dy));
        el.classList.add('fx--dragging');
        el.style.setProperty('--pull', `${pulled}px`);
      });
      const release = (): void => {
        if (!start) return;
        start = undefined;
        el.classList.remove('fx--dragging');
        if (pulled === 0) return;
        swallowClick = true;
        const far = pulled >= 9;
        pulled = 0;
        // It springs back up.
        el.style.removeProperty('--pull');
        if (far) {
          audio.click(98, 0.18);
          change(control.id);
        }
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('click', (event) => {
        if (swallowClick) {
          swallowClick = false;
          event.preventDefault();
          return;
        }
        tug();
      });
      el.addEventListener('animationend', () => el.classList.remove('fx-chain--tug'));
      return { el, sync: () => el.classList.toggle('fx-chain--on', control.value === 1) };
    }
    case 'book': {
      // Books lie fallen over, leaning and in a heap; every click stands one of them back up.
      const books = Array.from({ length: BOOKS }, (_, i) => h('span', { class: `fx-book__b fx-book__b--${i}` }));
      const el = button('fx-book', h('span', { class: 'fx-book__shelf' }), ...books);
      el.addEventListener('click', () => change(control.id));
      return {
        el,
        sync: () => {
          const fallen = new Set(FALL_ORDER.slice(0, control.value));
          books.forEach((b, i) => b.classList.toggle('fx-book__b--down', fallen.has(i as (typeof FALL_ORDER)[number])));
        },
      };
    }
    case 'plug': {
      // A lamp whose plug lies just out of the socket. Put it in and the lamp lights.
      const el = button(
        'fx-plug',
        h('span', { class: 'fx-plug__lamp' }, h('span', { class: 'fx-plug__shade' }), h('span', { class: 'fx-plug__bulb' }), h('span', { class: 'fx-plug__base' })),
        h('span', { class: 'fx-plug__socket' }),
        h('span', { class: 'fx-plug__cord' }),
        h('span', { class: 'fx-plug__plug' }),
      );
      draggable(el, control, change, 'x', (start, dx) => (dx > 14 ? 1 : start));
      return { el, sync: () => el.classList.toggle('fx-plug--in', control.value === 1) };
    }
    case 'mail': {
      // A big mail icon with a red badge: every click reads one.
      const count = h('span', { class: 'fx-mail__badge' });
      const el = button('fx-mail', h('span', { class: 'fx-mail__env' }, h('span', { class: 'fx-mail__flap' })), count);
      let last = control.value;
      el.addEventListener('click', () => change(control.id));
      return {
        el,
        sync: () => {
          count.textContent = String(control.value);
          count.hidden = control.value === 0;
          el.setAttribute('aria-label', `${label}: ${control.value}`);
          if (control.value !== last) {
            count.classList.remove('fx-mail__badge--pop');
            void count.offsetWidth;
            count.classList.add('fx-mail__badge--pop');
          }
          last = control.value;
        },
      };
    }
  }
}
