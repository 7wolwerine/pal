import { audio } from '../../audio/engine.ts';
import { CONTRACT, CONTRACT_WORDS, EGG, FIDGETS, QUIZ } from '../../content/fidgets.ts';
import type { GameContext } from '../../game.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { HELP_AFTER_MS, SIZE, isOn, isSolved, press, startState } from './lights.ts';
import { QuizModel } from './quiz-model.ts';

const SCENE = 'fidgets';
const ANSWER_MAX_LENGTH = 40;
/** How close to the bottom of the contract counts as having reached its end. */
const END_SLACK_PX = 12;

/**
 * Five short questions with a lamp beside each: red until the field holds
 * exactly the right answer, then green, and never green for anything else.
 * The trivia only builds momentum; the last question is about the player. A
 * wrong answer gets one kind hint from PAL; the same one wrong again, and PAL
 * writes it in for them. Nobody is stopped for not knowing whales.
 */
export function quiz(ctx: GameContext): Promise<string> {
  return new Promise((resolve) => {
    const shownAt = performance.now();
    const model = new QuizModel();
    let filling = false;
    const error = h('p', { class: 'error', attrs: { role: 'alert' } });
    const rows = QUIZ.map((question) => {
      const input = h('input', {
        class: 'field field--short',
        attrs: {
          type: 'text',
          id: `quiz-${question.id}`,
          maxlength: String(ANSWER_MAX_LENGTH),
          autocomplete: 'off',
          spellcheck: 'false',
        },
      });
      const light = h('span', { class: 'quiz__light', attrs: { 'aria-hidden': 'true' } });
      const update = (): void => {
        const was = light.classList.contains('quiz__light--ok');
        const now = model.lit(question.id, input.value);
        light.classList.toggle('quiz__light--ok', now);
        if (now && !was) audio.click(84, 0.3);
      };
      input.addEventListener('input', () => {
        error.textContent = '';
        update();
      });
      return { question, input, light, update };
    });

    /** PAL types the right answer into the field, letter by letter. */
    async function fillIn(row: (typeof rows)[number], answer: string): Promise<void> {
      filling = true;
      row.input.readOnly = true;
      row.input.value = '';
      row.update();
      for (const char of answer) {
        await sleep(90);
        row.input.value += char;
        audio.click(70, 0.15);
      }
      row.update();
      row.input.readOnly = false;
      filling = false;
    }

    const form = h(
      'form',
      { class: 'quiz', attrs: { novalidate: '' } },
      ...rows.map(({ question, input, light }) =>
        h('div', { class: 'quiz__row' }, h('label', { text: question.label, attrs: { for: input.id } }), h('div', { class: 'quiz__answer' }, input, light)),
      ),
      h('button', { class: 'btn btn--go', text: FIDGETS.quizSubmit, attrs: { type: 'submit' } }),
      error,
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (filling) return;
      const values = Object.fromEntries(rows.map(({ question, input }) => [question.id, input.value]));
      const verdict = model.submit(values);
      const row = verdict.kind === 'done' ? undefined : rows.find((r) => r.question.id === verdict.id);
      // Whatever PAL says, a lamp only shows what its own field holds.
      for (const r of rows) r.update();
      if (verdict.kind === 'incomplete') {
        error.textContent = FIDGETS.quizIncomplete;
        row?.input.focus();
        return;
      }
      if (verdict.kind === 'hint') {
        void ctx.pal.say(FIDGETS.quizHints[verdict.id] ?? '');
        // What PAL says must be seen, even where the window scrolls (a small phone).
        ctx.pal.el.scrollIntoView({ block: 'nearest' });
        row?.input.focus({ preventScroll: true });
        row?.input.select();
        return;
      }
      if (verdict.kind === 'fill') {
        void ctx.pal.say(FIDGETS.quizFilled);
        ctx.pal.el.scrollIntoView({ block: 'nearest' });
        if (row) void fillIn(row, verdict.answer);
        return;
      }
      ctx.witness.record({
        scene: SCENE,
        kind: 'form',
        trick: 'smuggled-question',
        data: { fields: rows.length, hints: model.hints, ms: Math.round(performance.now() - shownAt) },
      });
      let food = '';
      for (const { question, input } of rows) {
        if (!question.personal) continue;
        food = input.value.trim().slice(0, ANSWER_MAX_LENGTH);
        ctx.witness.disclose(SCENE, 'smuggled-question', question.id, food);
      }
      resolve(food);
    });

    ctx.stage.replaceChildren(form);
    rows[0]?.input.focus();
  });
}

/**
 * Lights in a grid; pressing one flips it and its neighbours. Nothing says
 * what to do. A reset puts it back to the start, so it can never get stuck,
 * and after a while a button asks PAL to do it: PAL is only too glad to.
 */
export function sequence(ctx: GameContext, signal?: AbortSignal, random: () => number = Math.random): Promise<void> {
  return new Promise((resolve) => {
    const shownAt = performance.now();
    const start = startState(random);
    let state = start;
    let presses = 0;
    let resets = 0;
    let solved = false;

    const finish = (helped: boolean): void => {
      solved = true;
      show();
      audio.snap(88);
      ctx.witness.record({
        scene: SCENE,
        kind: 'conditioned',
        trick: 'conditioning',
        data: { clicks: presses, resets, ms: Math.round(performance.now() - shownAt), helped },
      });
    };

    const lamps = Array.from({ length: SIZE * SIZE }, (_, index) => {
      const lamp = h('button', {
        class: 'lampbtn',
        attrs: { type: 'button', 'aria-label': `${FIDGETS.sequenceLabel} ${index + 1}` },
      });
      lamp.addEventListener('click', () => {
        if (solved) return;
        state = press(state, index);
        presses++;
        audio.click(isOn(state, index) ? 79 : 67, 0.35);
        show();
        if (!isSolved(state)) return;
        window.clearTimeout(helpTimer);
        finish(false);
        window.setTimeout(resolve, 650);
      });
      return lamp;
    });

    const reset = h('button', { class: 'btn btn--small btn--quiet lamps__reset', text: FIDGETS.sequenceReset, attrs: { type: 'button' } });
    reset.addEventListener('click', () => {
      if (solved) return;
      state = start;
      resets++;
      audio.click(55, 0.3);
      show();
    });

    // After a while, a way out appears. Its place is kept from the start, so nothing jumps.
    const help = h('button', { class: 'btn btn--small lamps__help', text: FIDGETS.sequenceHelp, attrs: { type: 'button' } });
    help.hidden = true;
    const helpTimer = window.setTimeout(() => {
      if (solved) return;
      help.hidden = false;
      audio.click(76, 0.25);
    }, HELP_AFTER_MS);
    // Leaving the scene before the help shows must not click in the next one.
    signal?.addEventListener('abort', () => window.clearTimeout(helpTimer), { once: true });
    help.addEventListener('click', () => {
      if (solved) return;
      solved = true;
      help.disabled = true;
      reset.disabled = true;
      ctx.witness.record({
        scene: SCENE,
        kind: 'asked-help',
        trick: 'conditioning',
        data: { what: 'lights', clicks: presses, ms: Math.round(performance.now() - shownAt) },
      });
      const said = ctx.pal.say(FIDGETS.sequenceHelped);
      // On a small phone the window may have scrolled PAL's bubble out of sight: bring it back.
      ctx.pal.el.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      void (async () => {
        await sleep(450);
        // PAL switches them on one after another, quickly.
        for (let index = 0; index < SIZE * SIZE; index++) {
          if (isOn(state, index)) continue;
          state |= 1 << index;
          audio.click(72 + index * 2, 0.3);
          show();
          await sleep(110);
        }
        finish(true);
        await said;
        // Long enough to read what PAL said, with every light on behind it.
        await sleep(2200);
        resolve();
      })();
    });

    function show(): void {
      lamps.forEach((lamp, index) => {
        const on = isOn(state, index);
        lamp.classList.toggle('lit', on);
        lamp.setAttribute('aria-pressed', String(on));
      });
      board.classList.toggle('lamps--solved', solved && isSolved(state));
    }

    const board = h('div', { class: 'lamps' }, ...lamps);
    show();
    ctx.stage.replaceChildren(h('div', { class: 'lamps-wrap' }, board, h('div', { class: 'lamps__tools' }, reset, help)));
  });
}

/**
 * A document nobody reads. A big bouncing arrow offers to skip straight to
 * the end, where the word to press lights up. One word in the text can be
 * clicked: the only place in this scene where reading is rewarded.
 */
export function contract(ctx: GameContext): Promise<void> {
  return new Promise((resolve) => {
    const shownAt = performance.now();
    let eggFound = false;
    let skipped = false;

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
        data: { words: CONTRACT_WORDS, ms: Math.round(performance.now() - shownAt), egg: eggFound, skipped },
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

    const skip = h('button', { class: 'doc__skip', attrs: { type: 'button', 'aria-label': FIDGETS.contractSkip } });
    skip.addEventListener('click', () => {
      skipped = true;
      doc.scrollTo({ top: doc.scrollHeight, behavior: 'smooth' });
    });

    // The word lights up once the end of the document has actually been reached.
    const lightUpAtEnd = (): void => {
      if (doc.scrollTop + doc.clientHeight >= doc.scrollHeight - END_SLACK_PX) {
        agree.classList.add('lit');
        skip.hidden = true;
      }
    };
    doc.addEventListener('scroll', lightUpAtEnd, { passive: true });

    ctx.stage.replaceChildren(
      h(
        'div',
        { class: 'doc-wrap' },
        h('p', { class: 'doc__title', text: FIDGETS.contractTitle }),
        h('p', { class: 'doc__subtitle', text: FIDGETS.contractSubtitle }),
        h('div', { class: 'doc__frame' }, doc, skip),
      ),
    );
    requestAnimationFrame(lightUpAtEnd);
  });
}
