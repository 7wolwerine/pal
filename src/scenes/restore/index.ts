import { RESTORE, type RepairId } from '../../content/restore.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import { REPAIR_RECTS, STAGE_H, STAGE_W, paintRestore } from './art.ts';
import { RestoreModel } from './model.ts';

const SCENE = 'restore';

/**
 * Fix the hedgehogs' broken little house. Every click warms the world a bit:
 * the blizzard thins, the colours turn from frozen night to a sunny
 * afternoon, and the family stops shivering. The pull to fix "just one more
 * thing" is the hook; the warm glow at the end is the reward that sells it.
 */
export const restore: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, RESTORE.sceneLabel);
    const caption = h('p', { class: 'scene__caption', text: RESTORE.intro, attrs: { 'aria-live': 'polite' } });
    const actions = h('div', { class: 'scene__actions' });
    ctx.scenery.replaceChildren(stage.el, caption, actions);
    const warnTimer = window.setTimeout(() => {
      if (doneAt === undefined) void bugWarns(ctx, stage.el, 'restore', { side: 'left', mood: 'angry' });
    }, 2600);

    const ids = Object.keys(RESTORE.repairs) as RepairId[];
    const model = new RestoreModel(ids.map((id) => ({ id, needed: RESTORE.repairs[id].needed })));
    const startedAt = performance.now();
    let doneAt: number | undefined;
    let now = 0;

    for (const id of ids) {
      const info = RESTORE.repairs[id];
      const spot = stage.hotspot(REPAIR_RECTS[id], info.label, () => {
        if (doneAt !== undefined || model.isFixed(id)) return;
        const finished = model.work(id);
        ctx.witness.tally('repair-click');
        if (!finished) {
          caption.textContent = RESTORE.working;
          return;
        }
        spot.hidden = true;
        caption.textContent = info.fixed;
        if (model.finished) complete();
      });
    }

    function complete(): void {
      doneAt = now;
      ctx.witness.record({
        scene: SCENE,
        kind: 'restored',
        trick: 'helpers-high',
        data: { ms: Math.round(performance.now() - startedAt), clicks: ctx.witness.count('repair-click') },
      });
      caption.textContent = RESTORE.done;
      const go = h('button', { class: 'btn', text: RESTORE.go, attrs: { type: 'button' }, on: { click: done } });
      actions.replaceChildren(go);
      go.focus();
    }

    stage.run((g, t) => {
      now = t;
      paintRestore(g, t, { model, motion, sinceDone: doneAt === undefined ? undefined : t - doneAt });
    });

    return () => {
      window.clearTimeout(warnTimer);
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
