import { audio } from '../../audio/engine.ts';
import { PAINT } from '../../content/paint.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { BUCKET_RECT, LOOSE_RECT, PAINTING_RECT, PENCIL_RECT, STAGE_H, STAGE_W, ZOOM, paintScene, type Held } from './art.ts';
import { DEAD, HOLE, HOLE_CENTRE, Painting, SKY, paintingRows } from './model.ts';

const SCENE = 'paint';
/** How long the player may do nothing before a twinkle shows where to click. */
const HINT_AFTER_MS = 4000;
/** Knocks it takes to fix the loose side of the frame. */
const KNOCKS = 3;

type Step = 'hole' | 'framing' | 'frame' | 'sign' | 'signing' | 'done';

/**
 * The empty spot in the picture, seen close up. Nobody says a word: there is
 * a painting with one white hole in the sky and a bucket of exactly the right
 * blue with a brush in it. One dab fills the hole and cannot be undone. The
 * painting goes into a frame that needs fixing, and then wants signing — with
 * a name. A tiny glitch, and the scene moves on by itself.
 */
export const paint: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, PAINT.sceneLabel);
    ctx.scenery.replaceChildren(stage.el);

    const painting = new Painting(paintingRows());
    const startedAt = performance.now();
    let alive = true;
    let step: Step = 'hole';
    let held: Held = null;
    let framed = 0;
    let framedAt: number | undefined;
    let loose = 1;
    let knocks = 0;
    let knockedAt: number | undefined;
    let glitchAt: number | undefined;
    let actedAt = 0;
    let now = 0;
    let warned = false;

    const acted = (): void => {
      actedAt = now;
    };

    // The brush stands in the bucket; take it.
    const bucket = stage.hotspot(BUCKET_RECT, PAINT.labels.bucket, () => {
      if (step !== 'hole' || held === 'brush') return;
      held = 'brush';
      acted();
      audio.click(72, 0.35);
      stage.el.classList.add('paint--brush');
      if (!warned) {
        warned = true;
        void bugWarns(ctx, stage.el, 'paint', { side: 'right', mood: 'angry' });
      }
    });

    // The painting: the brush fills the hole in one go.
    const canvasSpot = stage.hotspot(PAINTING_RECT, PAINT.labels.painting, (event) => {
      if (step !== 'hole') return;
      if (held !== 'brush') {
        // Bare hands: the bucket twinkles at once, as if to say "with this".
        actedAt = now - HINT_AFTER_MS;
        return;
      }
      acted();
      const hit = nearestHole(...aim(event));
      if (!hit) return;
      const changed = painting.fill(hit[0], hit[1], SKY);
      if (changed.length === 0) return;
      // One pixel in the middle of the new sky never quite takes the paint.
      const [dx, dy] = changed[Math.floor(changed.length / 2)] ?? [...HOLE_CENTRE];
      painting.set(dx, dy, DEAD);
      held = null;
      stage.el.classList.remove('paint--brush');
      bucket.hidden = true;
      canvasSpot.hidden = true;
      audio.snap(81);
      ctx.witness.record({
        scene: SCENE,
        kind: 'filled',
        trick: 'irreversible',
        data: { tool: 'brush', ms: Math.round(performance.now() - startedAt) },
      });
      void frameIt();
    });

    /** Which painting pixel the player aimed at; the keyboard aims at the hole. */
    function aim(event: MouseEvent): [number, number] {
      const box = canvasSpot.getBoundingClientRect();
      if (event.detail === 0 || box.width === 0) return [...HOLE_CENTRE];
      return [
        Math.floor(((event.clientX - box.left) / box.width) * painting.width),
        Math.floor(((event.clientY - box.top) / box.height) * painting.height),
      ];
    }

    /** A hole pixel near where the player aimed: fingers and mice are not that precise. */
    function nearestHole(x: number, y: number): [number, number] | undefined {
      let best: [number, number] | undefined;
      let bestD = 7 * 7;
      for (let py = 0; py < painting.height; py++) {
        for (let pxl = 0; pxl < painting.width; pxl++) {
          if (painting.at(pxl, py) !== HOLE) continue;
          const d = (pxl - x) ** 2 + (py - y) ** 2;
          if (d <= bestD) {
            bestD = d;
            best = [pxl, py];
          }
        }
      }
      return best;
    }

    async function frameIt(): Promise<void> {
      await sleep(500);
      if (!alive) return;
      step = 'framing';
      framedAt = now;
      audio.click(60, 0.4);
      await sleep(700);
      if (!alive) return;
      step = 'frame';
      looseSpot.hidden = false;
      acted();
    }

    // The right side of the frame hangs loose: knock it back into place.
    const looseSpot = stage.hotspot(LOOSE_RECT, PAINT.labels.frame, () => {
      if (step !== 'frame') return;
      acted();
      knocks++;
      knockedAt = now;
      audio.knock();
      loose = Math.max(0, 1 - knocks / KNOCKS);
      ctx.witness.tally('frame-knock');
      if (knocks < KNOCKS) return;
      looseSpot.hidden = true;
      audio.snap(76);
      ctx.witness.record({ scene: SCENE, kind: 'frame-fixed', trick: 'completion-urge', data: { knocks } });
      step = 'sign';
      pencilSpot.hidden = false;
    });
    looseSpot.hidden = true;

    // A finished painting wants a signature.
    const pencilSpot = stage.hotspot(PENCIL_RECT, PAINT.labels.pencil, () => {
      if (step !== 'sign') return;
      acted();
      held = 'pencil';
      audio.click(79, 0.35);
      pencilSpot.hidden = true;
      offerNames();
    });
    pencilSpot.hidden = true;

    /** Three ways to sign, each in its own hand. */
    function offerNames(): void {
      const name = ctx.profile.name ?? PAINT.anonymous;
      const options = [
        { text: name, style: 'script' },
        { text: `${name.charAt(0).toUpperCase()}.`, style: 'serif' },
        { text: PAINT.anonymous, style: 'marker' },
      ];
      const box = stage.overlay({ x: 70, y: 52, w: 64, h: 30 }, 'paint__names');
      for (const option of options) {
        const button = h('button', {
          class: `paint__name paint__name--${option.style}`,
          text: option.text,
          attrs: { type: 'button' },
          on: {
            click: () => {
              box.remove();
              void sign(option.text, option.style);
            },
          },
        });
        box.append(button);
      }
      box.querySelector('button')?.focus();
    }

    async function sign(text: string, style: string): Promise<void> {
      step = 'signing';
      held = null;
      ctx.witness.disclose(SCENE, 'osint', 'signature', text);
      ctx.profile.signature = { text, style };
      const signature = stage.overlay({ x: 88, y: 66, w: 44, h: 14 }, `paint__sig paint__name--${style}`);
      signature.textContent = text;
      audio.click(88, 0.2);
      await sleep(motion ? 1500 : 200);
      if (!alive) return;
      // A blink of something not quite right, then the scene simply moves on.
      glitchAt = now + 400;
      await sleep(1700);
      if (!alive) return;
      step = 'done';
      stage.el.classList.add('paint--leave');
      await sleep(motion ? 600 : 0);
      if (alive) done();
    }

    stage.run((g, t) => {
      now = t;
      const idle = t - actedAt > HINT_AFTER_MS;
      let hint: { x: number; y: number } | undefined;
      if (idle) {
        if (step === 'hole' && held !== 'brush') hint = { x: BUCKET_RECT.x + 13, y: BUCKET_RECT.y + 2 };
        else if (step === 'hole') hint = { x: PAINTING_RECT.x + HOLE_CENTRE[0] * ZOOM + 6, y: PAINTING_RECT.y + HOLE_CENTRE[1] * ZOOM - 4 };
        else if (step === 'frame') hint = { x: LOOSE_RECT.x + 8, y: 50 };
        else if (step === 'sign') hint = { x: PENCIL_RECT.x + 12, y: PENCIL_RECT.y };
      }
      if (framedAt !== undefined) framed = Math.min(1, (t - framedAt) / 500);
      paintScene(g, t, { painting, held, framed, loose, knockedAt, glitchAt, hint, motion });
    });

    return () => {
      alive = false;
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
