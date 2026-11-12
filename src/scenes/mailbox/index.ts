import { audio } from '../../audio/engine.ts';
import { MAILBOX } from '../../content/intro.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import type { GameScene } from '../../game.ts';
import { HERO_HEIGHT, HERO_WIDTH, paintHero, type HeroPose } from '../../pixel/hero.ts';
import { PixelStage, progress } from '../../pixel/stage.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import { Speech } from '../../ui/speech.ts';
import {
  CHARACTER_AT_DOOR,
  CHARACTER_AT_MAILBOX,
  CHARACTER_HOME,
  DOOR_RECT,
  ENVELOPE,
  FEET_Y,
  MAILBOX_RECT,
  MAIL_SLOT,
  PATH_RECT,
  SEAL,
  SEAL_RECT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  paintAlert,
  paintBackdrop,
  paintBirds,
  paintCloseUp,
  paintDriveOut,
  paintMailbox,
  paintPlant,
  paintPointer,
  paintQuestion,
  paintSmallEnvelope,
} from './art.ts';

const SCENE = 'mailbox';

type Phase =
  | 'quiet'
  | 'arriving'
  | 'waiting'
  | 'walking'
  | 'sealed'
  | 'opening'
  | 'reading'
  | 'gift'
  | 'home'
  | 'entering';

const QUIET_MS = 1500;
const ARRIVING_MS = 1300;
const FLAP_MS = 650;
/** How long nothing may happen before an arrow shows the way. */
const NUDGE_MS = 3500;
/** Walking speed in picture pixels per millisecond. */
const WALK_SPEED = 0.034;

/**
 * The opening scene. A letter from "grandma" lands in the mailbox, with a
 * present inside: a flash drive. A loving note, a familiar name and a heart
 * seal make it feel safe to plug in. This is the bait.
 */
export const mailbox: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_WIDTH, STAGE_HEIGHT, MAILBOX.sceneLabel);
    ctx.scenery.replaceChildren(stage.el);
    const speech = new Speech(stage.el, STAGE_WIDTH, STAGE_HEIGHT);

    let phase: Phase = 'quiet';
    let phaseAt = 0;
    let now = 0;
    let arrivedAt = 0;
    /** When the player last did something; the arrow appears after a pause. */
    let actedAt = 0;
    let pose: HeroPose = 'stand';
    let facing: -1 | 0 | 1 = 0;
    let alive = true;

    let charX: number = CHARACTER_HOME.x;
    let walk: { from: number; to: number; at: number; ms: number; then?: () => void } | null = null;
    const head = (): { x: number; y: number } => ({ x: charX + HERO_WIDTH / 2, y: FEET_Y - HERO_HEIGHT - 1 });

    const enter = (next: Phase): void => {
      phase = next;
      phaseAt = now;
      actedAt = now;
    };

    const walkTo = (to: number, then?: () => void): void => {
      const from = charX;
      const ms = Math.max(1, Math.abs(to - from) / WALK_SPEED);
      facing = to > from ? 1 : to < from ? -1 : 0;
      walk = { from, to, at: now, ms, then };
    };

    const say = (text: string, tap = false, below = false): Promise<void> => speech.say(text, head, { who: 'hero', tap, below });

    // Click the path to stroll there.
    stage.hotspot(PATH_RECT, MAILBOX.pathLabel, (event) => {
      if (phase !== 'quiet' && phase !== 'waiting' && phase !== 'home') return;
      actedAt = now;
      const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const fx = event.detail === 0 || box.width === 0 ? 0.5 : (event.clientX - box.left) / box.width;
      const target = PATH_RECT.x + Math.min(1, Math.max(0, fx)) * PATH_RECT.w - HERO_WIDTH / 2;
      walkTo(Math.round(Math.min(CHARACTER_AT_MAILBOX.x, Math.max(PATH_RECT.x - 2, target))));
    });

    const mailboxSpot = stage.hotspot(MAILBOX_RECT, MAILBOX.mailboxLabel, () => {
      if (phase !== 'waiting') return;
      mailboxSpot.hidden = true;
      speech.hide();
      ctx.witness.record({ scene: SCENE, kind: 'opened-mail', trick: 'baiting', data: { ms: Math.round(now - arrivedAt) } });
      enter('walking');
      walkTo(CHARACTER_AT_MAILBOX.x, () => {
        facing = 0;
        enter('sealed');
        sealSpot.hidden = false;
        sealSpot.focus();
      });
    });
    mailboxSpot.hidden = true;

    // The close-up only opens when the player breaks the seal.
    const sealSpot = stage.hotspot(SEAL_RECT, MAILBOX.sealLabel, () => {
      if (phase !== 'sealed') return;
      sealSpot.hidden = true;
      audio.click(76, 0.4);
      enter('opening');
    });
    sealSpot.hidden = true;

    // Grandma's letter: real text on paper, sliding up out of the envelope.
    const sender = stage.overlay({ x: ENVELOPE.x + 10, y: ENVELOPE.y + 28, w: 50, h: 14 }, 'mb-sender');
    sender.append(...MAILBOX.sender.map((line) => h('span', { text: line })));
    sender.hidden = true;
    const slot = stage.overlay({ x: 22, y: 0, w: 116, h: ENVELOPE.y + 2 }, 'mb-slot');
    const paper = h(
      'div',
      { class: 'mb-letter', attrs: { role: 'document', 'aria-label': MAILBOX.letterLabel } },
      h('p', { class: 'mb-letter__hi', text: MAILBOX.letter.greeting }),
      h('p', { text: MAILBOX.letter.body }),
      h('p', { class: 'mb-letter__sig', text: MAILBOX.letter.signature }),
    );
    slot.append(paper);
    slot.hidden = true;

    const doorSpot = stage.hotspot(DOOR_RECT, MAILBOX.doorLabel, () => {
      if (phase !== 'home') return;
      doorSpot.hidden = true;
      speech.hide();
      enter('walking');
      walkTo(CHARACTER_AT_DOOR.x, () => {
        facing = 0;
        enter('entering');
        window.setTimeout(() => {
          if (alive) done();
        }, 700);
      });
    });
    doorSpot.hidden = true;

    // Clickable bits of the garden: the character comments, nothing more. The
    // reward-for-poking-around habit the game later turns against the player.
    const C = MAILBOX.comments;
    const nosey: { rect: { x: number; y: number; w: number; h: number }; text: string; label: string }[] = [
      { rect: { x: 134, y: 6, w: 26, h: 32 }, text: C.tree.text, label: C.tree.label },
      { rect: { x: 0, y: 0, w: 60, h: 14 }, text: C.sky.text, label: C.sky.label },
      { rect: { x: 44, y: 38, w: 14, h: 8 }, text: C.heart.text, label: C.heart.label },
      { rect: { x: 22, y: 42, w: 16, h: 16 }, text: C.window.text, label: C.window.label },
    ];
    for (const item of nosey) {
      stage.hotspot(item.rect, item.label, () => {
        if (phase !== 'quiet' && phase !== 'waiting' && phase !== 'home') return;
        actedAt = now;
        void say(item.text);
        ctx.witness.record({ scene: SCENE, kind: 'poked', data: { what: item.label } });
      });
    }

    async function readLetter(): Promise<void> {
      sender.hidden = true;
      slot.hidden = false;
      await say(MAILBOX.fromGrandma, true, true);
      if (!alive) return;
      slot.classList.add('mb-slot--away');
      enter('gift');
      audio.treasure();
      window.setTimeout(() => {
        if (!alive) return;
        enter('home');
        pose = 'happy';
        void say(MAILBOX.curious).then(() => {
          if (!alive) return;
          window.setTimeout(() => {
            if (alive && phase === 'home') pose = 'stand';
          }, 900);
        });
        doorSpot.hidden = false;
      }, 1900);
    }

    stage.run((g, t) => {
      now = t;
      const since = t - phaseAt;

      if (phase === 'quiet' && since >= QUIET_MS) enter('arriving');
      if (phase === 'arriving' && since >= ARRIVING_MS) {
        enter('waiting');
        arrivedAt = t;
        mailboxSpot.hidden = false;
        audio.click(84, 0.3);
        void say(MAILBOX.post);
        window.setTimeout(() => {
          if (alive && phase === 'waiting') void bugWarns(ctx, stage.el, 'mailbox', { side: 'right' });
        }, 2600);
      }
      if (phase === 'sealed' && since > 500) sender.hidden = false;
      if (phase === 'opening' && since >= FLAP_MS) {
        enter('reading');
        void readLetter();
      }

      // Advance any walk in progress.
      let walking = false;
      if (walk) {
        const u = Math.min(1, (t - walk.at) / walk.ms);
        charX = walk.from + (walk.to - walk.from) * u;
        walking = u < 1;
        if (!walking) {
          const then = walk.then;
          walk = null;
          then?.();
        }
      }

      paintBackdrop(g, t, motion);
      paintPlant(g);
      if (motion) paintBirds(g, t);

      // When the letter lands the mailbox rattles for a moment.
      const sinceArrived = t - arrivedAt;
      const rattle = motion && phase === 'waiting' && sinceArrived < 600 ? Math.round(Math.sin(t / 45) * 2) : 0;
      g.save();
      g.translate(rattle, 0);
      paintMailbox(g, phase !== 'quiet' && phase !== 'arriving');
      g.restore();

      if (phase === 'arriving') {
        // The letter sails in from the right in an arc and drops into the slot.
        const u = progress(since, 0, ARRIVING_MS);
        paintSmallEnvelope(g, 170 + (MAIL_SLOT.x - 170) * u, 14 + (MAIL_SLOT.y - 14) * u - Math.sin(u * Math.PI) * 18);
      }

      // The character, walking, standing, or going in through the door.
      if (phase !== 'entering' || since < 350) {
        if (phase === 'entering') g.globalAlpha = 1 - since / 350;
        const shown: HeroPose = walking ? 'walk' : pose;
        paintHero(g, charX, FEET_Y, { pose: shown, facing: walking ? facing : 0, t, motion });
        g.globalAlpha = 1;
      }

      // A "?" over the character turns into a "!" as the surprise sinks in.
      if (phase === 'waiting' && sinceArrived < 2200) {
        const mx = charX + HERO_WIDTH / 2 - 1;
        const my = FEET_Y - HERO_HEIGHT - 10;
        if (sinceArrived < 900) paintQuestion(g, mx, my, motion ? t : 0);
        else paintAlert(g, mx, my, motion ? t : 0);
      }

      // When the player waits, an arrow shows where to click.
      const idle = t - actedAt > NUDGE_MS;
      if (phase === 'waiting' && idle) paintPointer(g, MAILBOX_RECT.x + 13, MAILBOX_RECT.y + 4, t);
      if (phase === 'home') paintPointer(g, DOOR_RECT.x + 8, DOOR_RECT.y + 12, t);

      // The close-up of the envelope, the letter and the gift.
      if (phase === 'sealed') paintCloseUp(g, t, progress(since, 0, 300) * 0.6, 0, true);
      if (phase === 'opening') paintCloseUp(g, t, 0.6, progress(since, 0, FLAP_MS), false);
      if (phase === 'reading') paintCloseUp(g, t, 0.6, 1, false);
      if (phase === 'gift') {
        paintCloseUp(g, t, 0.6, 1, false);
        paintDriveOut(g, progress(since, 200, 1200), t);
      }
      if (phase === 'sealed' && idle) paintPointer(g, SEAL.x, SEAL.y - 9, t);
    });

    return () => {
      alive = false;
      speech.stop();
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
