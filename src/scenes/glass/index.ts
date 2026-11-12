import { audio } from '../../audio/engine.ts';
import { GLASS } from '../../content/glass.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { GLASS_RECT, SPLASH_MS, STAGE_H, STAGE_W, paintGlassScene } from './art.ts';
import { BOUNCE_AT, SETTLE_MS } from './model.ts';

const SCENE = 'glass';
/** If the player does not touch the glass, it slides off by itself. */
const SLIDE_AFTER_MS = 7000;

/**
 * A toast, and a glass that falls the wrong way: it bounces like rubber and
 * the water shatters. Right before the reveal, the first sign that the game's
 * world was staged all along.
 */
export const glass: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, GLASS.sceneLabel);
    const caption = h('p', { class: 'scene__caption', text: GLASS.toast, attrs: { 'aria-live': 'polite' } });
    const actions = h('div', { class: 'scene__actions' });
    ctx.scenery.replaceChildren(stage.el, caption, actions);

    let alive = true;
    let now = 0;
    let fallAt: number | undefined;

    const spot = stage.hotspot(GLASS_RECT, GLASS.label, () => fall(true));
    const slideTimer = window.setTimeout(() => fall(false), SLIDE_AFTER_MS);

    function fall(touched: boolean): void {
      if (fallAt !== undefined) return;
      fallAt = now;
      spot.hidden = true;
      window.clearTimeout(slideTimer);
      void play(touched);
    }

    async function play(touched: boolean): Promise<void> {
      if (motion) {
        // The sounds follow the motion: a boing on each bounce, a shatter for the water.
        const events = [
          ...BOUNCE_AT.map((at, i) => ({ at, sound: () => audio.boing(0.45 - i * 0.12) })),
          { at: SPLASH_MS, sound: () => audio.shatter() },
        ].sort((a, b) => a.at - b.at);
        let elapsed = 0;
        for (const e of events) {
          await sleep(e.at - elapsed);
          elapsed = e.at;
          if (!alive) return;
          e.sound();
        }
        await sleep(Math.max(0, SETTLE_MS - elapsed) + 700);
      } else {
        audio.boing();
        audio.shatter();
        await sleep(400);
      }
      if (!alive) return;
      ctx.witness.record({ scene: SCENE, kind: 'glass-bounced', trick: 'broken-physics', data: { touched } });
      caption.textContent = GLASS.after;
      const go = h('button', { class: 'btn', text: GLASS.go, attrs: { type: 'button' }, on: { click: done } });
      actions.replaceChildren(go);
      go.focus();
    }

    stage.run((g, t) => {
      now = t;
      paintGlassScene(g, t, fallAt, motion);
    });

    return () => {
      alive = false;
      window.clearTimeout(slideTimer);
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
