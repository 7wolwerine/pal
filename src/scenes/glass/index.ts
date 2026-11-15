import { audio } from '../../audio/engine.ts';
import { GLASS } from '../../content/glass.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage } from '../../pixel/stage.ts';
import { prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { Speech } from '../../ui/speech.ts';
import { HERO_WIDTH, HERO_HEIGHT } from '../../pixel/hero.ts';
import {
  GLASS_RECT,
  HERO_FEET_Y,
  HERO_HOME_X,
  HERO_MIRROR_X,
  MIRROR_RECT,
  SPLASH_MS,
  STAGE_H,
  STAGE_W,
  paintGlassScene,
  type HeroState,
} from './art.ts';
import { BOUNCE_AT, SETTLE_MS } from './model.ts';

const SCENE = 'glass';
/** If the player does not touch the glass, it slides off by itself. */
const SLIDE_AFTER_MS = 7000;
/** Picture pixels per ms: a tired walk. */
const WALK_SPEED = 0.03;

/**
 * A toast, and a glass that falls the wrong way: it bounces like rubber and
 * the water shatters. Right before the reveal, the first sign that the game's
 * world was staged all along.
 *
 * The player's character from the garden stands there too, worn out. A
 * mirror on the wall glints now and then; click it and he walks over, looks
 * at his tired face and tells himself he is still himself. It is optional
 * and never holds up the glass.
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
    let fallAt: number | undefined;

    // The character: standing, then walking to the mirror and looking in.
    let heroX = HERO_HOME_X;
    let heroPose: HeroState['pose'] = 'stand';
    let heroFacing: HeroState['facing'] = 0;
    let walk: { from: number; to: number; at: number } | undefined;
    let mirrorBusy = false;
    let mirrorDone = false;
    // His own bubble, so it never takes PAL's line (or its waiting tap) away.
    const thoughts = new Speech(stage.el, STAGE_W, STAGE_H);
    const heroHead = (): { x: number; y: number } => ({ x: heroX + HERO_WIDTH / 2, y: HERO_FEET_Y - HERO_HEIGHT - 1 });

    stage.hotspot(MIRROR_RECT, GLASS.mirror, () => {
      if (mirrorBusy || !alive) return;
      void lookInMirror();
    });

    async function lookInMirror(): Promise<void> {
      mirrorBusy = true;
      const distance = Math.abs(heroX - HERO_MIRROR_X);
      if (distance > 0.5) {
        heroPose = 'walk';
        heroFacing = HERO_MIRROR_X < heroX ? -1 : 1;
        walk = { from: heroX, to: HERO_MIRROR_X, at: now };
        await sleep(motion ? distance / WALK_SPEED : 0);
        if (!alive) return;
        walk = undefined;
        heroX = HERO_MIRROR_X;
      }
      // He turns to the mirror and looks at himself for a moment.
      heroPose = 'side';
      heroFacing = -1;
      await sleep(motion ? 900 : 100);
      if (!alive) return;
      if (!mirrorDone) ctx.witness.record({ scene: SCENE, kind: 'mirror', data: { glassFallen: fallAt !== undefined } });
      mirrorDone = true;
      await thoughts.say(GLASS.mirrorLine, heroHead, { who: 'hero', ms: 2600 });
      if (!alive) return;
      thoughts.hide();
      heroPose = 'stand';
      heroFacing = 0;
      mirrorBusy = false;
    }

    const spot = stage.hotspot(GLASS_RECT, GLASS.label, () => fall(true));
    // While he is busy at the mirror the glass waits, so neither moment steps on the other.
    let slideTimer = 0;
    const slideLater = (ms: number): void => {
      slideTimer = window.setTimeout(() => {
        if (mirrorBusy) slideLater(1500);
        else fall(false);
      }, ms);
    };
    slideLater(SLIDE_AFTER_MS);

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
      await speech.say(GLASS.after, voice, { who: 'pal', tap: true });
      if (alive) done();
    }

    stage.run((g, t) => {
      now = t;
      if (walk) {
        const u = Math.min(1, (t - walk.at) * WALK_SPEED / Math.max(1, Math.abs(walk.to - walk.from)));
        heroX = walk.from + (walk.to - walk.from) * u;
      }
      paintGlassScene(g, t, fallAt, motion, { x: heroX, pose: heroPose, facing: heroFacing });
    });

    return () => {
      alive = false;
      window.clearTimeout(slideTimer);
      speech.stop();
      thoughts.stop();
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
