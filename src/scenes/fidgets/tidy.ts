import { FIDGETS } from '../../content/fidgets.ts';
import type { GameContext } from '../../game.ts';
import { h, sleep } from '../../ui/dom.ts';
import { livingSprite, sprite } from '../../ui/sprites.ts';
import { DIAL_STEPS, FidgetModel, SLIDER_TARGET, isAligned, type Control } from './model.ts';

const SCENE = 'fidgets';

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

    const beetle = new Beetle();
    const panel = h('div', { class: 'fidgets' });

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
      if (!busy && model.allAligned) void tidied();
    };

    model.controls.forEach((control, index) => {
      const cell = buildCell(control, index, change);
      cells.set(control.id, cell);
      panel.append(cell.el);
    });
    panel.append(beetle.el);
    stage.replaceChildren(panel);
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
      if (model.allAligned) void tidied();
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
