import { DONTCLICK } from '../content/dontclick.ts';
import type { GameScene } from '../game.ts';
import { BUG_PX, Beetle } from '../ui/beetle.ts';
import { h, sleep } from '../ui/dom.ts';
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
    const guardText = h('span', { text: DONTCLICK.guardOn });
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
    beetle.jump(...guardSpot());
    beetle.say(DONTCLICK.bugGuard);

    const leaveTimer = window.setTimeout(() => {
      if (!alive || finished) return;
      const leave = h('button', { class: 'btn btn--quiet', text: DONTCLICK.leave, attrs: { type: 'button' }, on: { click: leaveAlone } });
      actions.replaceChildren(leave);
    }, LEAVE_AFTER_MS);

    async function intro(): Promise<void> {
      for (const line of DONTCLICK.intro) {
        if (!alive || model.presses > 0) return;
        await pal.say(line);
        await sleep(900);
      }
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

    /** BUG scolds the player, then climbs up and hangs the button back on its nail. */
    async function rehang(i: number): Promise<void> {
      void pal.say(DONTCLICK.palPress[i] ?? '');
      await beetle.moveTo(...besideFallen());
      if (!alive) return;
      const angry = i >= 2;
      beetle.setMood(angry ? 'angry' : 'panic');
      beetle.say(DONTCLICK.bugRehang[i] ?? '');
      if (angry) await beetle.stomp(2);
      await sleep(angry ? 900 : 1100);
      if (!alive) return;
      beetle.say('');
      beetle.setMood('stand');
      const climb = beetle.moveTo(...atNail());
      await sleep(180);
      hang.classList.remove('dontclick__hang--fallen');
      await climb;
      await sleep(250);
      if (!alive) return;
      await beetle.moveTo(...guardSpot());
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
      window.clearTimeout(leaveTimer);
      beetle.stop();
      stage.replaceChildren();
    };
  },
};
