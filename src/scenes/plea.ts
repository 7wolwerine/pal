import { FEMININE, PLEA, type NeedKey } from '../content/plea.ts';
import { lean, type GameScene } from '../game.ts';
import { h } from '../ui/dom.ts';
import { ANOMALY_TEXT } from '../content/anomalies.ts';
import { anomaly } from '../ui/anomaly.ts';
import { PleaFlow, makeCode, sameCode, type PleaChoice } from './plea-model.ts';

const SCENE = 'plea';

/**
 * The romance-scam heart of the game. The assistant, looking sad, hesitates,
 * confesses a small need, disarms the obvious suspicion with a joke, and
 * whatever the player answers, they end up helping — by reading out the
 * code from a text message that confirms an order in the assistant's name.
 * The message and code are fake; nothing leaves the page.
 */
export const plea: GameScene = {
  id: SCENE,
  mount(ctx, done) {
    const { pal, profile, stage, witness } = ctx;
    let alive = true;
    const look = profile.assistantLook ?? 'pal';
    const fem = FEMININE.has(look);
    const needKey: NeedKey = look in PLEA.need ? (look as NeedKey) : 'pal';
    const need = PLEA.need[needKey];
    const flow = new PleaFlow();
    let sms: HTMLElement | null = null;
    let stopAnomaly = (): void => undefined;

    /** Says a line and waits for a click on the bubble before going on. */
    async function line(text: string): Promise<void> {
      await pal.say(text);
      if (alive) await pal.tapToContinue();
    }

    async function run(): Promise<void> {
      // Embarrassed to ask, and sad about it.
      pal.setLookMood('sad');
      await pal.say(PLEA.hesitate(profile.name ?? ''));
      if (!alive) return;
      const opener = await choose(PLEA.openers.map((o) => ({ label: o.label, value: o.role })));
      if (!alive) return;
      lean(profile, opener);
      witness.record({ scene: SCENE, kind: 'plea-opener', trick: 'role-casting', data: { role: opener } });
      stage.replaceChildren();
      await line(need.line);
      if (!alive) return;
      await line(PLEA.disarm(fem));
      if (!alive) return;
      await pal.say(PLEA.ask);
      if (!alive) return;

      // Three answers, one outcome.
      while (alive && !flow.helped) {
        const choice = await askChoice(flow.worn);
        if (!alive) return;
        lean(profile, choice === 'expert' ? 'fixer' : choice === 'yes' ? 'helper' : 'loner');
        if (flow.choose(choice) === 'hurt') {
          witness.record({ scene: SCENE, kind: 'plea-refused', data: { n: flow.refusals } });
          stage.replaceChildren();
          await line(PLEA.hurt(fem)[flow.refusals - 1] ?? '');
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
      pal.setLookMood('happy');
      await line(how === 'expert' ? PLEA.thanksExpert(fem) : how === 'gave-in' ? PLEA.thanksGaveIn(fem) : PLEA.thanksYes);
      if (!alive) return;

      // The "small favour": read out the code from the text message.
      await pal.say(PLEA.login);
      if (!alive) return;
      const code = makeCode();
      const order = `26-${Math.floor(10000 + Math.random() * 89999)}`;
      showSms(code, order);
      const askedAt = performance.now();
      await askCode(code);
      if (!alive) return;
      witness.record({
        scene: SCENE,
        kind: 'otp-shared',
        trick: 'otp-scam',
        data: { ms: Math.round(performance.now() - askedAt), item: need.item, price: need.price },
      });
      sms?.classList.add('sms--gone');
      stage.replaceChildren();
      await line(need.thanks);
      if (alive) done();
    }

    function choose<T>(options: readonly { label: string; value: T }[]): Promise<T> {
      return new Promise((resolve) => {
        const buttons = options.map((o, i) =>
          h('button', {
            class: `btn plea__choice${i > 0 ? ' btn--quiet' : ''}`,
            text: o.label,
            attrs: { type: 'button' },
            on: { click: () => resolve(o.value) },
          }),
        );
        stage.replaceChildren(h('div', { class: 'plea__choices' }, ...buttons));
        buttons[0]?.focus();
      });
    }

    function askChoice(worn: boolean): Promise<PleaChoice> {
      return choose<PleaChoice>([
        { label: PLEA.choices.expert, value: 'expert' },
        { label: PLEA.choices.yes, value: 'yes' },
        { label: worn ? PLEA.giveIn : PLEA.choices.no, value: 'no' },
      ]);
    }

    /** A phone message in the middle of the screen: a shop asking to confirm an order. */
    function showSms(code: string, order: string): void {
      sms = h(
        'div',
        { class: 'sms', attrs: { role: 'status', 'aria-label': 'Nová zpráva' } },
        h('div', { class: 'sms__head' }, h('span', { class: 'sms__app', text: PLEA.smsApp }), h('span', { text: PLEA.smsTime })),
        h('strong', { class: 'sms__from', text: need.shop }),
        h('p', { class: 'sms__text', text: PLEA.sms(need, code, order) }),
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
          stopAnomaly();
          resolve();
        });
        stage.replaceChildren(form);
        input.focus();
        const bubble = ctx.window.el.querySelector<HTMLElement>('.pal__bubble');
        if (bubble) {
          stopAnomaly = anomaly(witness, bubble, {
            what: 'impatient',
            scene: SCENE,
            text: ANOMALY_TEXT.impatient,
            className: 'anomaly--impatient',
            place: { left: '0', top: '0', right: '0', bottom: '0' },
            after: 8000,
            ms: 900,
          });
        }
      });
    }

    void run();
    return () => {
      alive = false;
      stopAnomaly();
      sms?.remove();
      pal.setLookMood('happy');
      stage.replaceChildren();
    };
  },
};
