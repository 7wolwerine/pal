import { audio } from '../../audio/engine.ts';
import { FIDGETS } from '../../content/fidgets.ts';
import type { Scene } from '../../core/director.ts';
import { gendered, lean, type GameContext } from '../../game.ts';
import { h, sleep } from '../../ui/dom.ts';
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

    async function run(): Promise<void> {
      await pal.say(FIDGETS.remark);
      if (signal.aborted) return;
      // Developing the lock: `?skip=tidy` starts there. Stripped from the build.
      const skipTidy = import.meta.env.DEV && new URLSearchParams(location.search).get('skip') === 'tidy';
      if (!skipTidy) await tidy(ctx, signal);
      if (signal.aborted) return;

      // Something clicks open. PAL is as surprised as anyone.
      stage.replaceChildren();
      audio.latch();
      pal.exclaim();
      await sleep(700);
      if (signal.aborted) return;
      await pal.say(FIDGETS.quizIntro);
      if (signal.aborted) return;
      const food = await quiz(ctx);
      if (signal.aborted) return;

      stage.replaceChildren();
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

      stage.replaceChildren();
      audio.latch();
      await pal.say(FIDGETS.contractIntro);
      if (signal.aborted) return;
      await contract(ctx);
      if (signal.aborted) return;

      stage.replaceChildren();
      audio.latch();
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
      await pal.say(FIDGETS.release(gendered(profile, 'm', 'f') === 'm'));
      if (signal.aborted) return;

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
      stage.replaceChildren(h('div', { class: 'row row--wrap' }, ...choices));
      choices[0]?.focus();
    }

    void run();
    return () => {
      abort.abort();
      stage.replaceChildren();
    };
  },
};
