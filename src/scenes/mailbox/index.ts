import { audio } from '../../audio/engine.ts';
import { MAILBOX } from '../../content/intro.ts';
import type { GameScene } from '../../game.ts';
import { CHARACTER_WIDTH, paintCharacter, paintDrive, type Pose } from '../../pixel/cast.ts';
import { PixelStage, progress } from '../../pixel/stage.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import {
  CHARACTER_AT_MAILBOX,
  CHARACTER_HOME,
  ENVELOPE_RECT,
  MAILBOX_RECT,
  MAIL_SLOT,
  PATH_RECT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  paintAlert,
  paintBackdrop,
  paintBirds,
  paintCloseUp,
  paintMailbox,
  paintPlant,
  paintQuestion,
  paintSmallEnvelope,
} from './art.ts';

const SCENE = 'mailbox';

type Phase = 'quiet' | 'arriving' | 'waiting' | 'walking' | 'letter' | 'opening' | 'amazed';

const QUIET_MS = 1600;
const ARRIVING_MS = 1300;
const OPENING_MS = 2200;
/** Walking speed in picture pixels per millisecond. */
const WALK_SPEED = 0.04;

/**
 * The opening scene. A letter with no return address lands in the mailbox and
 * there is a flash drive in it. Nothing tells the player to open it; the
 * mailbox just wants attention. This is the bait.
 */
export const mailbox: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_WIDTH, STAGE_HEIGHT, MAILBOX.sceneLabel);
    const caption = h('p', { class: 'scene__caption', attrs: { 'aria-live': 'polite' } });
    const actions = h('div', { class: 'scene__actions' });
    ctx.scenery.replaceChildren(stage.el, caption, actions);

    let phase: Phase = 'quiet';
    let phaseAt = 0;
    let now = 0;
    let arrivedAt = 0;

    // Where the character stands, and an optional walk in progress.
    let charX: number = CHARACTER_HOME.x;
    let walk: { from: number; to: number; at: number; ms: number; then?: () => void } | null = null;

    const enter = (next: Phase): void => {
      phase = next;
      phaseAt = now;
    };

    const walkTo = (to: number, then?: () => void): void => {
      const from = charX;
      const ms = Math.max(1, Math.abs(to - from) / WALK_SPEED);
      walk = { from, to, at: now, ms, then };
    };

    // Click the path to stroll there. Pure fun, until it isn't.
    stage.hotspot(PATH_RECT, MAILBOX.pathLabel, (event) => {
      if (phase !== 'quiet' && phase !== 'waiting') return;
      const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const fx = event.detail === 0 || box.width === 0 ? 0.5 : (event.clientX - box.left) / box.width;
      const target = PATH_RECT.x + Math.min(1, Math.max(0, fx)) * PATH_RECT.w - CHARACTER_WIDTH / 2;
      walkTo(Math.round(Math.min(CHARACTER_AT_MAILBOX.x, Math.max(PATH_RECT.x - 2, target))));
    });

    const mailboxSpot = stage.hotspot(MAILBOX_RECT, MAILBOX.mailboxLabel, () => {
      if (phase !== 'waiting') return;
      mailboxSpot.hidden = true;
      ctx.witness.record({
        scene: SCENE,
        kind: 'opened-mail',
        trick: 'baiting',
        data: { ms: Math.round(now - arrivedAt) },
      });
      enter('walking');
      walkTo(CHARACTER_AT_MAILBOX.x, () => {
        enter('letter');
        caption.textContent = MAILBOX.letter;
        envelopeSpot.hidden = false;
        envelopeSpot.focus();
      });
    });
    mailboxSpot.hidden = true;

    // The letter only opens when the player opens it.
    const envelopeSpot = stage.hotspot(ENVELOPE_RECT, MAILBOX.letterLabel, () => {
      if (phase !== 'letter') return;
      envelopeSpot.hidden = true;
      enter('opening');
    });
    envelopeSpot.hidden = true;

    // Clickable bits of the garden: the character comments, nothing more. The
    // reward-for-poking-around habit the game later turns against the player.
    const C = MAILBOX.comments;
    const nosey: { rect: { x: number; y: number; w: number; h: number }; text: string; label: string }[] = [
      { rect: { x: 134, y: 6, w: 26, h: 32 }, text: C.tree.text, label: C.tree.label },
      { rect: { x: 0, y: 0, w: 70, h: 26 }, text: C.sky.text, label: C.sky.label },
      { rect: { x: 44, y: 38, w: 14, h: 10 }, text: C.heart.text, label: C.heart.label },
      { rect: { x: 22, y: 42, w: 16, h: 16 }, text: C.window.text, label: C.window.label },
    ];
    for (const item of nosey) {
      stage.hotspot(item.rect, item.label, () => {
        if (phase !== 'quiet' && phase !== 'waiting') return;
        caption.textContent = item.text;
        ctx.witness.record({ scene: SCENE, kind: 'poked', data: { what: item.label } });
      });
    }

    stage.run((g, t) => {
      now = t;
      const p = t - phaseAt;

      if (phase === 'quiet' && p >= QUIET_MS) {
        enter('arriving');
        caption.textContent = MAILBOX.arrived;
      }
      if (phase === 'arriving' && p >= ARRIVING_MS) {
        enter('waiting');
        arrivedAt = t;
        caption.textContent = MAILBOX.wow;
        mailboxSpot.hidden = false;
      }
      if (phase === 'opening' && p >= OPENING_MS) {
        enter('amazed');
        audio.treasure();
        caption.textContent = MAILBOX.found;
        const go = h('button', { class: 'btn', text: MAILBOX.go, attrs: { type: 'button' }, on: { click: done } });
        actions.replaceChildren(go);
        go.focus();
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

      const since = t - phaseAt;
      paintBackdrop(g, t, motion);
      paintPlant(g);
      if (motion) paintBirds(g, t);

      // When the letter lands the mailbox rattles for a moment.
      const sinceArrived = now - arrivedAt;
      const rattle = motion && phase === 'waiting' && sinceArrived < 600 ? Math.round(Math.sin(now / 45) * 2) : 0;
      g.save();
      g.translate(rattle, 0);
      paintMailbox(g, phase !== 'quiet' && phase !== 'arriving');
      g.restore();

      if (phase === 'arriving') {
        // The letter sails in from the right in an arc and drops into the slot.
        const u = progress(since, 0, ARRIVING_MS);
        paintSmallEnvelope(g, 170 + (MAIL_SLOT.x - 170) * u, 20 + (MAIL_SLOT.y - 20) * u - Math.sin(u * Math.PI) * 18);
      }

      // The character: a two-frame walk with a little bob, or standing still.
      const y = CHARACTER_HOME.y;
      if (phase === 'amazed') {
        const jump = motion && since < 700 ? Math.round(Math.abs(Math.sin(since / 110)) * 3) : 0;
        paintCharacter(g, 'amazed', charX, y - jump);
        paintDrive(g, charX + (CHARACTER_WIDTH - 6) / 2, y - 12 - jump);
        paintAlert(g, charX + CHARACTER_WIDTH + 2, y - 10, motion ? t : 0);
      } else {
        const frame: Pose = walking ? (Math.floor(t / 150) % 2 ? 'walkA' : 'walkB') : 'stand';
        const bob = walking && motion && Math.floor(t / 150) % 2 ? -1 : 0;
        paintCharacter(g, frame, charX, y + bob);
      }

      // A "?" over the character turns into a "!" as the surprise sinks in.
      if (phase === 'waiting') {
        const mx = charX + 6;
        const my = y - 10;
        if (sinceArrived < 900) paintQuestion(g, mx, my, motion ? t : 0);
        else paintAlert(g, mx, my, motion ? t : 0);
      }

      // The close-up: the closed letter waits, lower on screen, until clicked.
      if (phase === 'letter') paintCloseUp(g, 0.2, t);
      if (phase === 'opening') paintCloseUp(g, 0.25 + 0.75 * progress(since, 0, OPENING_MS), t);
    });

    return () => {
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
