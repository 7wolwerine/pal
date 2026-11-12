import { audio } from '../../audio/engine.ts';
import { FIDGETS } from '../../content/fidgets.ts';
import type { GameContext } from '../../game.ts';
import { h, sleep } from '../../ui/dom.ts';
import { BUG_PX, Beetle } from '../../ui/beetle.ts';
import { FidgetModel, TILT_MAX, alignedValue, isAligned, type Control } from './model.ts';

const SCENE = 'fidgets';
/** How far (px) a press has to travel before it counts as a drag rather than a click. */
const DRAG_START = 5;

interface Cell {
  readonly el: HTMLElement;
  /** Makes the control on screen match the model. */
  sync(): void;
}

type Change = (id: string, dragTo?: number) => void;

/**
 * The panel of nearly-done things. Nothing asks the player to fix them. When
 * they do, BUG grumbles and stamps; after each tidy-up he marches over and,
 * with real effort, puts some of them wrong again — three times — and finally
 * makes a last stand. Resolves once the player has out-stubborned him.
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
    let gearPlaced = false;
    let lastPlea = 0;
    let pleas = 0;

    const beetle = new Beetle();
    const panel = h('div', { class: 'fidgets' });

    const corner = (): [number, number] => [panel.clientWidth - BUG_PX - 2, -BUG_PX + 12];
    const above = (id: string): [number, number] => {
      const cell = cells.get(id)?.el;
      if (!cell) return corner();
      return [cell.offsetLeft + cell.offsetWidth / 2 - BUG_PX / 2, cell.offsetTop - BUG_PX + 18];
    };

    const maybeComplete = (): void => {
      if (!busy && gearPlaced && model.allAligned) void tidied();
    };

    /** BUG does not like this one bit: a scribble, a stamp, sometimes a word. */
    const grumble = (id: string): void => {
      const now = performance.now();
      if (busy || beetle.busy || now - lastPlea < 1500) return;
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

    const change: Change = (id, dragTo) => {
      if (busy) return;
      if (!touched) {
        touched = true;
        witness.record({
          scene: SCENE,
          kind: 'first-touch',
          trick: 'completion-urge',
          data: { control: id, ms: Math.round(performance.now() - startedAt) },
        });
      }
      const before = model.get(id).value;
      const finished = dragTo === undefined ? model.poke(id) : model.drag(id, dragTo);
      const after = model.get(id).value;
      if (after === before && !finished) return;
      if (dragTo === undefined) witness.tally('fidget');
      cells.get(id)?.sync();
      if (finished) {
        audio.snap(76 + model.controls.findIndex((c) => c.id === id) * 2);
        cells.get(id)?.el.classList.add('cell--done');
        grumble(id);
      } else if (dragTo === undefined || Math.abs(after - before) >= 1) {
        audio.click(60 + Math.abs(after) * 2, dragTo === undefined ? 0.45 : 0.2);
      }
      maybeComplete();
    };

    model.controls.forEach((control) => {
      const cell = buildCell(control, change);
      cells.set(control.id, cell);
      panel.append(cell.el);
    });
    const socket = h('span', { class: 'gear-socket', attrs: { 'aria-hidden': 'true' } }, gearSvg());
    panel.append(socket, beetle.el);

    const gear = h('button', { class: 'gear gear--fallen', attrs: { type: 'button', 'aria-label': 'Spadlé kolečko' } }, gearSvg());
    gear.addEventListener('click', () => {
      if (gearPlaced) return;
      gearPlaced = true;
      witness.record({ scene: SCENE, kind: 'gear-back', trick: 'completion-urge' });
      const from = gear.getBoundingClientRect();
      const to = socket.getBoundingClientRect();
      gear.style.setProperty('--gx', `${Math.round(to.left - from.left + (to.width - from.width) / 2)}px`);
      gear.style.setProperty('--gy', `${Math.round(to.top - from.top + (to.height - from.height) / 2)}px`);
      gear.classList.remove('gear--fallen');
      gear.classList.add('gear--placing');
      gear.disabled = true;
      socket.classList.add('gear-socket--filled');
      window.setTimeout(() => {
        audio.snap(72);
        maybeComplete();
      }, 650);
    });

    stage.replaceChildren(panel, gear);
    for (const cell of cells.values()) cell.sync();
    requestAnimationFrame(() => {
      const [x, y] = corner();
      beetle.jump(x, y);
    });

    async function tidied(): Promise<void> {
      busy = true;
      const round = model.completeRound();
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
        const victim = model.controls.find(isAligned) ?? model.controls[0];
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
        overlay.focus();
      });
    }

    signal.addEventListener('abort', () => beetle.stop());
  });
}

/** An 8-tooth cog as inline SVG. */
function gearSvg(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = a + Math.PI / 8;
    const p = (r: number, t: number) => `${(12 + r * Math.cos(t)).toFixed(1)} ${(12 + r * Math.sin(t)).toFixed(1)}`;
    d += `${i === 0 ? 'M' : 'L'} ${p(11, a)} L ${p(11, b)} L ${p(7.5, b)} L ${p(7.5, a + Math.PI / 4)} `;
  }
  const cog = document.createElementNS(NS, 'path');
  cog.setAttribute('d', `${d}Z`);
  cog.setAttribute('fill', 'currentColor');
  const hole = document.createElementNS(NS, 'circle');
  hole.setAttribute('cx', '12');
  hole.setAttribute('cy', '12');
  hole.setAttribute('r', '3');
  hole.setAttribute('fill', 'var(--pick)');
  svg.append(cog, hole);
  return svg;
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
    change(control.id, toValue(start.value, delta));
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
    },
  };
}

function buildWidget(control: Control, label: string, change: Change): { el: HTMLElement; sync(): void } {
  const button = (cls: string, ...children: HTMLElement[]): HTMLButtonElement =>
    h('button', { class: `fx ${cls}`, attrs: { type: 'button', 'aria-label': label } }, ...children);

  switch (control.kind) {
    case 'tilt': {
      // A picture on a nail: drag sideways to straighten it, or nudge it with clicks.
      const frame = h('span', { class: 'fx-tilt__frame' }, h('span', { class: 'fx-tilt__pic' }));
      const el = button('fx-tilt', h('span', { class: 'fx-tilt__nail' }), frame);
      draggable(el, control, change, 'x', (start, dx) => Math.max(-TILT_MAX, Math.min(TILT_MAX, start + dx / 5)));
      return { el, sync: () => el.style.setProperty('--tilt', `${control.value}deg`) };
    }
    case 'screw': {
      // One screw out of four stands proud of the plate; every click turns it further in.
      let turned = 0;
      const head = h('span', { class: 'fx-screw__head' }, h('span', { class: 'fx-screw__slot' }));
      const shaft = h('span', { class: 'fx-screw__shaft' });
      const el = button(
        'fx-screw',
        h('span', { class: 'fx-screw__plate' }, h('span', { class: 'fx-screw__dot' }), h('span', { class: 'fx-screw__dot' }), h('span', { class: 'fx-screw__dot' }), h('span', { class: 'fx-screw__spot' }, shaft, head)),
      );
      let last = control.value;
      el.addEventListener('click', () => change(control.id));
      return {
        el,
        sync: () => {
          if (control.value !== last) turned += (last - control.value) * 72;
          last = control.value;
          el.style.setProperty('--out', String(control.value));
          el.style.setProperty('--turn', `${turned + control.value * -72}deg`);
        },
      };
    }
    case 'drawer': {
      // A drawer left open a crack: push it shut (drag left, or click).
      const front = h('span', { class: 'fx-drawer__front' }, h('span', { class: 'fx-drawer__handle' }));
      const el = button('fx-drawer', h('span', { class: 'fx-drawer__case' }), front);
      draggable(el, control, change, 'y', (start, dy) => start - dy / 3);
      return { el, sync: () => el.style.setProperty('--open', String(control.value)) };
    }
    case 'book': {
      // A row of books with one pulled out: push it back in line.
      const books = [0, 1, 2, 3, 4].map((i) => h('span', { class: `fx-book__b fx-book__b--${i}` }));
      const el = button('fx-book', h('span', { class: 'fx-book__row' }, ...books), h('span', { class: 'fx-book__shelf' }));
      draggable(el, control, change, 'y', (start, dy) => start - dy / 4);
      return { el, sync: () => el.style.setProperty('--out', String(control.value)) };
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
