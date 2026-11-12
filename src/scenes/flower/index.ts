import { audio } from '../../audio/engine.ts';
import { FLOWER } from '../../content/flower.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { BUG_PX, Beetle } from '../../ui/beetle.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { Speech } from '../../ui/speech.ts';
import { CAN_RECT, DOME_RECT, FLOWER_RECT, GROW_MS, STAGE_H, STAGE_W, TABLE_Y, WATER_MS, paintFlower } from './art.ts';
import { FlowerModel } from './model.ts';

const SCENE = 'flower';
/** How long before the quiet way out appears. */
const LEAVE_AFTER_MS = 40000;
const HINT_AFTER_MS = 4000;

/**
 * The flower under glass, without a word of explanation. Knocking cracks the
 * glass until it bursts; the watering can does the rest, and the flower
 * blooms into something lovely. Then it thanks the player for breaking the
 * glass — which it could not have seen. BUG sits on the sill the whole time,
 * cross, and only grumbles. A player who clicks the flower to ask gets a
 * glimpse of the truth, and it counts as vigilance.
 */
export const flower: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, FLOWER.sceneLabel);
    ctx.scenery.replaceChildren(stage.el);
    const speech = new Speech(stage.el, STAGE_W, STAGE_H);

    const model = new FlowerModel();
    const startedAt = performance.now();
    let alive = true;
    let now = 0;
    let actedAt = 0;
    let shatterAt: number | undefined;
    let waterAt: number | undefined;
    let asked = false;
    let finished = false;
    let bloomed = false;

    // BUG sits on the sill, arms folded, and stays cross the whole time.
    const beetle = new Beetle();
    stage.el.append(beetle.el);
    const placeBug = (): void => {
      const w = stage.el.clientWidth;
      const hgt = stage.el.clientHeight;
      beetle.jump(Math.max(30, w * 0.08), (TABLE_Y / STAGE_H) * hgt - BUG_PX + 4);
    };
    requestAnimationFrame(placeBug);
    window.addEventListener('resize', placeBug);
    beetle.setMood('angry');
    let grumbles = 0;
    const grumble = async (line?: string): Promise<void> => {
      if (!alive) return;
      grumbles++;
      if (line) beetle.say(line);
      else beetle.grumble();
      await beetle.stomp(1);
      await sleep(1800);
      if (alive) beetle.say('');
      beetle.setMood(grumbles > 3 ? 'sad' : 'angry');
    };

    const flowerHead = (): { x: number; y: number } => ({ x: FLOWER_RECT.x + FLOWER_RECT.w / 2, y: FLOWER_RECT.y });

    const dome = stage.hotspot(DOME_RECT, FLOWER.labels.dome, () => {
      const result = model.knock();
      if (result === 'none') return;
      actedAt = now;
      ctx.witness.tally('glass-knock');
      if (result === 'crack') {
        audio.crunch();
        if (model.knocks === 1) void grumble(FLOWER.bug[0]);
        return;
      }
      audio.shatter();
      shatterAt = now;
      dome.hidden = true;
      leave.hidden = true;
      ctx.witness.record({ scene: SCENE, kind: 'glass-broken', data: { knocks: model.knocks } });
      void grumble(FLOWER.bug[1]);
    });

    stage.hotspot(CAN_RECT, FLOWER.labels.can, () => {
      actedAt = now;
      if (!model.water()) return;
      waterAt = now;
      void bloom();
    });

    async function bloom(): Promise<void> {
      finished = true;
      window.clearTimeout(leaveTimer);
      await sleep(motion ? WATER_MS + GROW_MS + 300 : 200);
      if (!alive) return;
      bloomed = true;
      audio.treasure();
      ctx.witness.record({
        scene: SCENE,
        kind: 'flower-thanks',
        trick: 'knows-too-much',
        data: { ms: Math.round(performance.now() - startedAt) },
      });
      void grumble(FLOWER.bug[2]);
      const talk = stage.hotspot(FLOWER_RECT, FLOWER.labels.flower, () => {
        if (asked) return;
        asked = true;
        ctx.witness.record({ scene: SCENE, kind: 'vigilance', data: { what: 'flower-knew' } });
        void speech.say(FLOWER.howDoYouKnow, flowerHead, { who: 'hero', tap: true }).then(() => {
          if (alive) done();
        });
      });
      talk.classList.add('flower__talk');
      await speech.say(FLOWER.thanks, flowerHead, { who: 'hero', tap: true });
      if (alive && !asked) done();
    }

    // The quiet way out, for the few who would rather leave the glass alone.
    const leave = h('button', { class: 'scene__chip', text: FLOWER.leave, attrs: { type: 'button' } });
    leave.hidden = true;
    stage.el.append(leave);
    leave.addEventListener('click', () => {
      if (finished || model.state !== 'domed') return;
      finished = true;
      ctx.witness.record({ scene: SCENE, kind: 'flower-left' });
      beetle.setMood('happy');
      void speech.say(FLOWER.left, flowerHead, { who: 'hero', tap: true }).then(() => {
        if (alive) done();
      });
    });
    const leaveTimer = window.setTimeout(() => {
      if (alive && !finished && model.state === 'domed') leave.hidden = false;
    }, LEAVE_AFTER_MS);

    stage.run((g, t) => {
      now = t;
      const idle = t - actedAt > HINT_AFTER_MS && !finished;
      const hint = !idle ? undefined : model.state === 'domed' ? 'dome' : model.state === 'broken' ? 'can' : undefined;
      paintFlower(g, t, { cracks: model.cracks, shatterAt, waterAt, bloomed, hint, motion });
    });

    return () => {
      alive = false;
      window.clearTimeout(leaveTimer);
      window.removeEventListener('resize', placeBug);
      beetle.stop();
      speech.stop();
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
