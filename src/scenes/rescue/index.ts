import { audio } from '../../audio/engine.ts';
import { RESCUE } from '../../content/rescue.ts';
import { ROLES } from '../../content/roles.ts';
import { gendered, strongestRole, type GameScene } from '../../game.ts';
import { PixelStage, px } from '../../pixel/stage.ts';
import { prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { Speech } from '../../ui/speech.ts';
import { sprite, type SpriteId } from '../../ui/sprites.ts';
import { isUpright } from '../../ui/upright.ts';
import { DIRS, E, MERCY_AFTER, N, S, START_LEVEL, W, createLayout, isConnected, isPerfect, leaks, rise, rotateCW, rotatePiece, wetPieces, type Dir, type PipeLayout } from './model.ts';

const SCENE = 'rescue';

/**
 * Where everything goes, in picture pixels. On a wide screen the tank stands on the left and the
 * grid of pipes beside it. On a phone held upright the picture is tall instead: the tank on top,
 * the grid under it across the whole width, so each pipe comes out about twice as big to tap.
 * Picked once, when the scene starts.
 */
interface Geometry {
  readonly STAGE_W: number;
  readonly STAGE_H: number;
  readonly CELL: number;
  readonly GRID_X: number;
  readonly GRID_Y: number;
  readonly FLOOR_Y: number;
  readonly TANK: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly upright: boolean;
}

const WIDE: Geometry = { STAGE_W: 164, STAGE_H: 104, CELL: 20, GRID_X: 72, GRID_Y: 12, FLOOR_Y: 92, TANK: { x: 6, y: 16, w: 54, h: 76 }, upright: false };
const UPRIGHT: Geometry = { STAGE_W: 96, STAGE_H: 204, CELL: 20, GRID_X: 8, GRID_Y: 110, FLOOR_Y: 196, TANK: { x: 20, y: 12, w: 56, h: 88 }, upright: true };

function geometry(): Geometry {
  return isUpright() ? UPRIGHT : WIDE;
}

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
  pipeHi: '#e4eaef',
  pipeMid: '#c6ced6',
  pipeLo: '#808b97',
  pipeDark: '#5d6773',
  pipeOut: '#3b4552',
  rust: '#8a5a3a',
  rustHi: '#b07a52',
  rustLo: '#5e3b25',
  socket: '#26344a',
  cell: '#1b2a40',
  cellLo: '#17243a',
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
    const { STAGE_W, STAGE_H, CELL, GRID_X, GRID_Y, FLOOR_Y, TANK, upright } = geometry();
    const TAP_X = TANK.x + 14;
    /** The tank's outlet pipe comes into the grid from the left at this height. */
    const OUTLET_Y = GRID_Y + 3 * CELL + CELL / 2;
    const DRAIN_X = GRID_X + 3 * CELL + CELL / 2;
    /** Upright: the outlet leaves the tank low on its left wall, runs down the left edge, then into the grid. */
    const DOWN_X = 5;
    const EXIT_Y = TANK.y + TANK.h - 5;
    const stage = new PixelStage(STAGE_W, STAGE_H, RESCUE.sceneLabel);
    ctx.scenery.replaceChildren(stage.el);
    const speech = new Speech(stage.el, STAGE_W, STAGE_H);
    const masculine = gendered(ctx.profile, 'm', 'f') === 'm';
    /** Where the assistant's head is, so its words hang right by it. */
    let face = { x: TANK.x + TANK.w / 2, y: TANK.y + 40 };
    const say = (text: string, tap = false): Promise<void> => speech.say(text, () => face, { who: 'pal', tap });
    let lastLine = 0;
    let lines = 0;
    let diedAt = 0;

    const look: SpriteId = ctx.profile.assistantLook ?? 'pal';
    const avatar = sprite(look);
    const layout = createLayout();
    scramble(layout);

    type Phase = 'play' | 'draining' | 'dead' | 'won';
    let phase: Phase = 'play';
    // Turns false when the scene is left, so nothing it started carries on (or writes to the witness) afterwards.
    let alive = true;
    let water = START_LEVEL;
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
    // Which plea comes depends on where the player leans by now, not only on the answer they gave
    // at the start; a tie goes to that first answer.
    void say(ctx.profile.role ? ROLES[strongestRole(ctx.profile)].rescue : (RESCUE.intro[0] ?? ''));
    witnessAttempt();

    function witnessAttempt(): void {
      ctx.witness.record({ scene: SCENE, kind: 'attempt', trick: 'guilt-trip', data: { deaths } });
    }

    // One clickable hotspot per pipe that turns.
    const pipeSpots = new Map<string, HTMLButtonElement>();
    /** Says which way each pipe is open, for players who cannot see the picture. */
    const relabel = (): void => {
      for (const piece of layout.pieces) {
        const spot = pipeSpots.get(piece.id);
        if (!spot) continue;
        const open = ([[N, RESCUE.sides.n], [E, RESCUE.sides.e], [S, RESCUE.sides.s], [W, RESCUE.sides.w]] as const)
          .filter(([dir]) => piece.openings & dir)
          .map(([, name]) => name)
          .join(', ');
        spot.setAttribute('aria-label', RESCUE.pipeLabel(layout.pieces.indexOf(piece) + 1, open));
      }
    };
    for (const piece of layout.pieces) {
      if (piece.fixed) continue;
      const spot = stage.hotspot(
        { x: GRID_X + piece.col * CELL, y: GRID_Y + piece.row * CELL, w: CELL, h: CELL },
        '',
        () => {
          if (phase !== 'play') return;
          turn(piece.id);
        },
      );
      pipeSpots.set(piece.id, spot);
    }
    relabel();

    function turn(id: string): void {
      const piece = layout.pieces.find((p) => p.id === id);
      if (!piece || !rotatePiece(layout, id)) return;
      turnedAt.set(id, now);
      relabel();
      audio.click(64 + ((piece.col + piece.row) % 4) * 2, 0.45);
      const before = wet.length;
      wet = wetPieces(layout);
      flowFrom = now;
      if (wet.length > before) audio.click(84, 0.25);
    }


    function die(): void {
      phase = 'dead';
      deaths++;
      water = 1;
      diedAt = now;
      audio.gurgle(1.2);
      ctx.witness.record({ scene: SCENE, kind: 'death', data: { deaths } });
      void (async () => {
        await sleep(1500);
        if (!alive || phase !== 'dead') return;
        const line = RESCUE.died[Math.min(deaths, RESCUE.died.length) - 1]?.(masculine) ?? '';
        await say(line);
        // Time to read it before the water comes back.
        await sleep(1400 + line.length * 35);
        if (!alive || phase !== 'dead') return;
        scramble(layout);
        relabel();
        wet = wetPieces(layout);
        flowFrom = now;
        threatened = false;
        water = START_LEVEL;
        phase = 'play';
        void say(RESCUE.intro[Math.min(deaths, RESCUE.intro.length - 1)] ?? '');
        witnessAttempt();
      })();
    }

    function win(): void {
      phase = 'won';
      ctx.witness.record({ scene: SCENE, kind: 'saved', trick: 'guilt-trip', data: { deaths } });
      void (async () => {
        const lines = RESCUE.saved(masculine);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] ?? '';
          const last = i === lines.length - 1;
          await say(line, last);
          if (!alive || phase !== 'won') return;
          if (!last) await sleep(1200 + line.length * 30);
        }
        if (alive && phase === 'won') done();
      })();
    }

    stage.run((g, t) => {
      // Real elapsed seconds since the last frame, capped so that tabbing away
      // for a while cannot dump the whole tank at once. Works at any frame rate.
      const dt = lastT ? Math.min(1, (t - lastT) / 1000) : 0;
      lastT = t;
      now = t;

      if (phase === 'play') {
        water = rise(water, deaths, dt);
        // Every few seconds the assistant panics, or tells the player which pipe to turn.
        if (t - lastLine > 4200 && !threatened) {
          lastLine = t;
          lines++;
          const pool = look in RESCUE.drama ? RESCUE.drama[look as keyof typeof RESCUE.drama] : RESCUE.panic;
          void say(pool[lines % pool.length] ?? '');
        }
        // The water has to have run all the way through before the tank drains.
        if (isPerfect(layout) && t - flowFrom > wet.length * FLOW_MS) {
          phase = 'draining';
          audio.gurgle(2.4);
        } else if (water >= 1) {
          die();
        } else if (deaths >= MERCY_AFTER && water > 0.7 && !threatened) {
          threatened = true;
          void say(RESCUE.threat);
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
      const size = 26;
      const ax = TANK.x + TANK.w / 2 - size / 2 + 4;
      const sink = phase === 'dead' ? Math.min(1, (t - diedAt) / 1400) : 0;
      const floatY = Math.max(TANK.y + 1, Math.min(TANK.y + TANK.h - size, surface - size + 10));
      const ay = Math.round(floatY + (TANK.y + TANK.h - size - floatY) * sink) + (sink > 0 ? 0 : bob);
      face = { x: ax + size / 2, y: ay };
      if (sink > 0) g.globalAlpha = 1 - sink * 0.55;
      g.drawImage(avatar, ax + (sink > 0 && sink < 1 && motion ? Math.round(Math.sin(t / 60)) : 0), ay, size, size);
      g.globalAlpha = 1;
      if (sink >= 1) {
        // two little crosses for eyes
        const eyeY = ay + Math.round(size * 0.37);
        for (const ex of [ax + Math.round(size * 0.3), ax + Math.round(size * 0.63)]) {
          px(g, '#1a0f0c', ex, eyeY, 1, 1);
          px(g, '#1a0f0c', ex + 2, eyeY, 1, 1);
          px(g, '#1a0f0c', ex + 1, eyeY + 1, 1, 1);
          px(g, '#1a0f0c', ex, eyeY + 2, 1, 1);
          px(g, '#1a0f0c', ex + 2, eyeY + 2, 1, 1);
        }
      }
      if (panic) {
        px(g, C.danger, ax - 3, ay + 2, 2, 5);
        px(g, C.danger, ax + size + 1, ay + 3, 2, 5);
      }
      if (phase === 'dead' && motion) {
        if (bubbles.length < 16 && Math.random() < 0.4) bubbles.push({ x: ax + 6 + Math.random() * 18, y: ay + 8, born: t });
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
      if (upright) {
        const outWet = level > TANK.y + TANK.h - EXIT_Y - 3;
        drawRun(g, DOWN_X - 4, EXIT_Y, TANK.x - 2 - (DOWN_X - 4), true, outWet, flowing, t);
        drawRun(g, DOWN_X, EXIT_Y - 4, OUTLET_Y + 4 - (EXIT_Y - 4), false, outWet, flowing, t);
        drawRun(g, DOWN_X - 4, OUTLET_Y, GRID_X - (DOWN_X - 4), true, outWet, flowing, t);
        px(g, C.rust, TANK.x - 6, EXIT_Y - 5, 3, 10); // flange
      } else {
        drawRun(g, TANK.x + TANK.w + 2, OUTLET_Y, GRID_X - (TANK.x + TANK.w + 2), true, level > TANK.y + TANK.h - OUTLET_Y - 3, flowing, t);
        px(g, C.rust, TANK.x + TANK.w + 3, OUTLET_Y - 5, 3, 10); // flange
      }

      // The grid of pipes, sunk into the wall behind a frame.
      px(g, C.socket, GRID_X - 2, GRID_Y - 2, 4 * CELL + 4, 4 * CELL + 4);
      px(g, C.grate, GRID_X - 1, GRID_Y - 1, 4 * CELL + 2, 1);
      px(g, C.grate, GRID_X - 1, GRID_Y - 1, 1, 4 * CELL + 2);
      const wetAt = new Map(wet.map((p, i) => [p.id, i] as const));
      for (const piece of layout.pieces) {
        const cx = GRID_X + piece.col * CELL + CELL / 2;
        const cy = GRID_Y + piece.row * CELL + CELL / 2;
        const back = (piece.col + piece.row) % 2 ? C.cell : C.cellLo;
        px(g, back, cx - CELL / 2, cy - CELL / 2, CELL, CELL);
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
        drawPiece(g, piece.openings, isWet, flowing, t, back);
        g.restore();
      }

      // Water spraying out of every open end it reaches.
      if (phase === 'play' && motion) {
        for (const leak of leaks(layout)) {
          const order = wetAt.get(layout.pieces.find((p) => p.col === leak.col && p.row === leak.row)?.id ?? '');
          if (order === undefined || t - flowFrom < order * FLOW_MS) continue;
          const cx = GRID_X + leak.col * CELL + CELL / 2;
          const cy = GRID_Y + leak.row * CELL + CELL / 2;
          const [dx, dy] = leak.side === N ? [0, -1] : leak.side === S ? [0, 1] : leak.side === E ? [1, 0] : [-1, 0];
          for (let i = 0; i < 5; i++) {
            const k = ((t / 40 + i * 7) % 12) + 9;
            const spread = ((i * 5) % 5) - 2;
            px(g, i % 2 ? C.waterHi : C.water, cx + dx * k + (dy ? spread : 0), cy + dy * k + (dx ? spread : 0), 1, 1);
          }
        }
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

    /**
     * A length of pipe, horizontal or vertical, with water inside when it carries any. It is
     * shaded like a tube: a bright line along the top (or the left), the body, then a dark line
     * along the bottom (or the right), inside a dark outline.
     */
    function drawRun(g: CanvasRenderingContext2D, x: number, y: number, len: number, horizontal: boolean, hasWater: boolean, flowing: boolean, t: number): void {
      if (horizontal) {
        tube(g, x, y - 4, len, true);
        if (hasWater) waterCore(g, x, y - 1, len, 2, flowing, t, true);
      } else {
        tube(g, x - 4, y, len, false);
        if (hasWater) waterCore(g, x - 1, y, 2, len, flowing, t, false);
      }
    }

    /**
     * Eight pixels of tube across, shaded like something round: the light falls on the top (or
     * the left), and it darkens all the way to the far side. `x`,`y` is the near corner, `len`
     * how far the tube runs.
     */
    const SKIN = [C.pipeOut, C.pipeHi, C.pipeMid, C.pipe, C.pipe, C.pipeLo, C.pipeDark, C.pipeOut] as const;

    function tube(g: CanvasRenderingContext2D, x: number, y: number, len: number, horizontal: boolean): void {
      if (len <= 0) return;
      for (let i = 0; i < SKIN.length; i++) {
        const colour = SKIN[i] ?? C.pipe;
        if (horizontal) px(g, colour, x, y + i, len, 1);
        else px(g, colour, x + i, y, 1, len);
      }
    }

    /**
     * The dark seam at the outer end of an arm, where one length of pipe is joined to the next.
     * Two neighbours put one each side of the cell edge, so a row of cells reads as pipework
     * bolted together rather than as one long grey ribbon.
     */
    function drawSeam(g: CanvasRenderingContext2D, dir: Dir, half: number): void {
      if (dir === E || dir === W) px(g, C.pipeDark, dir === E ? half - 1 : -half, -3, 1, 6);
      else px(g, C.pipeDark, -3, dir === S ? half - 1 : -half, 6, 1);
    }

    function waterCore(g: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, flowing: boolean, t: number, horizontal: boolean): void {
      px(g, C.water, x, y, w, hh);
      if (!flowing || !motion) return;
      // little highlights running along the pipe
      const phaseOff = Math.floor(t / 60) % 6;
      if (horizontal) for (let i = phaseOff; i < w; i += 6) px(g, C.waterHi, x + i, y, 1, 1);
      else for (let i = phaseOff; i < hh; i += 6) px(g, C.waterHi, x, y + i, 1, 1);
    }

    /**
     * One turnable piece, drawn around its own centre. Each arm is a shaded tube ending in a
     * collar at the edge of the cell, so neighbouring pieces meet collar to collar; the middle
     * is a bend with its corners cut away, so an elbow looks turned rather than snapped.
     */
    function drawPiece(g: CanvasRenderingContext2D, openings: number, isWet: boolean, flowing: boolean, t: number, back: string): void {
      const half = CELL / 2;
      const across = Boolean(openings & (E | W));
      const straight = openings === (E | W) || openings === (N | S);
      if (straight) {
        // One unbroken length of pipe from edge to edge: nothing in the middle to break it up.
        if (across) tube(g, -half, -4, CELL, true);
        else tube(g, -4, -half, CELL, false);
      } else {
        for (const dir of DIRS) {
          if (!(openings & dir)) continue;
          const [ox, oy, w, hh] = arm(dir, half, 4);
          tube(g, ox, oy, dir === E || dir === W ? w : hh, dir === E || dir === W);
        }
        // The bend in the middle, shaded the same way as the arm that leaves it, so the light
        // runs on along the top of the pipe. Its corners are cut away: a turned elbow should not
        // look snapped off square.
        tube(g, -4, -4, 8, across);
        for (const [bx, by] of [[-4, -4], [3, -4], [-4, 3], [3, 3]] as const) px(g, back, bx, by, 1, 1);
      }
      for (const dir of DIRS) {
        if (!(openings & dir)) continue;
        drawSeam(g, dir, half);
      }
      if (isWet) {
        for (const dir of DIRS) {
          if (!(openings & dir)) continue;
          const [ox, oy, w, hh] = arm(dir, half, 1);
          waterCore(g, ox, oy, w, hh, flowing, t, dir === E || dir === W);
        }
        px(g, C.water, -1, -1, 2, 2);
      }
    }

    /**
     * A cell no pipe will ever cross: the cellar wall itself, bricked up where a pipe used to
     * run, with the rusted stub of the old one still bolted to it. Wall, so that nobody waits
     * for it to turn.
     */
    function drawRust(g: CanvasRenderingContext2D, cx: number, cy: number): void {
      const x = cx - CELL / 2;
      const y = cy - CELL / 2;
      px(g, C.brick, x, y, CELL, CELL);
      // Courses of brick, offset row by row.
      for (let row = 0; row < CELL; row += 5) {
        px(g, C.roomLo, x, y + row, CELL, 1);
        const joint = row % 10 === 0 ? 5 : 12;
        px(g, C.roomLo, x + joint, y + row, 1, 5);
      }
      // Shut in on every side, so it reads as a hole in the wall that was filled, not as a gap.
      px(g, C.socket, x, y, CELL, 1);
      px(g, C.socket, x, y, 1, CELL);
      px(g, C.socket, x, y + CELL - 1, CELL, 1);
      px(g, C.socket, x + CELL - 1, y, 1, CELL);
      // A rust stain weeping down the bricks where a pipe used to come through.
      px(g, C.rustLo, x + 7, y + 7, 1, 5);
      px(g, C.rust, x + 11, y + 5, 1, 4);
      px(g, C.rustLo, x + 13, y + 10, 1, 3);
    }

    /** Which pipe on the way out is still turned wrong, said the way a panicking person would. */

    return () => {
      alive = false;
      speech.stop();
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
