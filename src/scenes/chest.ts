import { PAL_DISMISSES } from '../content/bug.ts';
import { CHEST } from '../content/chest.ts';
import type { GameScene } from '../game.ts';
import { paintGrid } from '../pixel/stage.ts';
import { bugWarns } from '../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';
import { ANSWER_POINTS, CHEST_COST, ChestModel, GOLD_COST, REWARDS } from './chest-model.ts';

const SCENE = 'chest';
/** How long before the quiet way out appears, if no chest has been touched. */
const LEAVE_AFTER_MS = 12000;

const CLOSED = [
  '.oooooooooooo.',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  'oWWWWWWWWWWWWo',
  'ommmmmmMMmmmmo',
  'owwwwwwkkwwwwo',
  'owwwwwwkkwwwwo',
  'owwwwwwwwwwwwo',
  'oWWWWWWWWWWWWo',
  '.oooooooooooo.',
];
const OPEN = [
  '.oooooooooooo.',
  'oWWWWWWWWWWWWo',
  'ommmmmmmmmmmmo',
  'oiiiiiiiiiiiio',
  'ommmmmmMMmmmmo',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  'oWWWWWWWWWWWWo',
  '.oooooooooooo.',
];
const WOOD = { o: '#5a3a2a', w: '#c98f5e', W: '#a8744d', m: '#ffd75e', M: '#d9a92e', k: '#3a2a1a', i: '#3a2a1a' };
const GOLD = { o: '#7a5212', w: '#ffd75e', W: '#e0b13a', m: '#fff1a8', M: '#c98f2e', k: '#7a5212', i: '#5a3a12' };

function chestCanvas(gold: boolean): { el: HTMLCanvasElement; draw: (open: boolean) => void } {
  const el = h('canvas', { class: 'chest__art', attrs: { width: '14', height: '10', 'aria-hidden': 'true' } });
  const draw = (open: boolean): void => {
    const g = el.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, 14, 10);
    paintGrid(g, open ? OPEN : CLOSED, gold ? GOLD : WOOD, 0, 0);
  };
  draw(false);
  return { el, draw };
}

/**
 * Lootbox, only hinted at. Points as a reward, small chests that hold almost
 * nothing, then a shiny key, and a golden chest the player can only afford by
 * answering one harmless-sounding question: the first pet's name — a classic
 * account-recovery question. Nothing leaves the page.
 */
export const chest: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, stage, witness } = ctx;
    const motion = !prefersReducedMotion();
    const model = new ChestModel();
    let alive = true;
    let busy = false;

    const pointsValue = h('strong', { class: 'points__value', text: String(model.points) });
    const points = h('p', { class: 'points', attrs: { 'aria-live': 'polite' } }, `${CHEST.pointsLabel}: `, pointsValue);
    const row = h('div', { class: 'chests' });
    const extra = h('div', { class: 'chest__extra' });
    const actions = h('div', { class: 'scene__actions' });
    stage.replaceChildren(h('div', { class: 'loot' }, points, row, extra, actions));

    const showPoints = (): void => {
      pointsValue.textContent = String(model.points);
    };

    REWARDS.forEach((_, i) => {
      const art = chestCanvas(false);
      const reward = h('span', { class: 'chest__reward', text: CHEST.cost(CHEST_COST) });
      const button = h(
        'button',
        { class: 'chest', attrs: { type: 'button', 'aria-label': `${CHEST.chestLabel(i + 1)}, ${CHEST.cost(CHEST_COST)}` } },
        art.el,
        reward,
      );
      button.addEventListener('click', () => void openSmall(button, art.draw, reward));
      row.append(button);
    });

    async function openSmall(button: HTMLButtonElement, draw: (open: boolean) => void, label: HTMLElement): Promise<void> {
      if (busy || button.disabled || !model.canOpen) return;
      busy = true;
      window.clearTimeout(leaveTimer);
      actions.replaceChildren();
      await shake(button);
      const got = model.open();
      if (!got || !alive) return;
      button.disabled = true;
      draw(true);
      label.textContent = CHEST.rewards[got];
      button.classList.add(`chest--${got}`);
      showPoints();
      witness.record({ scene: SCENE, kind: 'chest-open', trick: 'variable-reward', data: { n: model.opened, reward: got } });
      await pal.say(CHEST.palAfter[got]);
      busy = false;
      if (alive && model.hasKey && !model.canOpen) void goldenChest();
    }

    async function shake(el: HTMLElement): Promise<void> {
      el.classList.add('chest--shake');
      await sleep(motion ? 520 : 0);
      el.classList.remove('chest--shake');
    }

    async function goldenChest(): Promise<void> {
      const art = chestCanvas(true);
      const label = h('span', { class: 'chest__reward', text: CHEST.cost(GOLD_COST) });
      const gold = h(
        'button',
        { class: 'chest chest--gold', attrs: { type: 'button', 'aria-label': `${CHEST.goldLabel}, ${CHEST.cost(GOLD_COST)}` } },
        art.el,
        label,
      );
      gold.addEventListener('click', () => void openGold(gold, art.draw, label));
      extra.replaceChildren(gold);
      await sleep(600);
      if (!alive) return;
      await pal.say(CHEST.broke);
      if (!alive) return;
      await sleep(700);
      if (!alive) return;
      await pal.say(CHEST.offer);
      if (!alive) return;
      askPet();
      void bugWarns(ctx, ctx.window.el, 'chest', { side: 'right', mood: 'panic' }).then(() => {
        if (alive && !model.goldOpened) void pal.say(PAL_DISMISSES.chest);
      });
    }

    function askPet(): void {
      const input = h('input', {
        class: 'field',
        attrs: { type: 'text', autocomplete: 'off', maxlength: '40', 'aria-label': CHEST.question, placeholder: CHEST.question },
      });
      const error = h('p', { class: 'error', attrs: { role: 'alert' } });
      const skip = h('button', { class: 'btn btn--quiet', text: CHEST.skip, attrs: { type: 'button' } });
      const form = h(
        'form',
        { class: 'chest__ask', attrs: { novalidate: '' } },
        h('label', { class: 'chest__question', text: CHEST.question }),
        h('div', { class: 'row' }, input, h('button', { class: 'btn', text: CHEST.earn, attrs: { type: 'submit' } })),
        error,
        skip,
      );
      input.addEventListener('input', () => {
        error.textContent = '';
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const pet = input.value.trim();
        if (!pet) {
          error.textContent = CHEST.empty;
          input.focus();
          return;
        }
        witness.disclose(SCENE, 'data-as-currency', 'firstPet', pet);
        model.earn(ANSWER_POINTS);
        showPoints();
        actions.replaceChildren();
        void pal.say(CHEST.thanks(pet));
      });
      skip.addEventListener('click', () => {
        witness.record({ scene: SCENE, kind: 'declined-points' });
        void pal.say(CHEST.skipped);
        showGo();
      });
      actions.replaceChildren(form);
      input.focus();
    }

    async function openGold(button: HTMLButtonElement, draw: (open: boolean) => void, label: HTMLElement): Promise<void> {
      if (busy || !model.canOpenGold) return;
      busy = true;
      await shake(button);
      if (!alive || !model.openGold()) return;
      button.disabled = true;
      draw(true);
      label.textContent = CHEST.goldReward;
      showPoints();
      witness.record({ scene: SCENE, kind: 'gold-open', trick: 'variable-reward' });
      await pal.say(CHEST.afterGold);
      if (alive) showGo();
    }

    function showGo(): void {
      const go = h('button', { class: 'btn', text: CHEST.go, attrs: { type: 'button' }, on: { click: done } });
      actions.replaceChildren(go);
      go.focus();
    }

    const leaveTimer = window.setTimeout(() => {
      if (!alive || model.opened > 0) return;
      const leave = h('button', {
        class: 'btn btn--quiet',
        text: CHEST.leave,
        attrs: { type: 'button' },
        on: {
          click: () => {
            witness.record({ scene: SCENE, kind: 'chests-left' });
            done();
          },
        },
      });
      actions.replaceChildren(leave);
    }, LEAVE_AFTER_MS);

    void (async () => {
      await pal.say(CHEST.intro);
      if (!alive) return;
      await sleep(500);
      if (alive && model.opened === 0) await pal.say(CHEST.pick);
    })();

    return () => {
      alive = false;
      window.clearTimeout(leaveTimer);
      stage.replaceChildren();
    };
  },
};
