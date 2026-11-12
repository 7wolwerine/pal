import { audio } from '../../audio/engine.ts';
import { RESCUE } from '../../content/rescue.ts';
import { ROLES } from '../../content/roles.ts';
import type { GameScene } from '../../game.ts';
import { PixelStage, px } from '../../pixel/stage.ts';
import { bugWarns } from '../../ui/bug-cameo.ts';
import { h, prefersReducedMotion } from '../../ui/dom.ts';
import { sprite, type SpriteId } from '../../ui/sprites.ts';
import { DIRS, E, N, S, W, createLayout, isConnected, rotateCW, rotatePiece, wetPieces, type Dir, type PipeLayout } from './model.ts';

const SCENE = 'rescue';
const STAGE_W = 164;
const STAGE_H = 104;

// Geometry, in picture pixels.
const CELL = 20;
const GRID_X = 72;
const GRID_Y = 12;
const FLOOR_Y = 92;
const TANK = { x: 6, y: 16, w: 54, h: 76 };
const TAP_X = TANK.x + 14;
/** The tank's outlet pipe runs from the tank wall into the grid at this height. */
const OUTLET_Y = GRID_Y + 3 * CELL + CELL / 2;
const DRAIN_X = GRID_X + 3 * CELL + CELL / 2;

const RISE_PER_S = 1 / 30; // ~30 s of air per attempt
const DRAIN_PER_S = 1 / 3.5;
/** How fast the water runs along newly joined pipes, ms per piece. */
const FLOW_MS = 70;
const TURN_MS = 120;

const C = {
  room: '#1b2a40',
  roomLo: '#14213a',
  brick: '#22324b',
  floor: '#2c3a52',
  floorLo: '#232f45',
  glass: '#6f9cc4',
  glassHi: '#b9dcf5',
  water: '#2f7fd6',
  waterLo: '#2468b5',
  waterHi: '#8cc8f7',
  pipe: '#a9b4bf',
  pipeHi: '#d7dee5',
  pipeLo: '#6c7783',
  pipeOut: '#3b4552',
  rust: '#8a5a3a',
  rustHi: '#b07a52',
  rustLo: '#5e3b25',
  socket: '#26344a',
  grate: '#11192a',
  danger: '#ff6b6b',
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

/** One pipe arm from the centre of a cell towards a side, as [x, y, w, h] relative to the centre. */
function arm(dir: Dir, half: number, r: number): [number, number, number, number] {
  switch (dir) {
    case N:
      return [-r, -half, r * 2, half];
    case E:
      return [0, -r, half, r * 2];
    case S:
      return [-r, 0, r * 2, half];
    case W:
      return [-half, -r, half, r * 2];
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
    let water = 0.18;
    let deaths = 0;
    let threatened = false;
    let lastT = 0;
    let now = 0;
    /** When the pipes last changed, so the water can run along them from there. */
    let flowFrom = 0;
    let wet = wetPieces(layout);
    const turnedAt = new Map<string, number>();
    const bubbles: { x: number; y: number; born: number }[] = [];

    // The first plea leans on the role the player accepted at the start.
    caption.textContent = ctx.profile.role ? ROLES[ctx.profile.role].rescue : (RESCUE.intro[0] ?? '');
    witnessAttempt();

    function witnessAttempt(): void {
      ctx.witness.record({ scene: SCENE, kind: 'attempt', trick: 'guilt-trip', data: { deaths } });
    }

    // One clickable hotspot per pipe that turns.
    for (const piece of layout.pieces) {
      if (piece.fixed) continue;
      const n = layout.pieces.indexOf(piece) + 1;
      stage.hotspot(
        { x: GRID_X + piece.col * CELL, y: GRID_Y + piece.row * CELL, w: CELL, h: CELL },
        RESCUE.pipeLabel(n),
        () => {
          if (phase !== 'play') return;
          rotatePiece(layout, piece.id);
          turnedAt.set(piece.id, now);
          ctx.witness.tally('pipe-turn');
          audio.click(64 + ((piece.col + piece.row) % 4) * 2, 0.45);
          const before = wet.length;
          wet = wetPieces(layout);
          flowFrom = now;
          if (wet.length > before) audio.click(84, 0.25);
        },
      );
    }

    function die(): void {
      phase = 'dead';
      deaths++;
      water = 1;
      caption.textContent = RESCUE.died[Math.min(deaths, RESCUE.died.length) - 1] ?? '';
      ctx.witness.record({ scene: SCENE, kind: 'death', data: { deaths } });
      if (deaths === 1) void bugWarns(ctx, stage.el, 'rescue', { side: 'left', mood: 'angry' });
      window.setTimeout(() => {
        if (phase !== 'dead') return;
        scramble(layout);
        wet = wetPieces(layout);
        flowFrom = now;
        threatened = false;
        water = 0.18;
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
      now = t;

      if (phase === 'play') {
        water = Math.min(1, water + RISE_PER_S * dt);
        // The water has to have run all the way through before the tank drains.
        if (isConnected(layout) && t - flowFrom > wet.length * FLOW_MS) {
          phase = 'draining';
          audio.gurgle(2.4);
        } else if (water >= 1) {
          die();
        } else if (deaths >= 2 && water > 0.7 && !threatened) {
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
      const tapOn = phase === 'play' || phase === 'dead';
      const flowing = phase === 'draining' || (phase === 'won' && water > 0);

      // Room: a cellar wall and a floor.
      px(g, C.room, 0, 0, STAGE_W, STAGE_H);
      for (let y = 4; y < FLOOR_Y; y += 8) {
        const off = (y / 8) % 2 ? 0 : 8;
        for (let x = off; x < STAGE_W; x += 16) px(g, C.brick, x, y, 15, 1);
      }
      px(g, C.floor, 0, FLOOR_Y, STAGE_W, STAGE_H - FLOOR_Y);
      px(g, C.floorLo, 0, FLOOR_Y, STAGE_W, 1);

      const level = Math.round(TANK.h * water);
      const surface = TANK.y + TANK.h - level;
      // Tank: water first, then the glass over it.
      px(g, C.roomLo, TANK.x, TANK.y, TANK.w, TANK.h);
      if (level > 0) {
        px(g, C.water, TANK.x, surface, TANK.w, level);
        px(g, C.waterLo, TANK.x, surface + Math.floor(level / 2), TANK.w, Math.ceil(level / 2));
        const wob = motion ? Math.round(Math.sin(t / 260) * 1) : 0;
        px(g, C.waterHi, TANK.x, surface + wob, TANK.w, 1);
        if (tapOn && motion) {
          // splash where the stream hits the surface
          const s = Math.floor(t / 120) % 3;
          px(g, C.waterHi, TAP_X - 1 - s, surface - 1 - (s % 2), 1, 1);
          px(g, C.waterHi, TAP_X + 5 + s, surface - 1 - ((s + 1) % 2), 1, 1);
        }
      }

      // The trapped assistant floats on the surface, panicking as it nears the lid.
      const panic = phase === 'play' && water > 0.55;
      const bob = motion ? Math.round(Math.sin(t / (panic ? 110 : 320)) * (panic ? 2 : 1)) : 0;
      const size = 30;
      const ax = TANK.x + TANK.w / 2 - size / 2 + 4;
      const ay = Math.max(TANK.y + 1, Math.min(TANK.y + TANK.h - size, surface - size + 10)) + bob;
      g.drawImage(avatar, ax, ay, size, size);
      if (panic) {
        px(g, C.danger, ax - 3, ay + 2, 2, 5);
        px(g, C.danger, ax + size + 1, ay + 3, 2, 5);
      }
      if (phase === 'dead' && motion) {
        if (bubbles.length < 12 && Math.random() < 0.3) bubbles.push({ x: ax + 6 + Math.random() * 18, y: ay + 8, born: t });
      }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (!b) continue;
        const by = b.y - (t - b.born) / 40;
        if (by < TANK.y + 2) bubbles.splice(i, 1);
        else px(g, C.waterHi, Math.round(b.x), Math.round(by), 2, 2);
      }
      if (phase !== 'dead') bubbles.length = 0;

      // Glass walls, lid and a highlight.
      px(g, C.glass, TANK.x - 2, TANK.y - 2, 2, TANK.h + 4);
      px(g, C.glass, TANK.x + TANK.w, TANK.y - 2, 2, TANK.h + 4);
      px(g, C.glass, TANK.x - 2, TANK.y + TANK.h, TANK.w + 4, 2);
      px(g, C.pipeLo, TANK.x - 3, TANK.y - 3, TAP_X - TANK.x + 2, 2);
      px(g, C.pipeLo, TAP_X + 5, TANK.y - 3, TANK.x + TANK.w + 3 - (TAP_X + 5), 2);
      px(g, C.glassHi, TANK.x + 3, TANK.y + 4, 1, 22);

      // The tap above the tank, and its stream pouring in.
      px(g, C.pipeLo, 0, 3, TAP_X + 4, 5);
      px(g, C.pipe, 0, 4, TAP_X + 3, 3);
      px(g, C.pipe, TAP_X, 4, 5, 9);
      px(g, C.pipeHi, TAP_X + 1, 4, 1, 9);
      px(g, C.pipeLo, TAP_X - 1, 12, 7, 2);
      px(g, C.rust, TAP_X - 2, 1, 9, 2); // handle

      if (tapOn) {
        const wob = motion ? Math.floor(t / 90) % 2 : 0;
        px(g, C.waterHi, TAP_X + 1 + wob, 14, 2, Math.max(0, surface - 14));
        px(g, C.water, TAP_X + 2 - wob, 14, 1, Math.max(0, surface - 14));
      }

      // The outlet: from the tank wall into the first pipe of the grid.
      drawRun(g, TANK.x + TANK.w + 2, OUTLET_Y, GRID_X - (TANK.x + TANK.w + 2), true, level > TANK.y + TANK.h - OUTLET_Y - 3, flowing, t);
      px(g, C.rust, TANK.x + TANK.w + 3, OUTLET_Y - 5, 3, 10); // flange

      // The grid of pipes.
      px(g, C.socket, GRID_X - 1, GRID_Y - 1, 4 * CELL + 2, 4 * CELL + 2);
      const wetAt = new Map(wet.map((p, i) => [p.id, i] as const));
      for (const piece of layout.pieces) {
        const cx = GRID_X + piece.col * CELL + CELL / 2;
        const cy = GRID_Y + piece.row * CELL + CELL / 2;
        px(g, (piece.col + piece.row) % 2 ? C.room : C.roomLo, cx - CELL / 2, cy - CELL / 2, CELL, CELL);
        if (piece.fixed) {
          drawRust(g, cx, cy);
          continue;
        }
        const order = wetAt.get(piece.id);
        const isWet = order !== undefined && (t - flowFrom >= order * FLOW_MS || phase !== 'play');
        const turned = turnedAt.get(piece.id);
        const turn = turned === undefined ? 1 : Math.min(1, (t - turned) / TURN_MS);
        g.save();
        g.translate(cx, cy);
        if (motion && turn < 1) g.rotate(-(1 - turn) * (Math.PI / 2));
        drawPiece(g, piece.openings, isWet, flowing, t);
        g.restore();
      }

      // The drain: down out of the last cell, through the floor grate.
      const drainWet = flowing;
      drawRun(g, DRAIN_X, GRID_Y + 4 * CELL, FLOOR_Y + 3 - (GRID_Y + 4 * CELL), false, drainWet, flowing, t);
      px(g, C.grate, DRAIN_X - 7, FLOOR_Y + 3, 14, 5);
      for (let x = DRAIN_X - 6; x < DRAIN_X + 7; x += 3) px(g, C.pipeLo, x, FLOOR_Y + 3, 1, 5);
      if (drainWet && motion) {
        const s = Math.floor(t / 100) % 4;
        px(g, C.waterHi, DRAIN_X - 4 - s, FLOOR_Y + 1, 1, 1);
        px(g, C.waterHi, DRAIN_X + 4 + s, FLOOR_Y + 1, 1, 1);
      }
    }

    /** A straight bit of fixed pipe, horizontal or vertical, with water inside when it carries any. */
    function drawRun(g: CanvasRenderingContext2D, x: number, y: number, len: number, horizontal: boolean, hasWater: boolean, flowing: boolean, t: number): void {
      if (horizontal) {
        px(g, C.pipeOut, x, y - 4, len, 8);
        px(g, C.pipe, x, y - 3, len, 6);
        px(g, C.pipeHi, x, y - 3, len, 1);
        if (hasWater) waterCore(g, x, y - 1, len, 2, flowing, t, true);
      } else {
        px(g, C.pipeOut, x - 4, y, 8, len);
        px(g, C.pipe, x - 3, y, 6, len);
        px(g, C.pipeHi, x - 3, y, 1, len);
        if (hasWater) waterCore(g, x - 1, y, 2, len, flowing, t, false);
      }
    }

    function waterCore(g: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, flowing: boolean, t: number, horizontal: boolean): void {
      px(g, C.water, x, y, w, hh);
      if (!flowing || !motion) return;
      // little highlights running along the pipe
      const phaseOff = Math.floor(t / 60) % 6;
      if (horizontal) for (let i = phaseOff; i < w; i += 6) px(g, C.waterHi, x + i, y, 1, 1);
      else for (let i = phaseOff; i < hh; i += 6) px(g, C.waterHi, x, y + i, 1, 1);
    }

    function drawPiece(g: CanvasRenderingContext2D, openings: number, isWet: boolean, flowing: boolean, t: number): void {
      const half = CELL / 2;
      for (const dir of DIRS) {
        if (!(openings & dir)) continue;
        const [ox, oy, w, hh] = arm(dir, half, 4);
        px(g, C.pipeOut, ox, oy, w, hh);
      }
      for (const dir of DIRS) {
        if (!(openings & dir)) continue;
        const [ox, oy, w, hh] = arm(dir, half, 3);
        px(g, C.pipe, ox, oy, w, hh);
        if (dir === E || dir === W) px(g, C.pipeHi, ox, oy, w, 1);
        else px(g, C.pipeHi, ox, oy, 1, hh);
      }
      px(g, C.pipeLo, -4, -4, 8, 8);
      px(g, C.pipe, -3, -3, 6, 6);
      if (isWet) {
        for (const dir of DIRS) {
          if (!(openings & dir)) continue;
          const [ox, oy, w, hh] = arm(dir, half, 1);
          waterCore(g, ox, oy, w, hh, flowing, t, dir === E || dir === W);
        }
        px(g, C.water, -1, -1, 2, 2);
      }
    }

    function drawRust(g: CanvasRenderingContext2D, cx: number, cy: number): void {
      px(g, C.rustLo, cx - 8, cy - 8, 16, 16);
      px(g, C.rust, cx - 7, cy - 7, 14, 14);
      px(g, C.rustHi, cx - 7, cy - 7, 14, 1);
      px(g, C.rustLo, cx - 7, cy, 14, 1);
      for (const [rx, ry] of [[-5, -5], [4, -5], [-5, 3], [4, 3]] as const) px(g, C.rustHi, cx + rx, cy + ry, 1, 1);
    }

    return () => {
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
