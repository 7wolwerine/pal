import { FIDGETS } from '../../content/fidgets.ts';
import type { Scene } from '../../core/director.ts';
import type { GameContext } from '../../game.ts';
import { h, sleep } from '../../ui/dom.ts';
import { contract, quiz, sequence } from './lock.ts';
import { tidy } from './tidy.ts';

const SCENE = 'fidgets';

/**
 * Scene 1, "Rozházená hejblátka". The player tidies a panel nobody asked them
 * to tidy, keeps at it while BUG undoes the work, then fills in a form, clicks
 * what lights up and agrees to a document, all to free the assistant, who
 * thanks them as a rescuer. Every step is a small yes that makes the next
 * one easier.
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
      await tidy(ctx, signal);
      if (signal.aborted) return;

      stage.replaceChildren();
      await pal.say(FIDGETS.quizIntro);
      if (signal.aborted) return;
      await quiz(ctx);
      if (signal.aborted) return;

      stage.replaceChildren();
      await pal.say(FIDGETS.sequenceIntro);
      if (signal.aborted) return;
      await sequence(ctx);
      if (signal.aborted) return;

      stage.replaceChildren();
      await pal.say(FIDGETS.contractIntro);
      if (signal.aborted) return;
      await contract(ctx);
      if (signal.aborted) return;

      stage.replaceChildren();
      // Out of the cage, PAL finally becomes who the player made them.
      if (profile.assistantLook) pal.setAvatar(profile.assistantLook);
      pal.setCaged(false);
      if (profile.assistantName) {
        pal.setName(profile.assistantName);
        ctx.window.setTitle(`PAL · ${profile.assistantName}`);
      }
      await sleep(500);
      if (signal.aborted) return;
      await pal.say(FIDGETS.release(profile.name ?? ''));
      if (signal.aborted) return;

      // Both answers accept the role of rescuer. There is no third one.
      const choices = FIDGETS.releaseChoices.map((label, index) =>
        h('button', {
          class: index === 0 ? 'btn' : 'btn btn--quiet',
          text: label,
          attrs: { type: 'button' },
          on: {
            click: () => {
              witness.record({ scene: SCENE, kind: 'role', trick: 'role-casting', data: { answer: label } });
              done();
            },
          },
        }),
      );
      stage.replaceChildren(h('div', { class: 'row' }, ...choices));
      choices[0]?.focus();
    }

    void run();
    return () => {
      abort.abort();
      stage.replaceChildren();
    };
  },
};
