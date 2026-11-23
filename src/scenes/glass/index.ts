import { audio } from '../../audio/engine.ts';
import { GLASS } from '../../content/glass.ts';
import type { GameScene } from '../../game.ts';
import { HERO_HEIGHT, HERO_WIDTH } from '../../pixel/hero.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { Speech } from '../../ui/speech.ts';
import {
  GLASS_RECT,
  HERO_FEET_Y,
  HERO_MIRROR_X,
  HERO_TABLE_X,
  MIRROR_RECT,
  STAGE_H,
  STAGE_W,
  handDrop,
  paintGlassScene,
  splashMs,
  type GlassState,
  type HeroState,
} from './art.ts';
import { dropTimes } from './model.ts';

const SCENE = 'glass';
/** A while with nothing touched, and the glass starts to catch the light. */
const SHINE_AFTER_MS = 4000;
/** If the player still does not touch the glass, the character goes for it anyway. */
const FETCH_AFTER_MS = 16000;
/** Picture pixels per ms: a tired walk. */
const WALK_SPEED = 0.03;

/**
 * A toast, and a glass that falls the wrong way. The player's character from
 * the garden stands by a standing mirror, worn out. A tap on the glass (or a
 * little waiting) and the character walks over, takes it, raises it for the
 * toast — and, hups, it slips: it bounces like rubber and the water shatters.
 * Right before the reveal, the first sign that the game's world was staged.
 *
 * A tap on the mirror, any time the character is free, and they look at their
 * tired face and tell themselves they are still themselves. Optional; it never
 * holds up the glass for long.
 */
export const glass: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, GLASS.sceneLabel);
    ctx.scenery.replaceChildren(stage.el);
    const speech = new Speech(stage.el, STAGE_W, STAGE_H);
    // PAL is not in the picture; its words come from just above the table.
    const voice = (): { x: number; y: number } => ({ x: GLASS_RECT.x + GLASS_RECT.w / 2, y: GLASS_RECT.y - 4 });
    void speech.say(GLASS.toast, voice, { who: 'pal' });

    let alive = true;
    let now = 0;
    let glassState: GlassState = { kind: 'table' };

    // The character: by the mirror at first, walking, looking in, holding the glass.
    let hero: HeroState = { x: HERO_MIRROR_X, pose: 'stand', facing: 0 };
    let walk: { from: number; to: number; at: number } | undefined;
    /** Something is under way (the mirror or the glass); taps wait until it is over. */
    let busy = false;
    let mirrorDone = false;
    let fetched = false;
    // The character's own bubble, so it never takes PAL's line (or its waiting tap) away.
    const thoughts = new Speech(stage.el, STAGE_W, STAGE_H);
    const heroHead = (): { x: number; y: number } => ({ x: hero.x + HERO_WIDTH / 2, y: HERO_FEET_Y - HERO_HEIGHT - 1 });

    async function walkTo(x: number): Promise<boolean> {
      const distance = Math.abs(hero.x - x);
      if (distance <= 0.5) return true;
      hero = { ...hero, pose: 'walk', facing: x < hero.x ? -1 : 1 };
      walk = { from: hero.x, to: x, at: now };
      await sleep(motion ? distance / WALK_SPEED : 0);
      walk = undefined;
      hero = { ...hero, x };
      return alive;
    }

    /** When the player last did something here; the glass shines after a while without. */
    let lastTouch = 0;
    stage.hotspot(MIRROR_RECT, GLASS.mirror, () => {
      lastTouch = now;
      if (busy || !alive) return;
      void lookInMirror();
    });

    async function lookInMirror(): Promise<void> {
      busy = true;
      if (!(await walkTo(HERO_MIRROR_X))) return;
      // A turn to the mirror and a moment's look.
      hero = { ...hero, pose: 'side', facing: -1 };
      await sleep(motion ? 900 : 100);
      if (!alive) return;
      if (!mirrorDone) ctx.witness.record({ scene: SCENE, kind: 'mirror', data: { glassFallen: glassState.kind === 'falling' } });
      mirrorDone = true;
      await thoughts.say(GLASS.mirrorLine, heroHead, { who: 'hero', ms: 2600 });
      if (!alive) return;
      thoughts.hide();
      hero = { ...hero, pose: 'stand', facing: 0 };
      busy = false;
    }

    const spot = stage.hotspot(GLASS_RECT, GLASS.label, () => fetch(true));
    // While the character is at the mirror the glass waits, so neither moment steps on the other.
    let fetchTimer = 0;
    const fetchLater = (ms: number): void => {
      fetchTimer = window.setTimeout(() => {
        if (busy) fetchLater(1500);
        else fetch(false);
      }, ms);
    };
    fetchLater(FETCH_AFTER_MS);

    function fetch(touched: boolean): void {
      if (fetched || busy) return;
      fetched = true;
      spot.hidden = true;
      window.clearTimeout(fetchTimer);
      void toast(touched);
    }

    async function toast(touched: boolean): Promise<void> {
      busy = true;
      if (!(await walkTo(HERO_TABLE_X))) return;
      // Takes the glass off the table, then raises it.
      hero = { ...hero, pose: 'hold', facing: 0 };
      glassState = { kind: 'held' };
      audio.click(76, 0.2);
      await sleep(motion ? 600 : 100);
      if (!alive) return;
      hero = { ...hero, pose: 'toast' };
      glassState = { kind: 'raised' };
      await sleep(motion ? 900 : 100);
      if (!alive) return;
      // Hups.
      const from = handDrop(hero.x);
      glassState = { kind: 'falling', at: now, from };
      hero = { ...hero, pose: 'stand' };
      await play(from, touched);
    }

    async function play(from: ReturnType<typeof handDrop>, touched: boolean): Promise<void> {
      const times = dropTimes(from);
      if (motion) {
        // The sounds follow the motion: a boing on each bounce, a shatter for the water.
        const events = [
          ...times.bounceAt.map((at, i) => ({ at, sound: () => audio.boing(0.45 - i * 0.12) })),
          { at: splashMs(from), sound: () => audio.shatter() },
        ].sort((a, b) => a.at - b.at);
        let elapsed = 0;
        for (const e of events) {
          await sleep(e.at - elapsed);
          elapsed = e.at;
          if (!alive) return;
          e.sound();
        }
        await sleep(Math.max(0, times.settle - elapsed) + 700);
      } else {
        audio.boing();
        audio.shatter();
        await sleep(400);
      }
      if (!alive) return;
      busy = false;
      ctx.witness.record({ scene: SCENE, kind: 'glass-bounced', trick: 'broken-physics', data: { touched } });
      await speech.say(GLASS.after, voice, { who: 'pal', tap: true });
      // Someone still at the mirror finishes the thought first.
      while (alive && busy) await sleep(200);
      if (alive) done();
    }

    stage.run((g, t) => {
      now = t;
      if (walk) {
        const u = Math.min(1, ((t - walk.at) * WALK_SPEED) / Math.max(1, Math.abs(walk.to - walk.from)));
        hero = { ...hero, x: walk.from + (walk.to - walk.from) * u };
      }
      paintGlassScene(g, t, glassState, motion, hero, !busy && t - lastTouch > SHINE_AFTER_MS);
    });

    return () => {
      alive = false;
      window.clearTimeout(fetchTimer);
      speech.stop();
      thoughts.stop();
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
