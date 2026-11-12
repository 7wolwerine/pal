import { FIDGETS } from '../../content/fidgets.ts';
import type { GameContext } from '../../game.ts';
import { h, sleep } from '../../ui/dom.ts';
import { BUG_PX, Beetle } from '../../ui/beetle.ts';
import type { BugFrame } from '../../ui/bug-sprite.ts';
import { CHECK_COUNT, FidgetModel, LED_COUNT, alignedValue, isAligned, type Control } from './model.ts';

const SCENE = 'fidgets';

interface Cell {
  readonly el: HTMLElement;
  /** Makes the control on screen match the model. */
  sync(): void;
}

/**
 * The panel of nearly-done things. Nothing asks the player to fix them. When
 * they do, BUG pleads, then knocks some back out, three times, and finally
 * makes a last stand. Resolves once the player has out-stubborned BUG.
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

    const corner = (): [number, number] => [panel.clientWidth - BUG_PX - 6, -BUG_PX + 14];
    const above = (id: string): [number, number] => {
      const cell = cells.get(id)?.el;
      if (!cell) return corner();
      return [cell.offsetLeft + cell.offsetWidth / 2 - BUG_PX / 2, cell.offsetTop - BUG_PX + 16];
    };

    const maybeComplete = (): void => {
      if (!busy && gearPlaced && model.allAligned) void tidied();
    };

    /** BUG reacts, desperately, when the player fixes something. */
    const plead = (id: string): void => {
      const now = performance.now();
      if (busy || beetle.busy || now - lastPlea < 1700) return;
      lastPlea = now;
      const line = FIDGETS.bugPlead[pleas % FIDGETS.bugPlead.length] ?? '';
      pleas++;
      const mood: BugFrame = pleas % 3 === 0 ? 'cry' : 'panic';
      void (async () => {
        const [x, y] = above(id);
        await beetle.moveTo(x, y);
        if (signal.aborted || busy) return;
        beetle.setMood(mood);
        beetle.say(line);
        await sleep(1100);
        if (signal.aborted || busy) return;
        beetle.setMood('stand');
        const [cx, cy] = corner();
        await beetle.moveTo(cx, cy);
        if (!busy) beetle.say('');
      })();
    };

    const change = (id: string, part = 0): void => {
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
      witness.tally('fidget');
      const finished = model.poke(id, part);
      cells.get(id)?.sync();
      if (finished) {
        plead(id);
        cells.get(id)?.el.classList.add('cell--done');
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

    const gear = h(
      'button',
      { class: 'gear gear--fallen', attrs: { type: 'button', 'aria-label': 'Vrátit spadlé kolečko' } },
      gearSvg(),
    );
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
      window.setTimeout(() => maybeComplete(), 650);
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
        await sleep(1600);
        if (signal.aborted) return;
        beetle.say('');
        // It trudges off the edge of the panel and is gone.
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
      beetle.setMood('angry');
      beetle.say(lines?.before ?? '');
      await beetle.stomp(2);
      let hitIndex = 0;
      for (const hit of model.planSabotage()) {
        if (signal.aborted) return;
        const [x, y] = above(hit.id);
        beetle.setMood('angry');
        await beetle.moveTo(x, y);
        if (signal.aborted) return;
        beetle.setMood('panic');
        beetle.say(FIDGETS.bugPanic[hitIndex % FIDGETS.bugPanic.length] ?? '');
        hitIndex++;
        await beetle.stomp(1);
        model.set(hit.id, hit.value);
        const cell = cells.get(hit.id);
        cell?.sync();
        cell?.el.classList.remove('cell--done', 'cell--kicked');
        void cell?.el.offsetWidth;
        cell?.el.classList.add('cell--kicked');
        await sleep(260);
      }
      if (signal.aborted) return;
      beetle.setMood('stand');
      const [cx, cy] = corner();
      await beetle.moveTo(cx, cy);
      beetle.say(lines?.after ?? '');
      // PAL laughs the beetle off and keeps the player going.
      void pal.say(FIDGETS.palMocks[round - 1] ?? '');
      roundStartedAt = performance.now();
      busy = false;
      maybeComplete();
    }

    /** The beetle plants itself on one control; the player shoves it off by clicking. */
    function lastStand(): Promise<void> {
      return new Promise((done) => {
        const victim = model.controls.find(isAligned) ?? model.controls[0];
        if (!victim) {
          done();
          return;
        }
        const plan = model.planSabotage(() => 0.5);
        model.set(victim.id, plan[0]?.value ?? 0);
        if (isAligned(victim)) model.set(victim.id, victim.kind === 'plug' ? 0 : alignedValue(victim.kind) - 1);
        const cell = cells.get(victim.id);
        cell?.sync();
        cell?.el.classList.remove('cell--done');

        void (async () => {
          const [x, y] = above(victim.id);
          beetle.setMood('angry');
          await beetle.moveTo(x, y + 26);
          beetle.say(FIDGETS.bugGrab);
        })();

        const need = FIDGETS.bugShove.length;
        let shoves = 0;
        const startedShoveAt = performance.now();
        const overlay = h('button', { class: 'shove', attrs: { type: 'button', 'aria-label': 'Odstrč brouka' } });
        overlay.addEventListener('click', () => {
          if (signal.aborted || shoves >= need) return;
          shoves++;
          witness.tally('shove');
          beetle.setMood(shoves % 2 ? 'panic' : 'angry');
          beetle.say(FIDGETS.bugShove[Math.min(shoves, need) - 1] ?? '');
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

function buildCell(control: Control, change: (id: string, part?: number) => void): Cell {
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

function buildWidget(
  control: Control,
  label: string,
  change: (id: string, part?: number) => void,
): { el: HTMLElement; sync(): void } {
  switch (control.kind) {
    case 'progress': {
      const fill = h('span', { class: 'bar__fill' });
      const text = h('span', { class: 'bar__text' });
      const el = h('button', { class: 'bar', attrs: { type: 'button', 'aria-label': label } }, fill, text);
      el.addEventListener('click', () => change(control.id));
      return {
        el,
        sync: () => {
          fill.style.width = `${control.value}%`;
          text.textContent = `${control.value} %`;
          el.classList.toggle('bar--full', control.value >= 100);
        },
      };
    }
    case 'badge': {
      const count = h('span', { class: 'bell__badge' });
      const el = h('button', { class: 'bell', attrs: { type: 'button' } }, bellSvg(), count);
      el.addEventListener('click', () => change(control.id));
      return {
        el,
        sync: () => {
          count.textContent = String(control.value);
          count.hidden = control.value === 0;
          el.setAttribute('aria-label', `${label}: ${control.value}`);
          el.classList.remove('bell--ring');
          void el.offsetWidth;
          if (control.value > 0) el.classList.add('bell--ring');
        },
      };
    }
    case 'checks': {
      const rows = FIDGETS.checkItems.slice(0, CHECK_COUNT).map((name, i) => {
        const box = h('span', { class: 'check__box', attrs: { 'aria-hidden': 'true' } });
        const row = h('button', { class: 'check', attrs: { type: 'button', role: 'checkbox' } }, box, h('span', { text: name }));
        row.addEventListener('click', () => change(control.id, i));
        return row;
      });
      return {
        el: h('div', { class: 'checks' }, ...rows),
        sync: () => {
          rows.forEach((row, i) => row.setAttribute('aria-checked', String(Boolean(control.value & (1 << i)))));
        },
      };
    }
    case 'tilt': {
      const picture = h('span', { class: 'frame__pic', attrs: { 'aria-hidden': 'true' } });
      const el = h('button', { class: 'frame', attrs: { type: 'button', 'aria-label': label } }, h('span', { class: 'frame__nail' }), picture);
      el.addEventListener('click', () => change(control.id));
      return { el, sync: () => el.style.setProperty('--tilt', `${control.value * 5}deg`) };
    }
    case 'leds': {
      const leds = Array.from({ length: LED_COUNT }, (_, i) => {
        const led = h('button', { class: 'led', attrs: { type: 'button', 'aria-label': FIDGETS.led(i + 1) } });
        led.addEventListener('click', () => change(control.id, i));
        return led;
      });
      return {
        el: h('div', { class: 'leds' }, ...leds),
        sync: () => {
          leds.forEach((led, i) => {
            const on = Boolean(control.value & (1 << i));
            led.classList.toggle('led--on', on);
            led.setAttribute('aria-pressed', String(on));
          });
        },
      };
    }
    case 'plug': {
      const el = h(
        'button',
        { class: 'cable', attrs: { type: 'button', 'aria-label': label } },
        h('span', { class: 'cable__port' }),
        h('span', { class: 'cable__wire' }),
        h('span', { class: 'cable__plug' }),
        h('span', { class: 'cable__link' }),
      );
      el.addEventListener('click', () => change(control.id));
      return { el, sync: () => el.classList.toggle('cable--in', control.value === 1) };
    }
  }
}

function bellSvg(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M12 3a5 5 0 0 0-5 5v4l-2 3h14l-2-3V8a5 5 0 0 0-5-5zm-2 14a2 2 0 0 0 4 0z');
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}
