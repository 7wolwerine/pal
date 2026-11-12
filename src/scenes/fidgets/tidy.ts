import { FIDGETS } from '../../content/fidgets.ts';
import type { GameContext } from '../../game.ts';
import { h, sleep } from '../../ui/dom.ts';
import { livingSprite, sprite } from '../../ui/sprites.ts';
import { DIAL_STEPS, FidgetModel, SLIDER_TARGET, isAligned, type Control, type ControlKind } from './model.ts';

const SCENE = 'fidgets';

/** The value at which a control of each kind counts as aligned. */
function alignedValue(kind: ControlKind): number {
  return kind === 'slider' ? SLIDER_TARGET : kind === 'toggle' ? 1 : 0;
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
    const r1 = 11;
    const r2 = 7.5;
    const p = (r: number, t: number) => `${(12 + r * Math.cos(t)).toFixed(1)} ${(12 + r * Math.sin(t)).toFixed(1)}`;
    d += `${i === 0 ? 'M' : 'L'} ${p(r1, a)} L ${p(r1, b)} L ${p(r2, b)} L ${p(r2, a + Math.PI / 4)} `;
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

interface Cell {
  readonly el: HTMLElement;
  /** Makes the control on screen match the model. */
  sync(): void;
}

/** The beetle: a sprite that can swap between calm and panic, with a speech bubble above it. */
class Beetle {
  readonly el: HTMLElement;
  readonly #body: HTMLElement;
  readonly #bubble: HTMLElement;

  constructor() {
    this.#body = h('div', { class: 'bug__body' }, livingSprite('bug'));
    this.#bubble = h('div', { class: 'bug__bubble', attrs: { 'aria-live': 'assertive' } });
    this.#bubble.hidden = true;
    this.el = h('div', { class: 'bug' }, this.#bubble, this.#body);
  }

  /** Shows a short line in the bubble above the beetle, or clears it when empty. */
  say(line: string): void {
    this.#bubble.textContent = line;
    this.#bubble.hidden = !line;
  }

  /** calm = normal pose; panic = antennae clutched to its head, trembling. */
  setPose(pose: 'calm' | 'panic'): void {
    this.#body.classList.toggle('bug__body--panic', pose === 'panic');
    this.#body.replaceChildren(pose === 'panic' ? sprite('bugPanic') : livingSprite('bug'));
  }

  gone(): void {
    this.say('');
    this.el.classList.add('bug--gone');
  }
}

/**
 * The panel of misaligned controls. Nothing asks the player to straighten
 * them. When they do, BUG knocks some out again, three times, and then gives
 * up. Resolves once the player has out-stubborned BUG.
 */
export function tidy(ctx: GameContext, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const { witness, stage } = ctx;
    const model = new FidgetModel();
    const cells = new Map<string, Cell>();
    const startedAt = performance.now();
    let roundStartedAt = startedAt;
    let touched = false;
    let busy = false;
    // A cog has fallen out from under the panel and has to be put back too.
    let gearPlaced = false;

    const beetle = new Beetle();
    const panel = h('div', { class: 'fidgets' });

    /** Everything is tidy once the controls are aligned and the cog is back. */
    const maybeComplete = (): void => {
      if (!busy && gearPlaced && model.allAligned) void tidied();
    };

    const change = (id: string, value: number): void => {
      if (!touched) {
        touched = true;
        witness.record({
          scene: SCENE,
          kind: 'first-touch',
          trick: 'completion-urge',
          data: { control: id, ms: Math.round(performance.now() - startedAt) },
        });
      }
      witness.tally('fidget');
      model.set(id, value);
      cells.get(id)?.sync();
      maybeComplete();
    };

    model.controls.forEach((control, index) => {
      const cell = buildCell(control, index, change);
      cells.set(control.id, cell);
      panel.append(cell.el);
    });
    const socket = h('span', { class: 'gear-socket', attrs: { 'aria-hidden': 'true' } }, gearSvg());
    panel.append(socket, beetle.el);

    const gear = h('button', {
      class: 'gear gear--fallen',
      attrs: { type: 'button', 'aria-label': 'Vrátit spadlé kolečko' },
    }, gearSvg());
    const gearHint = h('p', { class: 'gear-hint', text: 'Jedno kolečko vypadlo.' });
    gear.addEventListener('click', () => {
      if (gearPlaced) return;
      gearPlaced = true;
      witness.record({ scene: SCENE, kind: 'gear-back', trick: 'completion-urge' });
      // Fly the cog from where it lies up into its empty socket, then spin it.
      const from = gear.getBoundingClientRect();
      const to = socket.getBoundingClientRect();
      gear.style.setProperty('--gx', `${Math.round(to.left - from.left + (to.width - from.width) / 2)}px`);
      gear.style.setProperty('--gy', `${Math.round(to.top - from.top + (to.height - from.height) / 2)}px`);
      gear.classList.remove('gear--fallen');
      gear.classList.add('gear--placing');
      gear.disabled = true;
      gearHint.remove();
      socket.classList.add('gear-socket--filled');
      window.setTimeout(() => maybeComplete(), 650);
    });

    stage.replaceChildren(panel, gear, gearHint);
    for (const cell of cells.values()) cell.sync();
    requestAnimationFrame(() => perch(null));

    /** Moves the beetle onto a control, or back to its corner. Half of .bug is 28px. */
    function perch(id: string | null): void {
      const target = id ? cells.get(id)?.el : null;
      const x = target ? target.offsetLeft + target.offsetWidth / 2 - 28 : panel.clientWidth - 58;
      const y = target ? target.offsetTop - 24 : -26;
      beetle.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }

    async function tidied(): Promise<void> {
      busy = true;
      const round = model.completeRound();
      witness.record({
        scene: SCENE,
        kind: 'tidied',
        // The first tidy-up is the urge. Every further one is money already sunk.
        trick: round === 1 ? 'completion-urge' : 'sunk-cost',
        data: { round, ms: Math.round(performance.now() - roundStartedAt) },
      });

      if (model.finished) {
        // Last stand: the beetle clamps onto one control and the player has to
        // shove it off with a burst of clicks before it finally gives up.
        await lastStand();
        if (signal.aborted) return;
        panel.inert = true;
        panel.classList.add('fidgets--done');
        beetle.say(FIDGETS.bugResigns);
        await sleep(1400);
        if (signal.aborted) return;
        beetle.gone();
        await sleep(1500);
        if (!signal.aborted) resolve();
        return;
      }

      const lines = FIDGETS.bug[round - 1];
      await sleep(450);
      if (signal.aborted) return;
      beetle.say(lines?.before ?? '');
      // The beetle scurries onto each control it is about to undo, clutches its
      // head and knocks the control back out, with a yelp right at its mouth.
      let hitIndex = 0;
      for (const hit of model.planSabotage()) {
        perch(hit.id);
        beetle.setPose('panic');
        beetle.say(FIDGETS.bugPanic[hitIndex % FIDGETS.bugPanic.length] ?? '');
        hitIndex++;
        await sleep(700);
        if (signal.aborted) return;
        model.set(hit.id, hit.value);
        const cell = cells.get(hit.id);
        cell?.sync();
        cell?.el.classList.remove('cell--kicked');
        void cell?.el.offsetWidth;
        cell?.el.classList.add('cell--kicked');
        await sleep(350);
        if (signal.aborted) return;
      }
      beetle.setPose('calm');
      perch(null);
      beetle.say(lines?.after ?? '');
      roundStartedAt = performance.now();
      busy = false;
      // A fast player may have fixed everything again while BUG was still at it.
      maybeComplete();
    }

    /** The beetle grabs one control; the player shoves it off by clicking. */
    function lastStand(): Promise<void> {
      return new Promise((done) => {
        const victim = model.controls.find(isAligned) ?? model.controls[0];
        if (!victim) {
          done();
          return;
        }
        // Knock the grabbed control out and sit the beetle on it.
        model.set(victim.id, victim.kind === 'slider' ? 12 : victim.kind === 'toggle' ? 0 : 3);
        const cell = cells.get(victim.id);
        cell?.sync();
        perch(victim.id);
        beetle.setPose('panic');
        beetle.say(FIDGETS.bugGrab);

        const need = FIDGETS.bugShove.length;
        let shoves = 0;
        const startedShoveAt = performance.now();
        const overlay = h('button', {
          class: 'shove',
          attrs: { type: 'button', 'aria-label': 'Odstrč brouka' },
        });
        const finish = (): void => {
          overlay.remove();
          witness.record({
            scene: SCENE,
            kind: 'beetle-overcome',
            trick: 'sunk-cost',
            data: { shoves, ms: Math.round(performance.now() - startedShoveAt) },
          });
          // Flung off: dizzy in the corner, the grabbed control snaps right.
          beetle.say(FIDGETS.bugFlung);
          perch(null);
          beetle.el.classList.remove('bug--flung');
          void beetle.el.offsetWidth;
          beetle.el.classList.add('bug--flung');
          model.set(victim.id, alignedValue(victim.kind));
          cell?.sync();
          done();
        };
        overlay.addEventListener('click', () => {
          if (signal.aborted) return;
          shoves++;
          witness.tally('shove');
          beetle.say(FIDGETS.bugShove[Math.min(shoves, need) - 1] ?? '');
          cell?.el.classList.remove('cell--kicked');
          void cell?.el.offsetWidth;
          cell?.el.classList.add('cell--kicked');
          if (shoves >= need) finish();
        });
        cell?.el.append(overlay);
        overlay.focus();
      });
    }
  });
}

function buildCell(control: Control, index: number, change: (id: string, value: number) => void): Cell {
  const lamp = h('span', { class: 'lamp' });
  const label = `${FIDGETS.controlLabels[control.kind]} ${index + 1}`;
  const { el: input, sync: syncInput } = buildControl(control, label, change);
  const el = h('div', { class: 'cell' }, lamp, input);
  return {
    el,
    sync() {
      syncInput();
      lamp.classList.toggle('lamp--on', isAligned(control));
    },
  };
}

function buildControl(
  control: Control,
  label: string,
  change: (id: string, value: number) => void,
): { el: HTMLElement; sync(): void } {
  switch (control.kind) {
    case 'slider': {
      const el = h('input', {
        class: 'slider',
        attrs: { type: 'range', min: '0', max: '100', step: '1', 'aria-label': label },
      });
      el.addEventListener('input', () => change(control.id, Number(el.value)));
      // Close enough counts, and settles exactly on the mark when released.
      el.addEventListener('change', () => {
        if (isAligned(control)) change(control.id, SLIDER_TARGET);
      });
      return {
        el,
        sync: () => {
          el.value = String(control.value);
        },
      };
    }
    case 'toggle': {
      const el = h(
        'button',
        { class: 'toggle', attrs: { type: 'button', role: 'switch', 'aria-label': label } },
        h('span', { class: 'toggle__knob' }),
      );
      el.addEventListener('click', () => change(control.id, control.value === 1 ? 0 : 1));
      return { el, sync: () => el.setAttribute('aria-checked', String(control.value === 1)) };
    }
    case 'dial': {
      const el = h(
        'button',
        { class: 'dial', attrs: { type: 'button' } },
        h('span', { class: 'dial__hand' }),
      );
      // Shown turns only ever grow, so the hand never spins backwards to catch up.
      let turns = control.value;
      el.addEventListener('click', () => change(control.id, (control.value + 1) % DIAL_STEPS));
      return {
        el,
        sync: () => {
          turns += (((control.value - turns) % DIAL_STEPS) + DIAL_STEPS) % DIAL_STEPS;
          el.style.setProperty('--turns', String(turns));
          el.setAttribute('aria-label', `${label}, poloha ${control.value + 1} z ${DIAL_STEPS}`);
        },
      };
    }
  }
}
