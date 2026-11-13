import { audio } from '../../audio/engine.ts';
import { MAILBOX } from '../../content/intro.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import type { GameScene } from '../../game.ts';

import { HERO_HEIGHT, HERO_WIDTH, heroHands, paintHero, type HeroPose } from '../../pixel/hero.ts';
import { PixelStage, progress, px } from '../../pixel/stage.ts';
import { h, prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { Speech } from '../../ui/speech.ts';
import {
  APPLES,
  BUSH_RECT,
  CHARACTER_AT_DOOR,
  CHARACTER_AT_MAILBOX,
  CHARACTER_HOME,
  CHIMNEY_RECT,
  CRITTER_ORDER,
  DOOR_RECT,
  ENVELOPE,
  FEET_MAX_Y,
  FEET_MIN_Y,
  FEET_Y,
  GROUND_RECT,
  MAILBOX_RECT,
  MAIL_SLOT,
  POT_RECT,
  SEAL_RECT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  TREE_RECT,
  paintAlert,
  paintApple,
  paintBackdrop,
  paintBirds,
  paintBush,
  paintCloseUp,
  paintCritter,
  paintDriveOut,
  paintLeaves,
  paintMailbox,
  paintPlant,
  paintPuff,
  paintSmallEnvelope,
  paintSparkles,
  type Critter,
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
  | 'garden'
  | 'home'
  | 'entering';

const QUIET_MS = 1500;
const ARRIVING_MS = 1300;
const FLAP_MS = 650;
/** Walking speed in picture pixels per millisecond. */
const WALK_SPEED = 0.034;
/** Every this many pokes something runs out of the bush. */
const BUSH_EVERY = 3;
/** How many apples the tree is willing to lose. */
const APPLES_TO_DROP = 3;

interface Walk {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly at: number;
  readonly ms: number;
  readonly then?: () => void;
}

/**
 * The opening scene. A letter from "grandma" lands in the mailbox, with a
 * present inside: a flash drive. A loving note, a familiar name and a heart
 * seal make it feel safe to plug in. This is the bait. The garden around it
 * answers to every poke, which is the habit the rest of the game feeds on.
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
    let pose: HeroPose = 'stand';
    let facing: -1 | 0 | 1 = 0;
    let alive = true;
    const holdingPhases: readonly Phase[] = ['garden', 'home', 'walking', 'entering'];
    const free = (): boolean => phase === 'quiet' || phase === 'waiting' || phase === 'home';

    let charX: number = CHARACTER_HOME.x;
    let charY: number = FEET_Y;
    let walk: Walk | null = null;
    const head = (): { x: number; y: number } => ({ x: charX + HERO_WIDTH / 2, y: charY - HERO_HEIGHT - 1 });

    // Little things the garden does when poked.
    let bushPokes = 0;
    let bushAt = -9999;
    let critter: { kind: Critter; at: number } | null = null;
    let critters = 0;
    let treePokes = 0;
    const fallen: { index: number; at: number }[] = [];
    let blooms = 0;
    let puffAt = -9999;

    let phaseAtGift = false;
    const enter = (next: Phase): void => {
      if (next === 'gift') phaseAtGift = true;
      phase = next;
      phaseAt = now;
    };

    const walkTo = (toX: number, toY: number, then?: () => void): void => {
      const dist = Math.hypot(toX - charX, toY - charY);
      const sideways = Math.abs(toX - charX) >= 2;
      facing = !sideways ? 0 : toX > charX ? 1 : -1;
      walk = { fromX: charX, fromY: charY, toX, toY, at: now, ms: Math.max(1, dist / WALK_SPEED), then };
    };

    const say = (text: string, tap = false, below = false): Promise<void> => speech.say(text, head, { who: 'hero', tap, below });
    const poke = (what: string): void => void ctx.witness.record({ scene: SCENE, kind: 'poked', data: { what } });

    // The whole garden floor: a click anywhere on it sends the character there, on the path or off it.
    const ground = stage.hotspot(GROUND_RECT, MAILBOX.groundLabel, (event) => {
      if (!free()) return;
      const box = stage.el.getBoundingClientRect();
      const keyboard = event.detail === 0 || box.width === 0;
      const x = keyboard ? STAGE_WIDTH / 2 : ((event.clientX - box.left) / box.width) * STAGE_WIDTH;
      const y = keyboard ? FEET_Y : ((event.clientY - box.top) / box.height) * STAGE_HEIGHT;
      walkTo(Math.round(Math.min(STAGE_WIDTH - HERO_WIDTH, Math.max(0, x - HERO_WIDTH / 2))), Math.round(Math.min(FEET_MAX_Y, Math.max(FEET_MIN_Y, y))));
    });
    ground.classList.add('scene__hotspot--walk');

    const mailboxSpot = stage.hotspot(MAILBOX_RECT, MAILBOX.mailboxLabel, () => {
      if (phase !== 'waiting') return;
      mailboxSpot.hidden = true;
      speech.hide();
      ctx.witness.record({ scene: SCENE, kind: 'opened-mail', trick: 'baiting', data: { ms: Math.round(now - arrivedAt) } });
      enter('walking');
      walkTo(CHARACTER_AT_MAILBOX.x, FEET_Y, () => {
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
    // Her address sits in the bottom right corner of the envelope's back, well clear of the edge.
    const sender = stage.overlay({ x: ENVELOPE.x + ENVELOPE.w - 52, y: ENVELOPE.y + 25, w: 42, h: 13 }, 'mb-sender');
    sender.append(...MAILBOX.sender.map((line) => h('span', { text: line })));
    sender.hidden = true;
    const slot = stage.overlay({ x: ENVELOPE.x - 6, y: 0, w: ENVELOPE.w + 12, h: ENVELOPE.y + 4 }, 'mb-slot');
    const paper = h(
      'div',
      { class: 'mb-letter', attrs: { role: 'document', 'aria-label': MAILBOX.letterLabel } },
      h('p', { class: 'mb-letter__hi', text: MAILBOX.letter.greeting }),
      h('p', { text: MAILBOX.letter.body }),
      h('p', { class: 'mb-letter__sig', text: MAILBOX.letter.signature }),
    );
    slot.append(paper);
    let letterRead: (() => void) | undefined;
    paper.addEventListener('click', () => letterRead?.());
    slot.hidden = true;

    const doorSpot = stage.hotspot(DOOR_RECT, MAILBOX.doorLabel, () => {
      if (phase !== 'home') return;
      doorSpot.hidden = true;
      speech.hide();
      enter('walking');
      // Along the path to the doorstep, then up to the door.
      walkTo(CHARACTER_AT_DOOR.x + 1, FEET_Y - 2, () =>
        walkTo(CHARACTER_AT_DOOR.x + 1, 77, () => {
          facing = 0;
          enter('entering');
          window.setTimeout(() => {
            if (alive) done();
          }, 700);
        }),
      );
    });
    doorSpot.hidden = true;

    // Clickable bits of the garden. The character comments, things rustle and
    // bloom; nothing more. The reward-for-poking-around habit the game later
    // turns against the player.
    const C = MAILBOX.comments;
    const nosey: { rect: { x: number; y: number; w: number; h: number }; text: string; label: string }[] = [
      { rect: { x: 0, y: 0, w: 60, h: 14 }, text: C.sky.text, label: C.sky.label },
      { rect: { x: 44, y: 38, w: 14, h: 8 }, text: C.heart.text, label: C.heart.label },
      { rect: { x: 22, y: 42, w: 16, h: 16 }, text: C.window.text, label: C.window.label },
    ];
    for (const item of nosey) {
      stage.hotspot(item.rect, item.label, () => {
        if (!free()) return;
        void say(item.text);
        poke(item.label);
      });
    }

    // The apple tree: every other shake an apple lets go.
    stage.hotspot(TREE_RECT, C.tree.label, () => {
      if (!free()) return;
      treePokes++;
      poke(C.tree.label);
      if (treePokes % 2 === 0 && fallen.length < APPLES_TO_DROP) {
        fallen.push({ index: fallen.length, at: now });
        audio.click(60, 0.25);
        window.setTimeout(() => alive && audio.knock(), 520);
        void say(C.apple);
      } else void say(C.tree.text);
    });

    // The bush: it rustles, and every third poke something bolts out of it.
    stage.hotspot(BUSH_RECT, C.bush.label, () => {
      if (!free() || critter) return;
      bushPokes++;
      bushAt = now;
      poke(C.bush.label);
      audio.crunch();
      if (bushPokes % BUSH_EVERY === 0) {
        const kind = CRITTER_ORDER[critters % CRITTER_ORDER.length] ?? 'bunny';
        critters++;
        critter = { kind, at: now + 260 };
        audio.boing(0.3);
        void say(C.bush.out[kind]);
      } else void say(C.bush.rustle[(bushPokes % BUSH_EVERY) - 1] ?? '');
    });

    stage.hotspot(POT_RECT, C.pot.label, () => {
      if (!free()) return;
      void say(C.pot.lines[Math.min(blooms, C.pot.lines.length - 1)] ?? '');
      if (blooms < 4) {
        blooms++;
        audio.click(88, 0.3);
      }
      poke(C.pot.label);
    });

    stage.hotspot(CHIMNEY_RECT, C.chimney.label, () => {
      if (!free()) return;
      puffAt = now;
      audio.click(52, 0.2);
      void say(C.chimney.text);
      poke(C.chimney.label);
    });

    async function readLetter(): Promise<void> {
      sender.hidden = true;
      slot.hidden = false;
      // The player reads at their own pace; a click on the letter puts it away.
      await new Promise<void>((resolve) => {
        letterRead = resolve;
      });
      letterRead = undefined;
      if (!alive) return;
      slot.classList.add('mb-slot--away');
      audio.click(70, 0.3);
      await sleep(500);
      if (!alive) return;
      slot.hidden = true;
      // The present slides out of the envelope.
      enter('gift');
      audio.treasure();
      await sleep(2000);
      if (!alive) return;
      enter('garden');
      pose = 'hold';
      await sleep(450);
      if (!alive) return;
      await say(MAILBOX.fromGrandma, true);
      if (!alive) return;
      pose = 'happy';
      await say(MAILBOX.curious);
      if (!alive) return;
      enter('home');
      doorSpot.hidden = false;
      await sleep(900);
      if (alive && phase === 'home') pose = 'hold';
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
        charX = walk.fromX + (walk.toX - walk.fromX) * u;
        charY = walk.fromY + (walk.toY - walk.fromY) * u;
        walking = u < 1;
        if (!walking) {
          const then = walk.then;
          walk = null;
          then?.();
          walking = walk !== null;
        }
      }

      paintBackdrop(g, t, motion, fallen.length);
      if (motion) paintBirds(g, t);
      if (t - puffAt < 1400) paintPuff(g, (t - puffAt) / 1400);

      // Apples that let go: they drop, bounce once and stay in the grass.
      for (const apple of fallen) {
        const from = APPLES[apple.index];
        if (!from) continue;
        const u = Math.min(1, (t - apple.at) / 520);
        const land = 80 + (apple.index % 2);
        const bounce = u < 1 ? 0 : Math.max(0, Math.sin(Math.min(1, (t - apple.at - 520) / 260) * Math.PI)) * 3;
        paintApple(g, from[0] - apple.index, from[1] + (land - from[1]) * u * u - bounce);
      }

      // Everything that stands on the grass, drawn from the back to the front.
      const sinceArrived = t - arrivedAt;
      const rattle = motion && phase === 'waiting' && sinceArrived < 600 ? Math.round(Math.sin(t / 45) * 2) : 0;
      const holding = holdingPhases.includes(phase) && phaseAtGift;
      const sinceBush = t - bushAt;
      const things: { y: number; paint: () => void }[] = [
        {
          y: 85,
          paint: () => {
            g.save();
            g.translate(rattle, 0);
            paintMailbox(g, phase !== 'quiet' && phase !== 'arriving');
            g.restore();
          },
        },
        { y: 92, paint: () => paintPlant(g, blooms) },
        {
          y: BUSH_RECT.y + BUSH_RECT.h,
          paint: () => {
            paintBush(g, motion && sinceBush < 420 ? Math.round(Math.sin(sinceBush / 28)) : 0);
            if (sinceBush < 520) paintLeaves(g, sinceBush / 520);
          },
        },
        {
          y: charY,
          paint: () => {
            if (phase === 'entering' && since >= 350) return;
            if (phase === 'entering') g.globalAlpha = 1 - since / 350;
            // Sideways it is the walk cycle; straight up or down the front view bobs along.
            const sideways = walking && facing !== 0;
            const shown: HeroPose = sideways ? 'walk' : walking && pose === 'happy' ? 'stand' : pose;
            const bob = walking && !sideways && motion ? Math.floor(t / 125) % 2 : 0;
            paintHero(g, charX, charY - bob, { pose: shown, facing: sideways ? facing : 0, t, motion });
            if (holding && !sideways && shown === 'hold') {
              const hand = heroHands(charX, charY - bob);
              // The little pink drive lies across both palms.
              px(g, '#c9c9d1', hand.x + 3, hand.y - 1, 2, 2);
              px(g, '#d4537e', hand.x - 4, hand.y - 2, 7, 4);
              px(g, '#ed93b1', hand.x - 4, hand.y - 2, 6, 3);
              px(g, '#ffffff', hand.x - 3, hand.y - 1, 2, 1);
            }
            g.globalAlpha = 1;
          },
        },
      ];
      things.sort((a, b) => a.y - b.y);
      for (const thing of things) thing.paint();

      // Whatever ran out of the bush dashes off to the left and is gone.
      if (critter && t >= critter.at) {
        const x = BUSH_RECT.x + 2 - (t - critter.at) * 0.085;
        if (x < -12) critter = null;
        else paintCritter(g, critter.kind, x, 98, motion ? t : 0);
      }

      if (phase === 'arriving') {
        // The letter sails in from the right in an arc and drops into the slot.
        const u = progress(since, 0, ARRIVING_MS);
        paintSmallEnvelope(g, 170 + (MAIL_SLOT.x - 170) * u, 14 + (MAIL_SLOT.y - 14) * u - Math.sin(u * Math.PI) * 18);
      }

      // A small "!" over the mailbox says there is something in it; sparkles by the door say "this way".
      if (phase === 'waiting') paintAlert(g, MAILBOX_RECT.x + 12, MAILBOX_RECT.y - 6, motion ? t : 0);
      if (phase === 'home' && motion) paintSparkles(g, DOOR_RECT, t);

      // The close-up of the envelope, the letter and the gift.
      if (phase === 'sealed') paintCloseUp(g, t, progress(since, 0, 300) * 0.6, 0, motion);
      if (phase === 'opening') paintCloseUp(g, t, 0.6, progress(since, 0, FLAP_MS), false);
      if (phase === 'reading') paintCloseUp(g, t, 0.6, 1, false);
      if (phase === 'gift') {
        paintCloseUp(g, t, 0.6, 1, false);
        paintDriveOut(g, progress(since, 200, 1200), t);
      }
      if (phase === 'garden' && since < 400) {
        // The close-up fades back into the garden.
        g.globalAlpha = 1 - since / 400;
        paintCloseUp(g, t, 0.6, 1, false);
        paintDriveOut(g, 1, t);
        g.globalAlpha = 1;
      }
    });

    return () => {
      alive = false;
      speech.stop();
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
