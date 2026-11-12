import { MAILBOX } from '../../content/intro.ts';
import type { GameScene } from '../../game.ts';
import { CHARACTER_WIDTH, paintCharacter, paintDrive } from '../../pixel/cast.ts';
import { PixelStage, progress } from '../../pixel/stage.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import {
  CHARACTER_AT_MAILBOX,
  CHARACTER_HOME,
  MAILBOX_RECT,
  MAIL_SLOT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  paintAlert,
  paintBackdrop,
  paintBirds,
  paintCloseUp,
  paintMailbox,
  paintPlant,
  paintSmallEnvelope,
} from './art.ts';

const SCENE = 'mailbox';

type Phase = 'quiet' | 'arriving' | 'waiting' | 'walking' | 'opening' | 'amazed';

const QUIET_MS = 1600;
const ARRIVING_MS = 1300;
const WALKING_MS = 1300;
const OPENING_MS = 3200;

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

    const enter = (next: Phase): void => {
      phase = next;
      phaseAt = now;
    };

    const hotspot = stage.hotspot(MAILBOX_RECT, MAILBOX.mailboxLabel, () => {
      if (phase !== 'waiting') return;
      hotspot.hidden = true;
      ctx.witness.record({
        scene: SCENE,
        kind: 'opened-mail',
        trick: 'baiting',
        data: { ms: Math.round(now - arrivedAt) },
      });
      enter('walking');
    });
    hotspot.hidden = true;

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

      if (phase === 'quiet' && p >= QUIET_MS) enter('arriving');
      if (phase === 'arriving' && p >= ARRIVING_MS) {
        enter('waiting');
        arrivedAt = t;
        caption.textContent = MAILBOX.arrived;
        hotspot.hidden = false;
      }
      if (phase === 'walking' && p >= WALKING_MS) enter('opening');
      if (phase === 'opening' && p >= OPENING_MS) {
        enter('amazed');
        caption.textContent = MAILBOX.found;
        const go = h('button', { class: 'btn', text: MAILBOX.go, attrs: { type: 'button' }, on: { click: done } });
        actions.replaceChildren(go);
        go.focus();
      }

      const since = t - phaseAt;
      paintBackdrop(g, t, motion);
      paintPlant(g);
      if (motion) paintBirds(g, t);
      paintMailbox(g, phase !== 'quiet' && phase !== 'arriving');

      if (phase === 'arriving') {
        // The letter sails in from the right in an arc and drops into the slot.
        const u = progress(since, 0, ARRIVING_MS);
        paintSmallEnvelope(g, 170 + (MAIL_SLOT.x - 170) * u, 20 + (MAIL_SLOT.y - 20) * u - Math.sin(u * Math.PI) * 18);
      }
      if (phase === 'waiting') paintAlert(g, 123, 40, motion ? t : 0);

      // The character.
      if (phase === 'walking') {
        const u = progress(since, 0, WALKING_MS);
        const x = CHARACTER_HOME.x + (CHARACTER_AT_MAILBOX.x - CHARACTER_HOME.x) * u;
        paintCharacter(g, Math.floor(since / 160) % 2 ? 'step' : 'stand', x, CHARACTER_HOME.y);
      } else if (phase === 'amazed') {
        const jump = motion && since < 700 ? Math.round(Math.abs(Math.sin(since / 110)) * 3) : 0;
        const { x, y } = CHARACTER_AT_MAILBOX;
        paintCharacter(g, 'amazed', x, y - jump);
        paintDrive(g, x + (CHARACTER_WIDTH - 6) / 2, y - 12 - jump);
        paintAlert(g, x + 14, y - 12, motion ? t : 0);
      } else {
        const at = phase === 'opening' ? CHARACTER_AT_MAILBOX : CHARACTER_HOME;
        paintCharacter(g, 'stand', at.x, at.y);
      }

      if (phase === 'opening') paintCloseUp(g, progress(since, 0, OPENING_MS), t);
    });

    return () => {
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
