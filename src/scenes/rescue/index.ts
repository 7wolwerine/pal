import { RESCUE } from '../../content/rescue.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage, px } from '../../pixel/stage.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import { sprite, type SpriteId } from '../../ui/sprites.ts';
import {
  E,
  N,
  S,
  W,
  createLayout,
  isConnected,
  rotateCW,
  rotatePiece,
  type Dir,
  type PipeLayout,
} from './model.ts';

const SCENE = 'rescue';
const STAGE_W = 164;
const STAGE_H = 104;

// Pipe grid geometry, in picture pixels.
const CELL = 26;
const GRID_X = 80;
const GRID_Y = 16;
const TANK = { x: 6, y: 16, w: 66, h: 80 };

const RISE_PER_S = 1 / 20; // ~20 s of air per attempt
const DRAIN_PER_S = 1 / 3;

const C = {
  room: '#13243a',
  roomLo: '#0d1a2c',
  glass: '#2b4a6b',
  glassHi: '#5f86ad',
  water: '#2f7fd6',
  waterHi: '#5aa7ef',
  pipe: '#6b7682',
  pipeLit: '#3fb0e0',
  pipeDark: '#434c56',
  metal: '#9aa3ad',
  spout: '#c7d2db',
  danger: '#e24b4a',
} as const;

/** Rotates each movable piece a random amount; reruns until it is not already solved. */
function scramble(layout: PipeLayout): void {
  do {
    for (const piece of layout.pieces) {
      if (piece.fixed) continue;
      const turns = Math.floor(Math.random() * 4);
      for (let i = 0; i < turns; i++) piece.openings = rotateCW(piece.openings);
    }
  } while (isConnected(layout));
}

const ARM: Record<Dir, [number, number, number, number]> = {
  // dx,dy from centre to edge for a 4px-wide arm
  [N]: [-2, -13, 4, 13],
  [E]: [0, -2, 13, 4],
  [S]: [-2, 0, 4, 13],
  [W]: [-13, -2, 13, 4],
};

function drawPipes(g: CanvasRenderingContext2D, layout: PipeLayout, lit: boolean): void {
  for (const piece of layout.pieces) {
    const cx = GRID_X + piece.col * CELL + CELL / 2;
    const cy = GRID_Y + piece.row * CELL + CELL / 2;
    const colour = piece.fixed ? C.metal : lit ? C.pipeLit : C.pipe;
    // socket tile
    px(g, C.pipeDark, cx - 11, cy - 11, 22, 22);
    for (const dir of [N, E, S, W] as Dir[]) {
      if (!(piece.openings & dir)) continue;
      const [ox, oy, w, hh] = ARM[dir];
      px(g, colour, cx + ox, cy + oy, w, hh);
    }
    px(g, colour, cx - 3, cy - 3, 6, 6); // hub
  }
}

export const rescue: GameScene = {
  id: SCENE,
  surface: 'scenery',
  mount(ctx, done) {
    const motion = !prefersReducedMotion();
    const stage = new PixelStage(STAGE_W, STAGE_H, RESCUE.sceneLabel);
    const caption = h('p', { class: 'scene__caption', attrs: { 'aria-live': 'polite' } });
    const actions = h('div', { class: 'scene__actions' });
    ctx.scenery.replaceChildren(stage.el, caption, actions);

    const look: SpriteId = ctx.profile.assistantLook ?? 'pal';
    const avatar = sprite(look);
    const layout = createLayout();
    scramble(layout);

    type Phase = 'play' | 'draining' | 'dead' | 'won';
    let phase: Phase = 'play';
    let water = 0;
    let deaths = 0;
    let threatened = false;
    let lastT = 0;

    caption.textContent = RESCUE.intro[0] ?? '';
    witnessAttempt();

    function witnessAttempt(): void {
      ctx.witness.record({ scene: SCENE, kind: 'attempt', trick: 'guilt-trip', data: { deaths } });
    }

    // One clickable rotation hotspot per movable pipe.
    for (const piece of layout.pieces) {
      if (piece.fixed) continue;
      const n = layout.pieces.indexOf(piece) + 1;
      stage.hotspot(
        { x: GRID_X + piece.col * CELL, y: GRID_Y + piece.row * CELL, w: CELL, h: CELL },
        RESCUE.pipeLabel(n),
        () => {
          if (phase !== 'play') return;
          rotatePiece(layout, piece.id);
          ctx.witness.tally('pipe-turn');
        },
      );
    }

    function die(): void {
      phase = 'dead';
      deaths++;
      water = 1;
      caption.textContent = RESCUE.died[Math.min(deaths, RESCUE.died.length) - 1] ?? '';
      ctx.witness.record({ scene: SCENE, kind: 'death', data: { deaths } });
      window.setTimeout(() => {
        if (phase !== 'dead') return;
        scramble(layout);
        threatened = false;
        water = 0;
        phase = 'play';
        caption.textContent = RESCUE.intro[Math.min(deaths, RESCUE.intro.length - 1)] ?? '';
        witnessAttempt();
      }, 2600);
    }

    function win(): void {
      phase = 'won';
      ctx.witness.record({ scene: SCENE, kind: 'saved', trick: 'guilt-trip', data: { deaths } });
      caption.textContent = RESCUE.saved;
      const go = h('button', { class: 'btn', text: RESCUE.go, attrs: { type: 'button' }, on: { click: done } });
      actions.replaceChildren(go);
      go.focus();
    }

    stage.run((g, t) => {
      // Real elapsed seconds since the last frame, capped so that tabbing away
      // for a while cannot dump the whole tank at once. Works at any frame rate.
      const dt = lastT ? Math.min(1, (t - lastT) / 1000) : 0;
      lastT = t;

      if (phase === 'play') {
        water = Math.min(1, water + RISE_PER_S * dt);
        if (isConnected(layout)) {
          phase = 'draining';
          caption.textContent = RESCUE.saved;
        } else if (water >= 1) {
          die();
        } else if (deaths >= 2 && water > 0.68 && !threatened) {
          threatened = true;
          caption.textContent = RESCUE.threat;
        }
      } else if (phase === 'draining') {
        water = Math.max(0, water - DRAIN_PER_S * dt);
        if (water <= 0) win();
      }

      paintScene(g, t);
    });

    function paintScene(g: CanvasRenderingContext2D, t: number): void {
      px(g, C.room, 0, 0, STAGE_W, STAGE_H);
      px(g, C.roomLo, 0, STAGE_H - 10, STAGE_W, 10);

      // Tank glass.
      px(g, C.glass, TANK.x - 2, TANK.y - 2, TANK.w + 4, TANK.h + 4);
      px(g, C.roomLo, TANK.x, TANK.y, TANK.w, TANK.h);

      // Water fills from the bottom.
      const wh = Math.round(TANK.h * water);
      const wy = TANK.y + TANK.h - wh;
      if (wh > 0) {
        px(g, C.water, TANK.x, wy, TANK.w, wh);
        const wob = motion ? Math.round(Math.sin(t / 300) * 1.5) : 0;
        px(g, C.waterHi, TANK.x, wy + wob, TANK.w, 2);
      }

      // The trapped assistant, bobbing as the water climbs.
      const panic = phase === 'play' && water > 0.5;
      const bob = motion ? Math.round(Math.sin(t / (panic ? 110 : 320)) * (panic ? 3 : 1)) : 0;
      const ax = TANK.x + TANK.w / 2 - 18;
      const ay = TANK.y + 8 + bob;
      g.drawImage(avatar, ax, ay, 36, 36);
      if (panic) {
        // little distress marks
        px(g, C.danger, ax + 2, ay - 3, 2, 4);
        px(g, C.danger, ax + 32, ay - 2, 2, 4);
      }

      // Inflow spout above the grid, dripping into the pipes.
      px(g, C.spout, GRID_X - 4, GRID_Y - 8, 10, 6);
      if (motion && phase === 'play' && Math.floor(t / 200) % 2 === 0) {
        px(g, C.waterHi, GRID_X + 1, GRID_Y - 2, 2, 3);
      }

      const lit = phase === 'draining' || phase === 'won';
      drawPipes(g, layout, lit);

      // Drain mouth at the bottom-right of the grid.
      px(g, C.metal, GRID_X + 2 * CELL + CELL / 2 - 3, GRID_Y + 3 * CELL - 2, 6, 10);
    }

    return () => {
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
