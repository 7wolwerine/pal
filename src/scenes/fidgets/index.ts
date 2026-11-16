import { audio } from '../../audio/engine.ts';
import { FIDGETS } from '../../content/fidgets.ts';
import type { Scene } from '../../core/director.ts';
import { kindlyAsked, kindlyObeyed } from '../../core/kindly.ts';
import { gendered, lean, type GameContext } from '../../game.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { contract, quiz, sequence } from './lock.ts';
import { tidy } from './tidy.ts';

const SCENE = 'fidgets';

/**
 * Scene 1, "Rozházená hejblátka". The player tidies a panel nobody asked them
 * to tidy, keeps at it while BUG puts things wrong again, then answers a few
 * questions, solves a little light puzzle and agrees to a document, all to
 * free the assistant, who thanks them as a rescuer. Every step is a small yes
 * that makes the next one easier.
 */
export const fidgets: Scene<GameContext> = {
  id: SCENE,
  mount(ctx, done) {
    const abort = new AbortController();
    const { signal } = abort;
    const { pal, profile, stage, witness } = ctx;
    // The panel and the questions need the whole window: PAL, the conversation and the
    // trust badges step aside, and PAL's lines pop up as a bubble of their own above it.
    const focus = (on: boolean): void => {
      const screen = ctx.window.el.parentElement;
      ctx.window.el.classList.toggle('win--focus', on);
      pal.el.classList.toggle('pal--float', on);
      if (on && screen) screen.append(pal.el);
      else if (!on && pal.el.parentElement !== ctx.window.body) ctx.window.body.prepend(pal.el);
    };
    focus(true);

    // Between the steps the stage empties while PAL talks. So that PAL's window does not
    // shrink and grow again every time, the stage keeps the tallest height it has had.
    let held = 0;
    const clear = (): void => {
      held = Math.max(held, stage.offsetHeight);
      stage.style.minHeight = `${held}px`;
      stage.classList.add('stage--held');
      stage.replaceChildren();
    };

    // When a step needs more room than the last (the quiz on a phone), the stage grows
    // smoothly instead of snapping the window taller.
    let lastHeight = 0;
    let growing: Animation | undefined;
    const smooth = new ResizeObserver(() => {
      const now = stage.offsetHeight;
      if (!growing && lastHeight > 0 && now > lastHeight + 4 && !prefersReducedMotion()) {
        stage.style.overflow = 'hidden';
        growing = stage.animate([{ height: `${lastHeight}px` }, { height: `${now}px` }], { duration: 360, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });
        const settle = (): void => {
          growing = undefined;
          stage.style.overflow = '';
          lastHeight = stage.offsetHeight;
        };
        growing.finished.then(settle, settle);
        return;
      }
      if (!growing) lastHeight = now;
    });
    smooth.observe(stage);

    async function run(): Promise<void> {
      await pal.say(FIDGETS.remark);
      if (signal.aborted) return;
      // Developing the lock: `?skip=tidy` starts there. Stripped from the build.
      const skipTidy = import.meta.env.DEV && new URLSearchParams(location.search).get('skip') === 'tidy';
      if (!skipTidy) await tidy(ctx, signal);
      if (signal.aborted) return;

      // Something clicks open. PAL is as surprised as anyone.
      clear();
      audio.latch();
      pal.exclaim();
      await sleep(700);
      if (signal.aborted) return;
      await pal.say(FIDGETS.quizIntro);
      if (signal.aborted) return;
      const food = await quiz(ctx);
      if (signal.aborted) return;

      clear();
      if (food) {
        await pal.say(FIDGETS.foodPraise(food));
        if (signal.aborted) return;
        await sleep(900);
        if (signal.aborted) return;
      }
      await pal.say(FIDGETS.sequenceIntro);
      if (signal.aborted) return;
      await sequence(ctx);
      if (signal.aborted) return;

      clear();
      audio.latch();
      await pal.say(FIDGETS.contractIntro);
      kindlyAsked(witness, SCENE);
      if (signal.aborted) return;
      await contract(ctx);
      if (signal.aborted) return;
      kindlyObeyed(witness, SCENE);

      clear();
      audio.latch();
      // PAL comes back into the window for the big moment.
      focus(false);
      // Out of the safe, PAL finally becomes who the player made them.
      if (profile.assistantLook) pal.setAvatar(profile.assistantLook);
      pal.setCaged(false);
      // From here on, trying to close the window pulls at the heartstrings.
      profile.bonded = true;
      if (profile.assistantName) {
        pal.setName(profile.assistantName);
        ctx.window.setTitle(`PAL · ${profile.assistantName}`);
      }
      await sleep(500);
      if (signal.aborted) return;
      for (const line of FIDGETS.release(gendered(profile, 'm', 'f') === 'm')) {
        await pal.say(line);
        if (signal.aborted) return;
        await sleep(900);
        if (signal.aborted) return;
      }

      // Every answer accepts the role of rescuer; which one says what kind.
      const choices = FIDGETS.releaseChoices.map((choice, index) =>
        h('button', {
          class: index === 0 ? 'btn' : 'btn btn--quiet',
          text: choice.label,
          attrs: { type: 'button' },
          on: {
            click: () => {
              lean(profile, choice.role);
              witness.record({ scene: SCENE, kind: 'role', trick: 'role-casting', data: { answer: choice.label } });
              done();
            },
          },
        }),
      );
      // PAL's long thanks needs the room now: the stage lets go of its height.
      stage.style.minHeight = '';
      stage.classList.remove('stage--held');
      stage.replaceChildren(h('div', { class: 'row row--wrap release__choices' }, ...choices));
      choices[0]?.focus();
    }

    void run();
    return () => {
      abort.abort();
      focus(false);
      smooth.disconnect();
      growing?.cancel();
      stage.style.overflow = '';
      stage.replaceChildren();
      stage.style.minHeight = '';
      stage.classList.remove('stage--held');
    };
  },
};
