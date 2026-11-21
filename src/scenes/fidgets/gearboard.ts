import { audio } from '../../audio/engine.ts';
import { prefersReducedMotion } from '../../ui/dom.ts';
import {
  BOARD,
  BOX,
  DRIVE_SPEED,
  GEARS,
  type GearSpec,
  gearPath,
  outerRadius,
  pitchRadius,
  trainAngles,
  turning,
  wrap,
  nextToPlace,
} from './gears.ts';

const NS = 'http://www.w3.org/2000/svg';
/** How far inside the pitch circle the stamped rim is drawn. */
const MODULE_RIM = 3.8;
/** How long a cog takes to fly from the box onto its peg, ms. */
const FLY_MS = 460;
/** How far (px) a press has to travel before it counts as a drag rather than a click. */
const DRAG_START = 5;

export interface GearBoard {
  readonly el: SVGSVGElement;
  /** True once every cog is on its peg. */
  readonly complete: boolean;
  stop(): void;
}

interface Cog {
  readonly spec: GearSpec;
  readonly period: number;
  readonly g: SVGGElement;
  readonly shadow: SVGGElement;
  readonly ghost?: SVGGElement;
  placed: boolean;
  x: number;
  y: number;
  angle: number;
  /** Left over from seating into the mesh; fades to nothing. */
  offset: number;
  fly?: { fromX: number; fromY: number; fromAngle: number; shift: number; start: number; back: boolean };
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Draws one cog centred on 0,0: teeth, a hub, and holes that show it turning. */
function cogArt(spec: GearSpec, shade = false): SVGGElement {
  const g = svg('g');
  const rp = pitchRadius(spec.teeth);
  if (shade) {
    g.append(svg('path', { d: gearPath(spec.teeth), fill: 'rgba(75, 21, 40, 0.16)' }));
    return g;
  }
  g.append(svg('path', { d: gearPath(spec.teeth), fill: spec.color, stroke: 'rgba(75, 21, 40, 0.45)', 'stroke-width': 1, 'stroke-linejoin': 'round' }));
  // A slightly darker ring inside the teeth, like a stamped rim.
  g.append(svg('circle', { r: (rp - MODULE_RIM).toFixed(2), fill: 'none', stroke: 'rgba(75, 21, 40, 0.14)', 'stroke-width': 1.4 }));
  if (rp >= 19) {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      g.append(svg('circle', { cx: (Math.cos(a) * rp * 0.52).toFixed(2), cy: (Math.sin(a) * rp * 0.52).toFixed(2), r: (rp * 0.17).toFixed(2), fill: 'var(--gear-hole)', stroke: 'rgba(75, 21, 40, 0.3)', 'stroke-width': 0.8 }));
    }
  } else {
    g.append(svg('circle', { cx: (rp * 0.5).toFixed(2), cy: 0, r: 1.6, fill: 'rgba(75, 21, 40, 0.35)' }));
  }
  g.append(svg('circle', { r: Math.max(3.4, rp * 0.26).toFixed(2), fill: '#fffaf3', stroke: 'rgba(75, 21, 40, 0.35)', 'stroke-width': 0.8 }));
  g.append(svg('circle', { r: 1.7, fill: '#6b5a66' }));
  return g;
}


const ease = (t: number): number => 1 - (1 - t) ** 3;

/**
 * The board below the panel: the motor's cog turning on the left, empty pegs
 * marked with the outline of the cog that belongs there, and the loose cogs in
 * a box. Click a cog (or drag it) and it goes onto its peg; once the chain from
 * the motor reaches it, its teeth bite and it turns.
 */
export function gearBoard(label: string, cogLabel: string, onPlace: (id: string, all: boolean) => void): GearBoard {
  const motion = !prefersReducedMotion();
  const el = svg('svg', { class: 'gears', viewBox: `0 0 ${BOARD.width} ${BOARD.height}`, role: 'group', 'aria-label': label });
  const pegs = svg('g');
  const shadows = svg('g');
  const cogsLayer = svg('g');

  // The box the loose cogs lie in, and its front lip, drawn over them.
  const box = svg('rect', { x: BOX.x, y: BOX.y, width: BOX.width, height: BOX.height, rx: 7, class: 'gears__box' });
  const lip = svg('rect', { x: BOX.x, y: BOX.y + BOX.height - 11, width: BOX.width, height: 11, rx: 4, class: 'gears__lip' });

  // The little motor that drives the first cog, with a light that blinks while it runs.
  const motor = GEARS[0];
  const housing = svg('g', { class: 'gears__motor' });
  if (motor) {
    housing.append(
      svg('rect', { x: motor.x - 17, y: motor.y + 6, width: 34, height: 20, rx: 4, class: 'gears__housing' }),
      svg('circle', { cx: motor.x + 11, cy: motor.y + 19, r: 2.2, class: 'gears__led' }),
    );
  }

  const cogs: Cog[] = GEARS.map((spec, i) => {
    const shadow = svg('g', { 'aria-hidden': 'true' });
    shadow.append(cogArt(spec, true));
    const g = svg('g', { class: i === 0 ? 'gears__cog gears__cog--motor' : 'gears__cog gears__cog--loose' });
    g.append(cogArt(spec));
    let ghost: SVGGElement | undefined;
    if (i > 0) {
      ghost = svg('g', { class: 'gears__peg', transform: `translate(${spec.x} ${spec.y})` });
      ghost.append(
        svg('circle', { r: outerRadius(spec.teeth) - 1, class: 'gears__ghost' }),
        svg('circle', { r: 3, class: 'gears__pin' }),
      );
      pegs.append(ghost);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', cogLabel);
    }
    const at = i === 0 ? spec : (spec.loose ?? spec);
    return { spec, period: (Math.PI * 2) / spec.teeth, g, shadow, ghost, placed: i === 0, x: at.x, y: at.y, angle: 'angle' in at ? at.angle : 0, offset: 0 };
  });
  // Big ones at the bottom of the heap, small ones on top.
  const heapOrder = [...cogs].sort((a, b) => b.spec.teeth - a.spec.teeth);
  for (const cog of heapOrder) {
    shadows.append(cog.shadow);
    cogsLayer.append(cog.g);
  }
  el.append(box, pegs, housing, shadows, cogsLayer, lip);

  const started = performance.now();
  const driveAngle = (now: number): number => (motion ? ((now - started) / 1000) * DRIVE_SPEED : 0);
  const placedFlags = (extra?: number): boolean[] => cogs.map((c, i) => c.placed || i === extra);

  /** Where the meshed train wants cog i right now, if it turns. */
  function wanted(i: number, now: number, assumePlaced = false): number | undefined {
    const turns = turning(placedFlags(assumePlaced ? i : undefined))[i];
    return turns ? trainAngles(driveAngle(now))[i] : undefined;
  }

  function send(cog: Cog, back: boolean): void {
    const i = cogs.indexOf(cog);
    const now = performance.now();
    const target = back ? (cog.spec.loose?.angle ?? cog.angle) : (wanted(i, now, true) ?? cog.angle);
    // Turn the short way round: a cog looks the same one tooth further on.
    const shift = target - cog.angle - wrap(target - cog.angle, cog.period);
    cog.fly = { fromX: cog.x, fromY: cog.y, fromAngle: cog.angle, shift, start: now, back };
    cog.g.classList.add('gears__cog--flying');
    // Lift it to the top while it travels.
    cogsLayer.append(cog.g);
    shadows.append(cog.shadow);
  }

  function land(cog: Cog): void {
    const now = performance.now();
    const before = turning(placedFlags());
    cog.placed = true;
    cog.g.classList.remove('gears__cog--loose');
    cog.g.removeAttribute('tabindex');
    cog.g.removeAttribute('role');
    cog.ghost?.classList.add('gears__peg--filled');
    const after = turning(placedFlags());
    const ideal = trainAngles(driveAngle(now));
    // Everything that has just started turning seats its teeth from where it was.
    cogs.forEach((c, j) => {
      if (after[j] && !before[j]) c.offset = wrap(c.angle - (ideal[j] ?? 0), c.period);
    });
    const size = cog.spec.teeth;
    audio.snap(90 - size);
    const caught = after.filter(Boolean).length - before.filter(Boolean).length;
    if (caught > 0) {
      window.setTimeout(() => {
        if (el.isConnected) audio.click(70 + caught * 3, 0.3);
      }, 110);
    }
    const all = cogs.every((c) => c.placed);
    if (all) el.classList.add('gears--done');
    onPlace(cog.spec.id, all);
  }

  /** Only in order: a cog goes on its peg once the one before it turns. */
  const inTurn = (cog: Cog): boolean => nextToPlace(placedFlags()) === cogs.indexOf(cog);

  /** Out of turn: a little shake and a boing, and it stays (or rolls back) in the box. */
  function refuse(cog: Cog): void {
    audio.boing(0.3);
    cog.g.classList.remove('gears__cog--nope');
    void cog.g.getBoundingClientRect();
    cog.g.classList.add('gears__cog--nope');
  }

  function place(cog: Cog): void {
    if (cog.placed || (cog.fly && !cog.fly.back)) return;
    if (!inTurn(cog)) {
      refuse(cog);
      return;
    }
    audio.click(64 + (24 - cog.spec.teeth), 0.35);
    send(cog, false);
  }

  // Click, tap, keyboard or drag.
  cogs.forEach((cog, i) => {
    if (i === 0) return;
    let press: { x: number; y: number; dx: number; dy: number; id: number } | undefined;
    let dragging = false;
    const toBoard = (event: PointerEvent): { x: number; y: number } => {
      const m = el.getScreenCTM();
      if (!m) return { x: cog.x, y: cog.y };
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
      return { x: p.x, y: p.y };
    };
    cog.g.addEventListener('pointerdown', (event) => {
      if (cog.placed || cog.fly) return;
      const p = toBoard(event);
      press = { x: event.clientX, y: event.clientY, dx: cog.x - p.x, dy: cog.y - p.y, id: event.pointerId };
      dragging = false;
      cog.g.setPointerCapture(event.pointerId);
    });
    cog.g.addEventListener('pointermove', (event) => {
      if (!press || event.pointerId !== press.id) return;
      if (!dragging && Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_START) return;
      if (!dragging) {
        dragging = true;
        cog.g.classList.add('gears__cog--held');
        // Lift it to the top. Moving it in the DOM drops the pointer capture, so take it again.
        if (cogsLayer.lastChild !== cog.g) cogsLayer.append(cog.g);
        if (shadows.lastChild !== cog.shadow) shadows.append(cog.shadow);
        if (!cog.g.hasPointerCapture(event.pointerId)) cog.g.setPointerCapture(event.pointerId);
      }
      const p = toBoard(event);
      cog.x = Math.max(0, Math.min(BOARD.width, p.x + press.dx));
      cog.y = Math.max(0, Math.min(BOARD.height, p.y + press.dy));
    });
    const release = (event: PointerEvent): void => {
      if (!press || event.pointerId !== press.id) return;
      press = undefined;
      cog.g.classList.remove('gears__cog--held');
      if (!dragging) {
        if (event.type === 'pointerup') place(cog);
        return;
      }
      dragging = false;
      const near = Math.hypot(cog.x - cog.spec.x, cog.y - cog.spec.y);
      if (near < pitchRadius(cog.spec.teeth) * 0.9 && !inTurn(cog)) {
        refuse(cog);
        send(cog, true);
        return;
      }
      if (near < pitchRadius(cog.spec.teeth) * 0.9) {
        audio.click(64 + (24 - cog.spec.teeth), 0.35);
        send(cog, false);
        return;
      }
      // Wrong peg, or dropped anywhere else: it rolls back into the box.
      const wrongPeg = cogs.some((c, j) => j > 0 && c !== cog && !c.placed && Math.hypot(cog.x - c.spec.x, cog.y - c.spec.y) < pitchRadius(c.spec.teeth));
      if (wrongPeg) audio.boing(0.3);
      send(cog, true);
    };
    cog.g.addEventListener('pointerup', release);
    cog.g.addEventListener('pointercancel', release);
    cog.g.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      place(cog);
    });
    // The outline on an empty peg calls its cog over too.
    cog.ghost?.addEventListener('click', () => place(cog));
  });

  let raf = 0;
  const frame = (now: number): void => {
    const turns = turning(placedFlags());
    const ideal = trainAngles(driveAngle(now));
    cogs.forEach((cog, i) => {
      if (cog.fly) {
        const t = Math.min(1, (now - cog.fly.start) / FLY_MS);
        const e = ease(t);
        const tx = cog.fly.back ? (cog.spec.loose?.x ?? cog.spec.x) : cog.spec.x;
        const ty = cog.fly.back ? (cog.spec.loose?.y ?? cog.spec.y) : cog.spec.y;
        const target = (cog.fly.back ? (cog.spec.loose?.angle ?? cog.fly.fromAngle) : (wanted(i, now, true) ?? cog.fly.fromAngle)) - cog.fly.shift;
        cog.x = cog.fly.fromX + (tx - cog.fly.fromX) * e;
        // A little hop on the way.
        cog.y = cog.fly.fromY + (ty - cog.fly.fromY) * e - Math.sin(Math.PI * t) * 10;
        cog.angle = cog.fly.fromAngle + (target - cog.fly.fromAngle) * e;
        if (t >= 1) {
          const back = cog.fly.back;
          cog.fly = undefined;
          cog.g.classList.remove('gears__cog--flying');
          if (!back) land(cog);
        }
      } else if (cog.placed && turns[i]) {
        cog.offset *= 0.82;
        if (Math.abs(cog.offset) < 0.001) cog.offset = 0;
        cog.angle = (ideal[i] ?? 0) + cog.offset;
      }
      const lift = cog.fly || cog.g.classList.contains('gears__cog--held') ? 3.5 : cog.placed ? 1.4 : 2;
      const deg = ((cog.angle * 180) / Math.PI).toFixed(2);
      cog.g.setAttribute('transform', `translate(${cog.x.toFixed(2)} ${cog.y.toFixed(2)}) rotate(${deg})`);
      cog.shadow.setAttribute('transform', `translate(${(cog.x + lift * 0.6).toFixed(2)} ${(cog.y + lift).toFixed(2)}) rotate(${deg})`);
    });
    raf = requestAnimationFrame(frame);
  };
  frame(performance.now());

  return {
    el,
    get complete() {
      return cogs.every((c) => c.placed);
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}
