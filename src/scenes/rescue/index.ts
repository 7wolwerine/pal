import { audio } from '../../audio/engine.ts';
import { RESCUE } from '../../content/rescue.ts';
import { ROLES } from '../../content/roles.ts';
import { gendered, type GameScene } from '../../game.ts';
import { PixelStage, px } from '../../pixel/stage.ts';
import { BUG_PX, Beetle } from '../../ui/beetle.ts';
import { prefersReducedMotion, sleep } from '../../ui/dom.ts';
import { Speech } from '../../ui/speech.ts';
import { sprite, type SpriteId } from '../../ui/sprites.ts';
import { DIRS, E, N, S, W, createLayout, isConnected, isPerfect, leaks, rotateCW, rotatePiece, wetPieces, type Dir, type PipeLayout } from './model.ts';

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

const RISE_PER_S = 1 / 15; // ~12 s of air per attempt
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
    void say(ctx.profile.role ? ROLES[ctx.profile.role].rescue : (RESCUE.intro[0] ?? ''));
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
          ctx.witness.tally('pipe-turn');
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

    // BUG, without a word, keeps turning pipes the wrong way. A click shoos him off.
    const beetle = new Beetle();
    stage.el.append(beetle.el);
    const toCss = (x: number, y: number): [number, number] => [
      (x / STAGE_W) * stage.el.clientWidth - BUG_PX / 2,
      (y / STAGE_H) * stage.el.clientHeight - BUG_PX + 6,
    ];
    let shoos = 0;
    beetle.onPoke = () => {
      shoos++;
      beetle.shoo();
    };
    const home = (): [number, number] => toCss(STAGE_W - 8, FLOOR_Y + 8);
    requestAnimationFrame(() => beetle.jump(...home()));
    let alive = true;
    void (async () => {
      await sleep(3000);
      while (alive) {
        await sleep(4500 + Math.random() * 3500);
        if (!alive) return;
        if (phase !== 'play') continue;
        // He goes for a pipe the water already runs through, to undo the progress.
        const movable = layout.pieces.filter((p) => !p.fixed);
        const wetMovable = wet.filter((p) => !p.fixed);
        const pool = wetMovable.length > 1 ? wetMovable.slice(1) : movable;
        const target = pool[Math.floor(Math.random() * pool.length)];
        if (!target) continue;
        const before = shoos;
        beetle.setMood('angry');
        await beetle.moveTo(...toCss(GRID_X + target.col * CELL + CELL / 2, GRID_Y + target.row * CELL + CELL / 2));
        if (!alive) return;
        await beetle.strain(650);
        if (!alive) return;
        if (shoos === before && phase === 'play' && !beetle.away) {
          turn(target.id);
          await beetle.cheer();
        }
        beetle.setMood('stand');
        await beetle.moveTo(...home());
      }
    })();

    function die(): void {
      phase = 'dead';
      deaths++;
      water = 1;
      diedAt = now;
      audio.gurgle(1.2);
      window.setTimeout(() => {
        if (phase === 'dead') void say(RESCUE.died[Math.min(deaths, RESCUE.died.length) - 1]?.(masculine) ?? '');
      }, 1500);
      ctx.witness.record({ scene: SCENE, kind: 'death', data: { deaths } });
      window.setTimeout(() => {
        if (phase !== 'dead') return;
        scramble(layout);
        relabel();
        wet = wetPieces(layout);
        flowFrom = now;
        threatened = false;
        water = 0.18;
        phase = 'play';
        void say(RESCUE.intro[Math.min(deaths, RESCUE.intro.length - 1)] ?? '');
        witnessAttempt();
      }, 4200);
    }

    function win(): void {
      phase = 'won';
      ctx.witness.record({ scene: SCENE, kind: 'saved', trick: 'guilt-trip', data: { deaths } });
      void say(RESCUE.saved(masculine), true).then(() => {
        if (phase === 'won') done();
      });
    }

    stage.run((g, t) => {
      // Real elapsed seconds since the last frame, capped so that tabbing away
      // for a while cannot dump the whole tank at once. Works at any frame rate.
      const dt = lastT ? Math.min(1, (t - lastT) / 1000) : 0;
      lastT = t;
      now = t;

      if (phase === 'play') {
        // After three drownings the water slows down: the point has been made, and nobody should get stuck here.
        water = Math.min(1, water + RISE_PER_S * (deaths >= 3 ? 0.45 : 1) * dt);
        // Every few seconds the assistant panics, or tells the player which pipe to turn.
        if (t - lastLine > 4200 && !threatened) {
          lastLine = t;
          lines++;
          const advice = lines % 2 === 0 ? adviceLine() : undefined;
          void say(advice ?? RESCUE.panic[lines % RESCUE.panic.length] ?? '');
        }
        // The water has to have run all the way through before the tank drains.
        if (isPerfect(layout) && t - flowFrom > wet.length * FLOW_MS) {
          phase = 'draining';
          audio.gurgle(2.4);
        } else if (water >= 1) {
          die();
        } else if (deaths >= 3 && water > 0.7 && !threatened) {
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
      const size = 30;
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
        for (const ex of [ax + 9, ax + 19]) {
          px(g, '#1a0f0c', ex, ay + 11, 1, 1);
          px(g, '#1a0f0c', ex + 2, ay + 11, 1, 1);
          px(g, '#1a0f0c', ex + 1, ay + 12, 1, 1);
          px(g, '#1a0f0c', ex, ay + 13, 1, 1);
          px(g, '#1a0f0c', ex + 2, ay + 13, 1, 1);
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

    /** Which pipe on the way out is still turned wrong, said the way a panicking person would. */
    function adviceLine(): string | undefined {
      const PATH: [string, number][] = [
        ['p03', W | N],
        ['p02', S | E],
        ['p12', W | N],
        ['p11', S | E],
        ['p21', W | E],
        ['p31', W | S],
        ['p32', N | S],
        ['p33', N | S],
      ];
      for (const [id, want] of PATH) {
        const piece = layout.pieces.find((p) => p.id === id);
        if (!piece || piece.openings === want) continue;
        const row = RESCUE.rows[piece.row] ?? '';
        const col = RESCUE.cols[piece.col] ?? '';
        return RESCUE.advise(`${row} ${col}`);
      }
      return undefined;
    }

    return () => {
      alive = false;
      beetle.stop();
      speech.stop();
      stage.stop();
      ctx.scenery.replaceChildren();
    };
  },
};
