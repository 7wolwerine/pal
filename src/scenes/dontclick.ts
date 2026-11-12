import { DONTCLICK } from '../content/dontclick.ts';
import type { GameScene } from '../game.ts';
import { BUG_PX, Beetle } from '../ui/beetle.ts';
import { h, sleep } from '../ui/dom.ts';
import { anomaly } from '../ui/anomaly.ts';
import { DontClickModel } from './dontclick-model.ts';

const SCENE = 'dontclick';
/** Board geometry in CSS pixels; must match .board in app.css. */
const BOARD_H = 240;
const FLOOR_Y = BOARD_H - 8;
/** How long before the quiet way out appears. */
const LEAVE_AFTER_MS = 7000;

/**
 * A button on a nail that begs not to be pressed. PAL tells the player that
 * "they" hung it there because "they" do not trust the two of you; BUG, the
 * only one telling the truth, keeps hanging it back up. It is the last
 * safeguard, and enough presses switch it off. Leaving it alone is allowed —
 * almost nobody does.
 */
export const dontclick: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, stage, witness } = ctx;
    let alive = true;
    let busy = false;
    let finished = false;
    const model = new DontClickModel();
    const beetle = new Beetle();

    const label = h('span', { class: 'dontclick__label', text: model.label });
    const button = h('button', { class: 'dontclick', attrs: { type: 'button' } }, label);
    const hang = h(
      'div',
      { class: 'dontclick__hang' },
      h('span', { class: 'dontclick__string', attrs: { 'aria-hidden': 'true' } }),
      button,
    );
    const led = h('span', { class: 'guard__led', attrs: { 'aria-hidden': 'true' } });
    const guardText = h('span', { class: 'sr-only', text: DONTCLICK.guardOn });
    const guard = h('p', { class: 'guard', attrs: { role: 'status' } }, led, guardText);
    const board = h(
      'div',
      { class: 'board', attrs: { role: 'group', 'aria-label': DONTCLICK.boardLabel } },
      guard,
      h('span', { class: 'board__nail', attrs: { 'aria-hidden': 'true' } }),
      hang,
      h('span', { class: 'board__floor', attrs: { 'aria-hidden': 'true' } }),
      beetle.el,
    );
    const actions = h('div', { class: 'scene__actions' });
    stage.replaceChildren(board, actions);

    const width = (): number => board.clientWidth || 320;
    const guardSpot = (): [number, number] => [Math.min(width() - BUG_PX - 4, width() / 2 + 96), FLOOR_Y - BUG_PX];
    const besideFallen = (): [number, number] => [
      Math.min(width() - BUG_PX - 4, width() / 2 + button.offsetWidth / 2 + 6),
      FLOOR_Y - BUG_PX,
    ];
    const atNail = (): [number, number] => [width() / 2 - BUG_PX / 2, 22];
    const stopAnomaly = anomaly(witness, board, {
      what: 'led-flicker',
      scene: SCENE,
      className: 'anomaly--led',
      place: { left: '4px', top: '8px', width: '9px', height: '9px' },
      after: 2500,
      ms: 600,
    });
    beetle.jump(...guardSpot());
    beetle.say(DONTCLICK.bugGuard);

    const leaveTimer = window.setTimeout(() => {
      if (!alive || finished) return;
      const leave = h('button', { class: 'btn btn--quiet', text: DONTCLICK.leave, attrs: { type: 'button' }, on: { click: leaveAlone } });
      actions.replaceChildren(leave);
    }, LEAVE_AFTER_MS);

    async function intro(): Promise<void> {
      await pal.say(DONTCLICK.intro);
      await sleep(1200);
      if (alive && model.presses === 0) beetle.say('');
    }

    button.addEventListener('click', () => {
      if (busy || finished) return;
      busy = true;
      button.setAttribute('aria-disabled', 'true');
      const result = model.press();
      witness.record({ scene: SCENE, kind: 'forbidden-press', trick: 'reactance', data: { n: model.presses } });
      label.textContent = model.label;
      hang.classList.add('dontclick__hang--fallen');
      void (result === 'break' ? breakDown() : rehang(model.presses - 1));
    });

    /**
     * Everything happens right at the button, one thing at a time: BUG runs
     * over, grumbles and stamps, then hauls the button back up with real
     * effort. PAL says nothing meanwhile, so nothing competes for attention.
     */
    async function rehang(i: number): Promise<void> {
      await sleep(350);
      await beetle.moveTo(...besideFallen());
      if (!alive) return;
      beetle.grumble();
      await beetle.stomp(3);
      if (!alive) return;
      beetle.say(DONTCLICK.bugRehang[i] ?? '');
      beetle.setMood(i >= 1 ? 'angry' : 'panic');
      await sleep(1300);
      if (!alive) return;
      beetle.say('');
      await beetle.strain(900);
      if (!alive) return;
      const climb = beetle.moveTo(...atNail());
      await sleep(180);
      hang.classList.remove('dontclick__hang--fallen');
      await climb;
      await beetle.strain(600);
      if (!alive) return;
      beetle.setMood('stand');
      await beetle.moveTo(...guardSpot());
      beetle.grumble();
      await sleep(700);
      beetle.say('');
      busy = false;
      button.removeAttribute('aria-disabled');
    }

    /** The last press: the string snaps, the safeguard goes dark, BUG leaves. */
    async function breakDown(): Promise<void> {
      finished = true;
      window.clearTimeout(leaveTimer);
      actions.replaceChildren();
      hang.classList.add('dontclick__hang--broken');
      board.classList.add('board--unguarded');
      guardText.textContent = DONTCLICK.guardOff;
      witness.record({ scene: SCENE, kind: 'guard-off', trick: 'us-vs-them', data: { presses: model.presses } });
      await beetle.moveTo(...besideFallen());
      if (!alive) return;
      beetle.setMood('cry');
      beetle.say(DONTCLICK.bugLost);
      await sleep(1600);
      if (!alive) return;
      beetle.say('');
      beetle.setMood('sad');
      await beetle.moveTo(width() + 12, FLOOR_Y - BUG_PX);
      beetle.el.classList.add('bug--gone');
      if (!alive) return;
      await pal.say(DONTCLICK.palBroken);
      if (!alive) return;
      showGo();
    }

    /** The rare player who walks away. */
    function leaveAlone(): void {
      if (busy || finished) return;
      finished = true;
      witness.record({ scene: SCENE, kind: 'left-alone', data: { presses: model.presses } });
      button.setAttribute('aria-disabled', 'true');
      beetle.setMood('stand');
      beetle.say(DONTCLICK.bugThanks);
      actions.replaceChildren();
      void pal.say(DONTCLICK.palLeft).then(() => {
        if (alive) showGo();
      });
    }

    function showGo(): void {
      const go = h('button', { class: 'btn', text: DONTCLICK.go, attrs: { type: 'button' }, on: { click: done } });
      actions.replaceChildren(go);
      go.focus();
    }

    void intro();
    return () => {
      alive = false;
      stopAnomaly();
      window.clearTimeout(leaveTimer);
      beetle.stop();
      stage.replaceChildren();
    };
  },
};
