import { audio } from '../audio/engine.ts';
import { PAL_DISMISSES } from '../content/bug.ts';
import { CHEST } from '../content/chest.ts';
import { isCardCode } from '../content/welcome.ts';
import { gendered, type GameScene } from '../game.ts';
import { paintGrid } from '../pixel/stage.ts';
import { bugWarns } from '../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';
import { ANSWER_POINTS, ChestModel, GOLD_GOAL, REWARDS, TREASURE } from './chest-model.ts';

const SCENE = 'chest';

// 18 x 14 chests: a domed lid, a band of metal, a keyhole.
const CLOSED = [
  '...oooooooooooo...',
  '..owwwwwwwwwwwwo..',
  '.owwwwwwwwwwwwwwo.',
  '.oWWWWWWWWWWWWWWo.',
  'ommmmmmmMMmmmmmmmo',
  'oMMMMMMMkkMMMMMMMo',
  'owwwwwwwkkwwwwwwwo',
  'owwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwo',
  'oWWWWWWWWWWWWWWWWo',
  'owwwwwwwwwwwwwwwwo',
  'oWWWWWWWWWWWWWWWWo',
  'ommmmmmmmmmmmmmmmo',
  '.oooooooooooooooo.',
];
const OPEN = [
  '.oooooooooooooooo.',
  'oWWWWWWWWWWWWWWWWo',
  'owwwwwwwwwwwwwwwwo',
  'ommmmmmmmmmmmmmmmo',
  'oiiiiiiiiiiiiiiiio',
  'oillllllllllllllio',
  'oMMMMMMMMMMMMMMMMo',
  'owwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwo',
  'oWWWWWWWWWWWWWWWWo',
  'owwwwwwwwwwwwwwwwo',
  'oWWWWWWWWWWWWWWWWo',
  'ommmmmmmmmmmmmmmmo',
  '.oooooooooooooooo.',
];
const WOOD = { o: '#4a2e1e', w: '#c98f5e', W: '#a8744d', m: '#ffd75e', M: '#d9a92e', k: '#2a1a10', i: '#2a1a10', l: '#ffe680' };
const GOLD = { o: '#7a5212', w: '#ffd75e', W: '#e0b13a', m: '#fff1a8', M: '#c98f2e', k: '#5a3a12', i: '#5a3a12', l: '#ffffff' };

function chestCanvas(gold: boolean): { el: HTMLCanvasElement; draw: (open: boolean) => void } {
  const el = h('canvas', { class: 'chest__art', attrs: { width: '18', height: '14', 'aria-hidden': 'true' } });
  const draw = (open: boolean): void => {
    const g = el.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, 18, 14);
    paintGrid(g, open ? OPEN : CLOSED, gold ? GOLD : WOOD, 0, 0);
  };
  draw(false);
  return { el, draw };
}

/**
 * Treasure that builds trust the way an investment scam does: real small
 * wins, a goal in plain sight, a near miss, and a shortcut for the last
 * stretch — an answer about yourself, or the code from the card a stranger
 * gave you. The golden chest then really pays, so giving was worth it.
 */
export const chest: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, profile, stage, witness } = ctx;
    const motion = !prefersReducedMotion();
    const model = new ChestModel();
    let alive = true;
    let busy = false;
    let shown = 0;

    const pointsValue = h('strong', { class: 'points__value', text: '0' });
    const points = h('p', { class: 'points', attrs: { 'aria-live': 'polite' } }, h('span', { class: 'points__coin', attrs: { 'aria-hidden': 'true' } }), pointsValue);
    const meterFill = h('span', { class: 'meter__fill' });
    const meterText = h('span', { class: 'meter__text', text: `0 / ${GOLD_GOAL}` });
    const meter = h('div', { class: 'meter', attrs: { role: 'progressbar', 'aria-label': CHEST.goalLabel, 'aria-valuemin': '0', 'aria-valuemax': String(GOLD_GOAL) } }, meterFill, meterText);
    const row = h('div', { class: 'chests' });
    const goldArt = chestCanvas(true);
    const lock = h('span', { class: 'chest__lock', attrs: { 'aria-hidden': 'true' } });
    const goldLabel = h('span', { class: 'chest__reward', text: CHEST.goldLabel });
    const gold = h('button', { class: 'chest chest--gold chest--locked', attrs: { type: 'button', 'aria-label': CHEST.goldLabel, 'aria-disabled': 'true' } }, goldArt.el, lock, goldLabel);
    const actions = h('div', { class: 'scene__actions' });
    stage.replaceChildren(h('div', { class: 'loot' }, points, h('div', { class: 'loot__goal' }, gold, meter), row, actions));

    /** The counter ticks up instead of jumping, with a coin sound now and then. */
    async function countTo(target: number): Promise<void> {
      const from = shown;
      const steps = motion ? Math.min(30, Math.max(6, Math.round((target - from) / 10))) : 1;
      for (let i = 1; i <= steps; i++) {
        if (!alive) return;
        shown = Math.round(from + ((target - from) * i) / steps);
        pointsValue.textContent = String(shown);
        if (i % 3 === 0) audio.click(84 + (i % 6), 0.18);
        await sleep(motion ? 35 : 0);
      }
      const progress = model.progress;
      meterFill.style.width = `${Math.round(progress * 100)}%`;
      meterText.textContent = model.unlockedBy ? '✓' : `${Math.min(model.points, GOLD_GOAL)} / ${GOLD_GOAL}`;
      meter.setAttribute('aria-valuenow', String(Math.min(model.points, GOLD_GOAL)));
    }

    REWARDS.forEach((_, i) => {
      const art = chestCanvas(false);
      const reward = h('span', { class: 'chest__reward' });
      const button = h('button', { class: 'chest', attrs: { type: 'button', 'aria-label': CHEST.chestLabel(i + 1) } }, art.el, reward);
      button.addEventListener('click', () => void openSmall(button, art.draw, reward));
      row.append(button);
    });

    async function openSmall(button: HTMLButtonElement, draw: (open: boolean) => void, label: HTMLElement): Promise<void> {
      if (busy || button.disabled || !model.canOpen) return;
      busy = true;
      await shake(button);
      const got = model.open();
      if (got === null || !alive) return;
      button.disabled = true;
      draw(true);
      button.classList.add('chest--opened');
      label.textContent = CHEST.reward(got);
      burst(button, Math.max(3, Math.round(got / 12)));
      audio.treasure();
      witness.record({ scene: SCENE, kind: 'chest-open', trick: 'variable-reward', data: { n: model.opened, reward: got } });
      await countTo(model.points);
      await pal.say(CHEST.palAfter[model.opened - 1] ?? '');
      busy = false;
      if (alive && !model.canOpen) void lastStretch();
    }

    async function shake(el: HTMLElement): Promise<void> {
      el.classList.add('chest--shake');
      audio.click(55, 0.3);
      await sleep(motion ? 520 : 0);
      el.classList.remove('chest--shake');
    }

    /** Coins popping out of a chest and flying up to the counter. */
    function burst(from: HTMLElement, count: number): void {
      if (!motion) return;
      const a = from.getBoundingClientRect();
      const b = points.getBoundingClientRect();
      for (let i = 0; i < count; i++) {
        const coin = h('span', { class: 'flycoin', attrs: { 'aria-hidden': 'true' } });
        coin.style.left = `${a.left + a.width / 2 + (Math.random() - 0.5) * 30}px`;
        coin.style.top = `${a.top + a.height / 3}px`;
        coin.style.setProperty('--dx', `${b.left + 12 - (a.left + a.width / 2)}px`);
        coin.style.setProperty('--dy', `${b.top + 8 - (a.top + a.height / 3)}px`);
        coin.style.animationDelay = `${i * 60}ms`;
        coin.addEventListener('animationend', () => coin.remove());
        document.body.append(coin);
      }
    }

    /** So close: the shortcut — an answer about yourself, or the card. */
    async function lastStretch(): Promise<void> {
      await sleep(400);
      if (!alive) return;
      await pal.say(CHEST.missing(model.missing));
      if (!alive) return;
      await pal.tapToContinue();
      if (!alive) return;
      await pal.say(CHEST.offer);
      if (!alive) return;
      askStreet();
      void bugWarns(ctx, ctx.window.el, 'chest', { side: 'right', mood: 'angry' }).then(() => {
        if (alive && !model.unlockedBy) void pal.say(PAL_DISMISSES.chest);
      });
    }

    function askStreet(): void {
      const input = h('input', {
        class: 'field',
        attrs: { type: 'text', autocomplete: 'off', maxlength: '40', 'aria-label': CHEST.question, placeholder: CHEST.question },
      });
      const error = h('p', { class: 'error', attrs: { role: 'alert' } });
      const card = h('button', { class: 'btn btn--quiet btn--small', text: CHEST.cardLink, attrs: { type: 'button' } });
      const skip = h('button', { class: 'btn btn--quiet btn--small', text: CHEST.skip, attrs: { type: 'button' } });
      const form = h(
        'form',
        { class: 'chest__ask', attrs: { novalidate: '' } },
        h('label', { class: 'chest__question', text: CHEST.question }),
        h('div', { class: 'row' }, input, h('button', { class: 'btn', text: CHEST.answerButton(ANSWER_POINTS), attrs: { type: 'submit' } })),
        error,
        h('div', { class: 'row row--wrap chest__alts' }, card, skip),
      );
      input.addEventListener('input', () => {
        error.textContent = '';
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const street = input.value.trim();
        if (!street) {
          error.textContent = CHEST.empty;
          input.focus();
          return;
        }
        witness.disclose(SCENE, 'data-as-currency', 'street', street);
        model.answer();
        actions.replaceChildren();
        void (async () => {
          await countTo(model.points);
          await pal.say(CHEST.thanks(street));
          unlock();
        })();
      });
      card.addEventListener('click', () => askCard());
      skip.addEventListener('click', () => {
        witness.record({ scene: SCENE, kind: 'declined-points' });
        actions.replaceChildren();
        void pal.say(CHEST.skipped).then(() => finish());
      });
      actions.replaceChildren(form);
      input.focus();
    }

    /** "I have a code from the card": what the AR bear's sign showed. */
    function askCard(): void {
      const input = h('input', {
        class: 'field',
        attrs: { type: 'text', autocomplete: 'off', maxlength: '12', 'aria-label': CHEST.cardLabel, placeholder: CHEST.cardLabel },
      });
      const error = h('p', { class: 'error', attrs: { role: 'alert' } });
      const back = h('button', { class: 'btn btn--quiet btn--small', text: CHEST.skip, attrs: { type: 'button' } });
      const form = h(
        'form',
        { class: 'chest__ask', attrs: { novalidate: '' } },
        h('div', { class: 'row' }, input, h('button', { class: 'btn', text: CHEST.cardSubmit, attrs: { type: 'submit' } })),
        error,
        back,
      );
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!isCardCode(input.value)) {
          error.textContent = CHEST.cardWrong;
          input.focus();
          return;
        }
        witness.record({ scene: SCENE, kind: 'ar-code', trick: 'camera-permission' });
        model.card();
        actions.replaceChildren();
        void pal.say(CHEST.cardRight).then(() => unlock());
      });
      back.addEventListener('click', () => askStreet());
      actions.replaceChildren(form);
      input.focus();
    }

    function unlock(): void {
      if (!alive) return;
      void countTo(model.points);
      audio.latch();
      gold.classList.remove('chest--locked');
      gold.classList.add('chest--ready');
      gold.removeAttribute('aria-disabled');
      gold.focus();
      void pal.say(CHEST.unlocked);
    }

    gold.addEventListener('click', () => void openGold());

    async function openGold(): Promise<void> {
      if (busy || !model.canOpenGold) return;
      busy = true;
      await shake(gold);
      if (!alive || !model.openGold()) return;
      goldArt.draw(true);
      gold.classList.remove('chest--ready');
      gold.classList.add('chest--opened', 'chest--glory');
      goldLabel.textContent = CHEST.treasure(TREASURE);
      burst(gold, 24);
      audio.treasure();
      window.setTimeout(() => audio.treasure(), 300);
      witness.record({ scene: SCENE, kind: 'gold-open', trick: 'variable-reward', data: { by: model.unlockedBy ?? '' } });
      await countTo(model.points);
      await pal.say(gendered(profile, CHEST.afterGold, CHEST.afterGoldFem));
      finish();
    }

    function finish(): void {
      if (!alive) return;
      profile.points = (profile.points ?? 0) + model.points;
      void pal.tapToContinue().then(() => {
        if (alive) done();
      });
    }

    void (async () => {
      await pal.say(CHEST.intro);
    })();

    return () => {
      alive = false;
      stage.replaceChildren();
    };
  },
};
