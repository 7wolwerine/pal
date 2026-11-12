import { FEMININE, PLEA, type NeedKey } from '../content/plea.ts';
import type { GameScene } from '../game.ts';
import { h, sleep } from '../ui/dom.ts';
import { PleaFlow, makeCode, sameCode, type PleaChoice } from './plea-model.ts';

const SCENE = 'plea';

/**
 * The romance-scam heart of the game. The assistant hesitates, confesses a
 * small need, disarms the obvious suspicion ("I would never ask you for
 * money"), and whatever the player answers, they end up helping — by reading
 * out the one-time code from a text message that says never to share it.
 * The message and code are fake; nothing leaves the page.
 */
export const plea: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, profile, stage, witness } = ctx;
    let alive = true;
    const look = profile.assistantLook ?? 'pal';
    const fem = FEMININE.has(look);
    const flow = new PleaFlow();
    let sms: HTMLElement | null = null;

    async function run(): Promise<void> {
      // Embarrassed to ask: it starts, takes it back, and waits to be coaxed.
      await pal.say(PLEA.hesitate(profile.name ?? ''));
      if (!alive) return;
      await waitButton(PLEA.whatsUp);
      if (!alive) return;
      const needKey: NeedKey = look in PLEA.need ? (look as NeedKey) : 'pal';
      await pal.say(PLEA.need[needKey]);
      if (!alive) return;
      await sleep(700);
      if (!alive) return;
      await pal.say(PLEA.disarm(fem));
      if (!alive) return;
      await sleep(600);
      if (!alive) return;
      await pal.say(PLEA.ask);
      if (!alive) return;

      // Three answers, one outcome.
      while (alive && !flow.helped) {
        const choice = await askChoice(flow.worn);
        if (!alive) return;
        if (flow.choose(choice) === 'hurt') {
          witness.record({ scene: SCENE, kind: 'plea-refused', data: { n: flow.refusals } });
          stage.replaceChildren();
          await pal.say(PLEA.hurt(fem)[flow.refusals - 1] ?? '');
          if (!alive) return;
          await sleep(500);
          if (!alive) return;
          await pal.say(PLEA.ask);
        }
      }
      if (!alive) return;
      const how = flow.helped;
      witness.record({
        scene: SCENE,
        kind: 'plea-choice',
        trick: 'romance-scam',
        data: { how: how ?? '', refusals: flow.refusals },
      });
      stage.replaceChildren();
      await pal.say(how === 'expert' ? PLEA.thanksExpert(fem) : how === 'gave-in' ? PLEA.thanksGaveIn(fem) : PLEA.thanksYes);
      if (!alive) return;
      await sleep(600);
      if (!alive) return;

      // The "small favour": read out the code from the text message.
      await pal.say(PLEA.login);
      if (!alive) return;
      const code = makeCode();
      showSms(code);
      const askedAt = performance.now();
      await askCode(code);
      if (!alive) return;
      witness.record({
        scene: SCENE,
        kind: 'otp-shared',
        trick: 'otp-scam',
        data: { ms: Math.round(performance.now() - askedAt) },
      });
      sms?.classList.add('sms--gone');
      stage.replaceChildren();
      await pal.say(PLEA.done);
      if (!alive) return;
      const go = h('button', { class: 'btn', text: PLEA.go, attrs: { type: 'button' }, on: { click: done } });
      stage.replaceChildren(go);
      go.focus();
    }

    function waitButton(label: string): Promise<void> {
      return new Promise((resolve) => {
        const b = h('button', { class: 'btn btn--quiet', text: label, attrs: { type: 'button' }, on: { click: () => resolve() } });
        stage.replaceChildren(b);
        b.focus();
      });
    }

    function askChoice(worn: boolean): Promise<PleaChoice> {
      return new Promise((resolve) => {
        const make = (choice: PleaChoice, text: string, quiet = false): HTMLButtonElement =>
          h('button', {
            class: `btn plea__choice${quiet ? ' btn--quiet' : ''}`,
            text,
            attrs: { type: 'button' },
            on: { click: () => resolve(choice) },
          });
        const buttons = [
          make('expert', PLEA.choices.expert),
          make('yes', PLEA.choices.yes),
          make('no', worn ? PLEA.giveIn : PLEA.choices.no, true),
        ];
        stage.replaceChildren(h('div', { class: 'plea__choices' }, ...buttons));
        buttons[0]?.focus();
      });
    }

    /** A phone-style notification sliding in at the top of the screen. */
    function showSms(code: string): void {
      sms = h(
        'div',
        { class: 'sms', attrs: { role: 'status', 'aria-label': 'Nová zpráva' } },
        h('div', { class: 'sms__head' }, h('span', { class: 'sms__app', text: 'Zprávy' }), h('span', { text: PLEA.smsTime })),
        h('strong', { class: 'sms__from', text: PLEA.smsFrom }),
        h('p', { class: 'sms__text', text: PLEA.sms(code) }),
      );
      document.body.append(sms);
    }

    function askCode(code: string): Promise<void> {
      return new Promise((resolve) => {
        const input = h('input', {
          class: 'field',
          attrs: { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', placeholder: '000 000', 'aria-label': PLEA.codeLabel, maxlength: '9' },
        });
        const error = h('p', { class: 'error', attrs: { role: 'alert' } });
        const form = h(
          'form',
          { attrs: { novalidate: '' } },
          h('div', { class: 'row' }, input, h('button', { class: 'btn', text: PLEA.codeSubmit, attrs: { type: 'submit' } })),
          error,
        );
        input.addEventListener('input', () => {
          error.textContent = '';
        });
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          if (!sameCode(input.value, code)) {
            error.textContent = PLEA.codeWrong;
            input.focus();
            return;
          }
          resolve();
        });
        stage.replaceChildren(form);
        input.focus();
      });
    }

    void run();
    return () => {
      alive = false;
      sms?.remove();
      stage.replaceChildren();
    };
  },
};
