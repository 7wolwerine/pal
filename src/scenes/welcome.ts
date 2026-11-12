import type { Scene } from '../core/director.ts';
import type { GameContext } from '../game.ts';
import { ASSISTANT_KINDS, NAME_MAX_LENGTH, WELCOME, type AssistantKind } from '../content/welcome.ts';
import { h, sleep } from '../ui/dom.ts';
import { livingSprite } from '../ui/sprites.ts';
import { PAL_DISMISSES } from '../content/bug.ts';
import { ROLES, ROLE_QUESTION, type RoleId } from '../content/roles.ts';
import { bugWarns } from '../ui/bug-cameo.ts';

const SCENE = 'welcome';

interface Answer<T> {
  readonly value: T;
  /** How long the player took to answer, in milliseconds. */
  readonly ms: number;
}

/**
 * Rapport building. Three friendly questions, each a little more personal
 * than the last, and none of them explained.
 */
export const welcome: Scene<GameContext> = {
  id: SCENE,
  mount(ctx, done) {
    let alive = true;
    const { pal, profile, stage, witness } = ctx;

    const step = (n: number) =>
      witness.record({ scene: SCENE, kind: 'step', trick: 'foot-in-the-door', data: { n } });

    async function run(): Promise<void> {
      // PAL boots up neutral, notices the player with a sparkle, then smiles.
      pal.setMood('neutral');
      await sleep(600);
      if (!alive) return;
      pal.noticeYou();
      pal.setMood('happy');
      await sleep(260);
      if (!alive) return;
      await pal.blinkThenSay(WELCOME.greeting);
      if (!alive) return;
      await pal.tapToContinue();
      if (!alive) return;
      await pal.say(WELCOME.askName);
      if (!alive) return;
      // BUG begs the player not to give a name; PAL laughs it off and asks again, sweeter.
      let named = false;
      void bugWarns(ctx, ctx.window.el, 'welcome', { side: 'right' }).then(() => {
        if (alive && !named) void pal.say(PAL_DISMISSES.welcome);
      });
      const name = await askText(stage, {
        placeholder: WELCOME.namePlaceholder,
        submit: WELCOME.nameSubmit,
        empty: WELCOME.nameEmpty,
        autocomplete: 'given-name',
      });
      named = true;
      if (!alive) return;
      profile.name = name.value;
      witness.disclose(SCENE, 'rapport', 'name', name.value, { ms: name.ms });
      step(1);

      // Role casting: an innocent "what type are you", praised and remembered.
      stage.replaceChildren();
      await pal.say(ROLE_QUESTION);
      if (!alive) return;
      const role = await askRole(stage);
      if (!alive) return;
      profile.role = role;
      witness.disclose(SCENE, 'role-casting', 'role', ROLES[role].label);
      stage.replaceChildren();
      await pal.say(ROLES[role].affirm);
      if (!alive) return;
      await sleep(700);
      if (!alive) return;

      stage.replaceChildren();
      await pal.say(WELCOME.askLook(name.value));
      if (!alive) return;
      const look = await askLook(stage);
      if (!alive) return;
      // PAL stays a caged smiley for now and only promises to look like this.
      profile.assistantLook = look.value.id;
      witness.disclose(SCENE, 'security-question', 'assistantKind', look.value.label, { ms: look.ms });
      step(2);

      stage.replaceChildren();
      await pal.say(WELCOME.lookPromise);
      if (!alive) return;
      await sleep(900);
      if (!alive) return;
      await pal.say(WELCOME.slip, 42);
      if (!alive) return;
      await pal.glitch();
      if (!alive) return;
      await pal.say(WELCOME.askOwnName);
      if (!alive) return;
      const own = await askOwnName(stage, look.value);
      if (!alive) return;
      witness.disclose(SCENE, 'osint', 'assistantName', own.value.name, {
        ms: own.ms,
        custom: own.value.custom,
      });
      profile.assistantName = own.value.name;
      step(3);

      stage.replaceChildren();
      await pal.say(WELCOME.thanks(own.value.name, name.value));
      if (!alive) return;
      await sleep(250);
      if (!alive) return;
      const go = h('button', { class: 'btn', text: WELCOME.go, attrs: { type: 'button' }, on: { click: done } });
      stage.replaceChildren(go);
      go.focus();
    }

    void run();
    return () => {
      alive = false;
      stage.replaceChildren();
    };
  },
};

interface TextQuestion {
  readonly placeholder: string;
  readonly submit: string;
  readonly empty: string;
  readonly autocomplete?: string;
}

/** A required one-line text answer. Returns the form so callers can add to it. */
function textForm(question: TextQuestion, resolve: (answer: Answer<string>) => void): HTMLFormElement {
  const shownAt = performance.now();
  const input = h('input', {
    class: 'field',
    attrs: {
      type: 'text',
      maxlength: String(NAME_MAX_LENGTH),
      placeholder: question.placeholder,
      'aria-label': question.placeholder,
      autocomplete: question.autocomplete ?? 'off',
      autocapitalize: 'words',
      spellcheck: 'false',
    },
  });
  const error = h('p', { class: 'error', attrs: { role: 'alert' } });
  input.addEventListener('input', () => {
    error.textContent = '';
  });
  const form = h(
    'form',
    { attrs: { novalidate: '' } },
    h('div', { class: 'row' }, input, h('button', { class: 'btn', text: question.submit, attrs: { type: 'submit' } })),
    error,
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim().slice(0, NAME_MAX_LENGTH);
    if (!value) {
      error.textContent = question.empty;
      input.focus();
      return;
    }
    resolve({ value, ms: Math.round(performance.now() - shownAt) });
  });
  return form;
}

function askText(stage: HTMLElement, question: TextQuestion): Promise<Answer<string>> {
  return new Promise((resolve) => {
    const form = textForm(question, resolve);
    stage.replaceChildren(form);
    form.querySelector('input')?.focus();
  });
}

function askRole(stage: HTMLElement): Promise<RoleId> {
  return new Promise((resolve) => {
    const ids = Object.keys(ROLES) as RoleId[];
    const buttons = ids.map((id) =>
      h('button', { class: 'btn btn--quiet role', text: ROLES[id].label, attrs: { type: 'button' }, on: { click: () => resolve(id) } }),
    );
    stage.replaceChildren(h('div', { class: 'roles' }, ...buttons));
    buttons[0]?.focus();
  });
}

function askLook(stage: HTMLElement): Promise<Answer<AssistantKind>> {
  return new Promise((resolve) => {
    const shownAt = performance.now();
    const picks = ASSISTANT_KINDS.map((kind) =>
      h(
        'button',
        {
          class: 'pick',
          attrs: { type: 'button' },
          on: { click: () => resolve({ value: kind, ms: Math.round(performance.now() - shownAt) }) },
        },
        livingSprite(kind.id),
        h('span', { text: kind.label }),
      ),
    );
    stage.replaceChildren(h('div', { class: 'picks' }, ...picks));
  });
}

function askOwnName(
  stage: HTMLElement,
  kind: AssistantKind,
): Promise<Answer<{ name: string; custom: boolean }>> {
  return new Promise((resolve) => {
    const shownAt = performance.now();
    const presets = kind.names.map((name) =>
      h('button', {
        class: 'btn btn--quiet',
        text: name,
        attrs: { type: 'button' },
        on: {
          click: () =>
            resolve({ value: { name, custom: false }, ms: Math.round(performance.now() - shownAt) }),
        },
      }),
    );
    const form = textForm(
      { placeholder: WELCOME.ownNamePlaceholder, submit: WELCOME.ownNameSubmit, empty: WELCOME.ownNameEmpty },
      (answer) => resolve({ value: { name: answer.value, custom: true }, ms: answer.ms }),
    );
    stage.replaceChildren(h('div', {}, h('div', { class: 'names' }, ...presets), form));
  });
}
