import { PAINT } from '../../content/paint.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import type { PalMood } from '../../ui/pal-face.ts';
import { BRUSH_RECT, BUCKET_RECT, PAINTING_RECT, PAL_RECT, STAGE_H, STAGE_W, isGlitching, paintScene } from './art.ts';
import { DEAD, HOLE, HOLE_CENTRE, Painting, SKY, paintingRows } from './model.ts';

const SCENE = 'paint';
/** How long before the quiet way out appears. */
const LEAVE_AFTER_MS = 45000;

/**
 * The empty spot in the picture. Nobody asks the player to fill it; PAL only
 * asks how they like the sky, then keeps pointing at the hole. The bucket of
 * exactly the right blue fills it in one click that cannot be undone, the
 * picture glitches, and PAL shrugs it off.
 */
export const paint: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, PAINT.sceneLabel);
    const caption = h('p', { class: 'scene__caption', text: PAINT.ask, attrs: { 'aria-live': 'polite' } });
    const actions = h('div', { class: 'scene__actions scene__actions--row' });
    ctx.scenery.replaceChildren(stage.el, caption, actions);

    const painting = new Painting(paintingRows());
    const startedAt = performance.now();
    let alive = true;
    let held: 'bucket' | 'brush' | null = null;
    let bucketEmpty = false;
    let changedSomething = false;
    let finished = false;
    let warned = false;
    let undoTried = false;
    let glitchAt: number | undefined;
    let happyUntil = 0;
    let nags = 0;
    let now = 0;

    const undo = h('button', {
      class: 'btn btn--quiet paint__undo',
      text: PAINT.undo,
      attrs: { type: 'button', 'aria-disabled': 'true' },
      on: { click: tryUndo },
    });
    actions.replaceChildren(undo);

    stage.hotspot(PAL_RECT, PAINT.labels.pal, () => {
      if (finished) return;
      caption.textContent = PAINT.nag[nags % PAINT.nag.length] ?? '';
      nags++;
      happyUntil = now + 1500;
    });

    const bucket = stage.hotspot(BUCKET_RECT, PAINT.labels.bucket, () => {
      if (finished || bucketEmpty) return;
      held = held === 'bucket' ? null : 'bucket';
      if (held !== 'bucket') return;
      caption.textContent = PAINT.bucket;
      if (!warned) {
        warned = true;
        void bugWarns(ctx, stage.el, 'paint', { side: 'left', mood: 'panic' });
      }
    });

    stage.hotspot(BRUSH_RECT, PAINT.labels.brush, () => {
      if (finished) return;
      held = held === 'brush' ? null : 'brush';
      if (held === 'brush') caption.textContent = PAINT.brush;
    });

    const canvasSpot = stage.hotspot(PAINTING_RECT, PAINT.labels.painting, (event) => {
      if (finished) return;
      if (!held) {
        caption.textContent = PAINT.bare;
        return;
      }
      const [x, y] = aim(event);
      if (held === 'bucket') pour(x, y);
      else dab(x, y);
    });
    canvasSpot.classList.add('paint__canvas');

    /** Which painting pixel the player aimed at; the keyboard aims at the hole. */
    function aim(event: MouseEvent): [number, number] {
      const box = canvasSpot.getBoundingClientRect();
      if (event.detail === 0 || box.width === 0) {
        if (held === 'brush') return firstHole() ?? [...HOLE_CENTRE];
        return [...HOLE_CENTRE];
      }
      return [
        Math.floor(((event.clientX - box.left) / box.width) * painting.width),
        Math.floor(((event.clientY - box.top) / box.height) * painting.height),
      ];
    }

    function firstHole(): [number, number] | undefined {
      for (let y = 0; y < painting.height; y++) {
        for (let x = 0; x < painting.width; x++) if (painting.at(x, y) === HOLE) return [x, y];
      }
      return undefined;
    }

    /** The bucket: one flood fill, the whole bucket, no way back. */
    function pour(x: number, y: number): void {
      const hitHole = painting.at(x, y) === HOLE;
      const changed = painting.fill(x, y, SKY);
      if (changed.length === 0) return;
      changedSomething = true;
      bucketEmpty = true;
      held = null;
      bucket.hidden = true;
      if (!hitHole) {
        ctx.witness.record({ scene: SCENE, kind: 'fill-miss', trick: 'irreversible', data: { cells: changed.length } });
        caption.textContent = PAINT.miss;
        return;
      }
      // One pixel in the middle of the new sky never takes the paint.
      const [dx, dy] = changed[Math.floor(changed.length / 2)] ?? [...HOLE_CENTRE];
      painting.set(dx, dy, DEAD);
      void filled('bucket');
    }

    /** The brush: one pixel at a time. Slow, but it gets there. */
    function dab(x: number, y: number): void {
      if (painting.at(x, y) === undefined || painting.at(x, y) === SKY) return;
      painting.set(x, y, SKY);
      changedSomething = true;
      ctx.witness.tally('paint-dab');
      if (painting.count(HOLE) === 0) void filled('brush');
    }

    async function filled(tool: 'bucket' | 'brush'): Promise<void> {
      finished = true;
      window.clearTimeout(leaveTimer);
      ctx.witness.record({
        scene: SCENE,
        kind: 'filled',
        trick: 'irreversible',
        data: { tool, ms: Math.round(performance.now() - startedAt) },
      });
      glitchAt = now + 120;
      caption.textContent = '';
      await sleep(motion ? 1100 : 300);
      if (!alive) return;
      caption.textContent = PAINT.after;
      const go = h('button', { class: 'btn', text: PAINT.go, attrs: { type: 'button' }, on: { click: done } });
      actions.replaceChildren(undo, go);
      go.focus();
    }

    function tryUndo(): void {
      if (!changedSomething) {
        caption.textContent = PAINT.undoNothing;
        return;
      }
      caption.textContent = PAINT.undoNope;
      undo.classList.remove('paint__undo--nope');
      void undo.offsetWidth;
      undo.classList.add('paint__undo--nope');
      if (!undoTried) {
        undoTried = true;
        ctx.witness.record({ scene: SCENE, kind: 'undo-tried' });
      }
    }

    const leaveTimer = window.setTimeout(() => {
      if (!alive || finished) return;
      const leave = h('button', {
        class: 'btn btn--quiet',
        text: PAINT.leave,
        attrs: { type: 'button' },
        on: {
          click: () => {
            if (finished) return;
            finished = true;
            ctx.witness.record({ scene: SCENE, kind: 'hole-left' });
            caption.textContent = PAINT.left;
            const go = h('button', { class: 'btn', text: PAINT.go, attrs: { type: 'button' }, on: { click: done } });
            actions.replaceChildren(go);
            go.focus();
          },
        },
      });
      actions.replaceChildren(undo, leave);
    }, LEAVE_AFTER_MS);

    stage.run((g, t) => {
      now = t;
      const palMood: PalMood = t < happyUntil ? 'happy' : 'neutral';
      paintScene(g, t, { painting, held, bucketEmpty, glitchAt, palMood, motion });
      stage.el.classList.toggle('paint--glitch', isGlitching(t, glitchAt));
      stage.el.classList.toggle('paint--armed', held !== null && !finished);
    });

    return () => {
      alive = false;
      window.clearTimeout(leaveTimer);
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
