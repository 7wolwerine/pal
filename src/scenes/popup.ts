import { POPUP } from '../content/popup.ts';
import type { GameScene } from '../game.ts';
import { h, prefersReducedMotion, sleep } from '../ui/dom.ts';

const SCENE = 'popup';

type Answer = 'reflex' | 'yes' | 'no';

/**
 * Muscle memory turned against the player. PAL asks them to close a popup;
 * the × in its corner is the button that shares. The sending is fake and
 * nothing leaves the page.
 */
export const popup: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, witness } = ctx;
    let alive = true;
    let answered = false;
    let shownAt = 0;
    let dialog: HTMLElement | null = null;

    async function run(): Promise<void> {
      await sleep(400);
      if (!alive) return;
      await pal.say(POPUP.palAsk);
      if (!alive) return;
      await sleep(300);
      if (!alive) return;
      dialog = buildDialog();
      // On <body>, not inside the window: the window keeps a transform after its
      // boot animation, which would trap a fixed element inside it.
      document.body.append(dialog);
      shownAt = performance.now();
    }

    function buildDialog(): HTMLElement {
      const close = h('button', {
        class: 'popup__x',
        text: '✕',
        attrs: { type: 'button', title: POPUP.closeTruth, 'aria-label': POPUP.closeTruth },
        on: { click: () => void answer('reflex') },
      });
      const yes = h('button', { class: 'btn popup__yes', text: POPUP.yes, attrs: { type: 'button' }, on: { click: () => void answer('yes') } });
      const no = h('button', { class: 'popup__no', text: POPUP.no, attrs: { type: 'button' }, on: { click: () => void answer('no') } });
      const status = h('p', { class: 'popup__status', attrs: { role: 'status' } });
      return h(
        'div',
        { class: 'popup', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'popup-title' } },
        h('div', { class: 'popup__bar' }, h('strong', { text: POPUP.title, attrs: { id: 'popup-title' } }), close),
        h('p', { class: 'popup__text', text: POPUP.text }),
        status,
        h('div', { class: 'popup__buttons' }, no, yes),
      );
    }

    async function answer(how: Answer): Promise<void> {
      if (answered || !dialog) return;
      answered = true;
      const ms = Math.round(performance.now() - shownAt);
      const box = dialog;
      box.querySelectorAll('button').forEach((b) => {
        b.disabled = true;
      });
      if (how === 'no') {
        witness.record({ scene: SCENE, kind: 'popup-no', data: { ms } });
        witness.record({ scene: SCENE, kind: 'vigilance', data: { what: 'inverted-popup' } });
        box.remove();
        await pal.say(POPUP.palAfterNo);
      } else {
        witness.record({ scene: SCENE, kind: how === 'reflex' ? 'reflex-close' : 'popup-yes', trick: 'muscle-memory', data: { ms } });
        await fakeShare(box);
        if (!alive) return;
        box.remove();
        await pal.say(how === 'reflex' ? POPUP.palAfterReflex : POPUP.palAfterYes);
      }
      if (!alive) return;
      const go = h('button', { class: 'btn', text: POPUP.go, attrs: { type: 'button' }, on: { click: done } });
      ctx.stage.replaceChildren(go);
      go.focus();
    }

    /** Theatre: a counter runs up to "shared with 312 partners". Nothing is sent. */
    async function fakeShare(box: HTMLElement): Promise<void> {
      const status = box.querySelector('.popup__status');
      if (!status) return;
      const steps = prefersReducedMotion() ? 1 : 24;
      for (let i = 1; i <= steps; i++) {
        status.textContent = POPUP.sending(Math.round((POPUP.partners * i) / steps), POPUP.partners);
        await sleep(50);
        if (!alive) return;
      }
      status.textContent = POPUP.sent(POPUP.partners);
      await sleep(1100);
    }

    ctx.stage.replaceChildren();
    void run();
    return () => {
      alive = false;
      dialog?.remove();
      ctx.stage.replaceChildren();
    };
  },
};
