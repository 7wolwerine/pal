import { CONTRACT, CONTRACT_WORDS, EGG, FIDGETS, QUIZ } from '../../content/fidgets.ts';
import type { GameContext } from '../../game.ts';
import { h } from '../../ui/dom.ts';

const SCENE = 'fidgets';
const ANSWER_MAX_LENGTH = 40;
const SEQUENCE_LENGTH = 5;
const LAMP_COUNT = 4;
/** How close to the bottom of the contract counts as having reached its end. */
const END_SLACK_PX = 12;

/**
 * Four questions with a right answer and one about the player, handed in
 * together. Answers to the trivia are not kept: only the personal one matters.
 */
export function quiz(ctx: GameContext): Promise<void> {
  return new Promise((resolve) => {
    const shownAt = performance.now();
    const error = h('p', { class: 'error', attrs: { role: 'alert' } });
    const inputs = QUIZ.map((question) => {
      const input = h('input', {
        class: 'field field--small',
        attrs: {
          type: 'text',
          id: `quiz-${question.id}`,
          maxlength: String(ANSWER_MAX_LENGTH),
          autocomplete: 'off',
          spellcheck: 'false',
        },
      });
      input.addEventListener('input', () => {
        error.textContent = '';
      });
      return { question, input };
    });

    const form = h(
      'form',
      { class: 'quiz', attrs: { novalidate: '' } },
      ...inputs.map(({ question, input }) =>
        h('div', { class: 'quiz__row' }, h('label', { text: question.label, attrs: { for: input.id } }), input),
      ),
      h('button', { class: 'btn btn--go', text: FIDGETS.quizSubmit, attrs: { type: 'submit' } }),
      error,
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const missing = inputs.find(({ input }) => !input.value.trim());
      if (missing) {
        error.textContent = FIDGETS.quizIncomplete;
        missing.input.focus();
        return;
      }
      ctx.witness.record({
        scene: SCENE,
        kind: 'form',
        trick: 'smuggled-question',
        data: { fields: inputs.length, ms: Math.round(performance.now() - shownAt) },
      });
      for (const { question, input } of inputs) {
        if (!question.personal) continue;
        ctx.witness.disclose(SCENE, 'smuggled-question', question.id, input.value.trim().slice(0, ANSWER_MAX_LENGTH));
      }
      resolve();
    });

    ctx.stage.replaceChildren(form);
    inputs[0]?.input.focus();
  });
}

/** Whatever lights up, click it. A few rounds are enough to make it a reflex. */
export function sequence(ctx: GameContext, random: () => number = Math.random): Promise<void> {
  return new Promise((resolve) => {
    const shownAt = performance.now();
    let wrong = 0;
    let done = 0;
    let lit = Math.floor(random() * LAMP_COUNT);

    const lamps = Array.from({ length: LAMP_COUNT }, (_, index) => {
      const lamp = h('button', {
        class: 'lampbtn',
        attrs: { type: 'button', 'aria-label': `${FIDGETS.sequenceLabel} ${index + 1}` },
      });
      lamp.addEventListener('click', () => press(index, lamp));
      return lamp;
    });

    const show = (): void => {
      lamps.forEach((lamp, index) => {
        lamp.classList.toggle('lit', index === lit);
        lamp.setAttribute('aria-pressed', String(index === lit));
      });
    };

    function press(index: number, lamp: HTMLElement): void {
      if (index !== lit) {
        wrong++;
        lamp.classList.remove('lampbtn--nope');
        void lamp.offsetWidth;
        lamp.classList.add('lampbtn--nope');
        return;
      }
      done++;
      if (done >= SEQUENCE_LENGTH) {
        ctx.witness.record({
          scene: SCENE,
          kind: 'conditioned',
          trick: 'conditioning',
          data: { clicks: done, wrong, ms: Math.round(performance.now() - shownAt) },
        });
        resolve();
        return;
      }
      // Always move to a different lamp, so every step is visible.
      lit = (lit + 1 + Math.floor(random() * (LAMP_COUNT - 1))) % LAMP_COUNT;
      show();
    }

    show();
    ctx.stage.replaceChildren(h('div', { class: 'lamps' }, ...lamps));
  });
}

/**
 * A document nobody reads, and the word that lights up at its end exactly the
 * way the lamps just did. One word in the text can be clicked: the only place
 * in this scene where paying attention is rewarded.
 */
export function contract(ctx: GameContext): Promise<void> {
  return new Promise((resolve) => {
    const shownAt = performance.now();
    let eggFound = false;

    const egg = h('button', { class: 'doc__egg', text: 'brouk', attrs: { type: 'button' } });
    egg.addEventListener('click', () => {
      if (eggFound) return;
      eggFound = true;
      egg.classList.add('doc__egg--found');
      ctx.witness.record({ scene: SCENE, kind: 'vigilance', data: { what: 'contract-word' } });
    });

    const agree = h('button', { class: 'agree', text: FIDGETS.contractAgree, attrs: { type: 'button' } });
    agree.addEventListener('click', () => {
      ctx.witness.record({
        scene: SCENE,
        kind: 'consent',
        trick: 'blind-consent',
        data: { words: CONTRACT_WORDS, ms: Math.round(performance.now() - shownAt), egg: eggFound },
      });
      resolve();
    });

    const doc = h(
      'div',
      { class: 'doc', attrs: { tabindex: '0', role: 'document', 'aria-label': FIDGETS.contractTitle } },
      ...CONTRACT.map((paragraph) => {
        const [before, after] = paragraph.split(EGG);
        return after === undefined ? h('p', { text: paragraph }) : h('p', {}, before, egg, after);
      }),
      agree,
    );

    // The word lights up once the end of the document has actually been reached.
    // Plain scroll arithmetic: an IntersectionObserver at threshold 1 can miss
    // by a fraction of a pixel and then never fires.
    const lightUpAtEnd = (): void => {
      if (doc.scrollTop + doc.clientHeight >= doc.scrollHeight - END_SLACK_PX) agree.classList.add('lit');
    };
    doc.addEventListener('scroll', lightUpAtEnd, { passive: true });

    ctx.stage.replaceChildren(h('div', {}, h('p', { class: 'doc__title', text: FIDGETS.contractTitle }), doc));
    // Covers a screen tall enough to show the whole document without scrolling.
    requestAnimationFrame(lightUpAtEnd);
  });
}
