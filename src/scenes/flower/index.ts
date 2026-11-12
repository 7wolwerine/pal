import { FLOWER } from '../../content/flower.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { BUBBLE_RECT, CAN_RECT, DOME_RECT, FLOWER_RECT, GROW_MS, STAGE_H, STAGE_W, WATER_MS, paintFlower } from './art.ts';
import { FlowerModel } from './model.ts';

const SCENE = 'flower';
/** How long before the quiet way out appears. */
const LEAVE_AFTER_MS = 40000;

/**
 * The flower under glass. Breaking the cover and watering a dry flower feels
 * like a rescue. Then the flower thanks the player for breaking the glass —
 * which it could not have seen. Only a player who clicks it to ask gets a
 * glimpse of the truth, and it counts as vigilance.
 */
export const flower: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, FLOWER.sceneLabel);
    const caption = h('p', { class: 'scene__caption', text: FLOWER.intro, attrs: { 'aria-live': 'polite' } });
    const actions = h('div', { class: 'scene__actions' });
    ctx.scenery.replaceChildren(stage.el, caption, actions);

    const model = new FlowerModel();
    const startedAt = performance.now();
    let alive = true;
    let now = 0;
    let shatterAt: number | undefined;
    let waterAt: number | undefined;
    let asked = false;
    let finished = false;

    const bubble = stage.overlay(BUBBLE_RECT, 'flower__bubble');
    bubble.setAttribute('role', 'status');
    bubble.hidden = true;

    const dome = stage.hotspot(DOME_RECT, FLOWER.labels.dome, () => {
      const result = model.knock();
      if (result === 'none') return;
      ctx.witness.tally('glass-knock');
      if (model.knocks === 1) void bugWarns(ctx, stage.el, 'flower', { side: 'left', mood: 'angry' });
      if (result === 'crack') {
        caption.textContent = FLOWER.knock[model.knocks - 1] ?? '';
        return;
      }
      shatterAt = now;
      dome.hidden = true;
      actions.replaceChildren();
      ctx.witness.record({ scene: SCENE, kind: 'glass-broken', data: { knocks: model.knocks } });
      caption.textContent = FLOWER.shattered;
    });

    stage.hotspot(CAN_RECT, FLOWER.labels.can, () => {
      if (model.state === 'domed') {
        caption.textContent = FLOWER.canFirst;
        return;
      }
      if (!model.water()) return;
      waterAt = now;
      caption.textContent = '';
      void bloom();
    });

    async function bloom(): Promise<void> {
      finished = true;
      window.clearTimeout(leaveTimer);
      await sleep(motion ? WATER_MS + GROW_MS + 200 : 200);
      if (!alive) return;
      bubble.textContent = FLOWER.thanks;
      bubble.hidden = false;
      ctx.witness.record({
        scene: SCENE,
        kind: 'flower-thanks',
        trick: 'knows-too-much',
        data: { ms: Math.round(performance.now() - startedAt) },
      });
      const talk = stage.hotspot(FLOWER_RECT, FLOWER.labels.flower, () => {
        if (asked) return;
        asked = true;
        bubble.textContent = FLOWER.howDoYouKnow;
        ctx.witness.record({ scene: SCENE, kind: 'vigilance', data: { what: 'flower-knew' } });
      });
      talk.classList.add('flower__talk');
      await sleep(2600);
      if (!alive) return;
      caption.textContent = FLOWER.palPraise;
      const go = h('button', { class: 'btn', text: FLOWER.go, attrs: { type: 'button' }, on: { click: done } });
      actions.replaceChildren(go);
    }

    const leaveTimer = window.setTimeout(() => {
      if (!alive || finished || model.state !== 'domed') return;
      const leave = h('button', {
        class: 'btn btn--quiet',
        text: FLOWER.leave,
        attrs: { type: 'button' },
        on: {
          click: () => {
            if (finished || model.state !== 'domed') return;
            finished = true;
            ctx.witness.record({ scene: SCENE, kind: 'flower-left' });
            caption.textContent = FLOWER.left;
            const go = h('button', { class: 'btn', text: FLOWER.go, attrs: { type: 'button' }, on: { click: done } });
            actions.replaceChildren(go);
            go.focus();
          },
        },
      });
      actions.replaceChildren(leave);
    }, LEAVE_AFTER_MS);

    stage.run((g, t) => {
      now = t;
      paintFlower(g, t, { cracks: model.cracks, shatterAt, waterAt, motion });
    });

    return () => {
      alive = false;
      window.clearTimeout(leaveTimer);
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
