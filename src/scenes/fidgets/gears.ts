/**
 * The gear train under the fidget panel: a small motor turns the first cog,
 * and four loose cogs of different sizes belong on the pegs after it. Every
 * cog meshes with the one before it, so once the chain from the motor is
 * complete up to a cog, that cog turns: the opposite way to its neighbour, and
 * the slower the bigger it is. Pure geometry, no DOM, so it is testable.
 *
 * Angles are in radians in screen coordinates (y points down), so they can go
 * straight into an SVG `rotate()`. A cog's tooth k points at `angle + 2πk/z`.
 */

/** Size of a tooth: the pitch radius of a cog with z teeth is MODULE * z / 2. */
export const MODULE = 3;
/** The motor's speed, radians per second. */
export const DRIVE_SPEED = 0.9;

export interface GearSpec {
  readonly id: string;
  readonly teeth: number;
  /** Peg position, in board units. */
  readonly x: number;
  readonly y: number;
  /** The cog this one meshes with, towards the motor; none for the motor's own cog. */
  readonly parent?: number;
  /** Where it lies in the box before it is put on its peg. */
  readonly loose?: { readonly x: number; readonly y: number; readonly angle: number };
  readonly color: string;
}

export function pitchRadius(teeth: number): number {
  return (MODULE * teeth) / 2;
}

export function outerRadius(teeth: number): number {
  return pitchRadius(teeth) + MODULE;
}

/** The board the train is drawn on, in board units. */
export const BOARD = { width: 330, height: 84 } as const;
/** The box at the right end where the loose cogs lie. */
export const BOX = { x: 222, y: 6, width: 104, height: 74 } as const;

/** Teeth of each cog in the train, motor first, and the way each one goes off its neighbour. */
const TRAIN: readonly { id: string; teeth: number; dir?: number; color: string }[] = [
  { id: 'motor', teeth: 10, color: '#b9c3d6' },
  { id: 'big', teeth: 18, dir: -0.39, color: '#f4a7c0' },
  { id: 'tiny', teeth: 9, dir: -0.52, color: '#9fdcc8' },
  { id: 'mid', teeth: 14, dir: 0.78, color: '#ffd98a' },
  { id: 'huge', teeth: 22, dir: -0.08, color: '#c9b8f0' },
];

/** Where each loose cog lies in the box, a little heap. */
const HEAP: Record<string, { x: number; y: number; angle: number }> = {
  huge: { x: 278, y: 44, angle: 0.2 },
  big: { x: 252, y: 50, angle: 0.9 },
  mid: { x: 300, y: 56, angle: 0.4 },
  tiny: { x: 262, y: 24, angle: 0.1 },
};

function buildTrain(): GearSpec[] {
  const out: GearSpec[] = [];
  let x = 22;
  let y = 58;
  TRAIN.forEach((g, i) => {
    const prev = TRAIN[i - 1];
    if (prev && g.dir !== undefined) {
      const d = pitchRadius(prev.teeth) + pitchRadius(g.teeth);
      x += d * Math.cos(g.dir);
      y += d * Math.sin(g.dir);
    }
    out.push({
      id: g.id,
      teeth: g.teeth,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      parent: i > 0 ? i - 1 : undefined,
      loose: HEAP[g.id],
      color: g.color,
    });
  });
  return out;
}

export const GEARS: readonly GearSpec[] = buildTrain();

/** Wraps an angle into (-period/2, period/2]. */
export function wrap(angle: number, period: number): number {
  const a = ((angle % period) + period) % period;
  return a > period / 2 ? a - period : a;
}

/**
 * The angle a cog must have to mesh with its parent at `parentAngle`: where
 * the parent has a tooth on the line between them, this one has a gap.
 */
export function meshAngle(parent: GearSpec, parentAngle: number, gear: GearSpec): number {
  const alpha = Math.atan2(gear.y - parent.y, gear.x - parent.x);
  const ratio = parent.teeth / gear.teeth;
  return -ratio * (parentAngle - alpha) + alpha + Math.PI - Math.PI / gear.teeth;
}

/** Which cogs turn: the motor always, every other one once it and all before it are on their pegs. */
export function turning(placed: readonly boolean[]): boolean[] {
  const out: boolean[] = [];
  let chain = true;
  GEARS.forEach((_gear, i) => {
    if (i > 0) chain = chain && Boolean(placed[i]);
    out.push(chain);
  });
  return out;
}

/** Each cog's angle in the meshed train when the motor's cog is at `driveAngle`. */
export function trainAngles(driveAngle: number): number[] {
  const angles: number[] = [];
  for (const gear of GEARS) {
    const parent = gear.parent === undefined ? undefined : GEARS[gear.parent];
    const parentAngle = gear.parent === undefined ? undefined : angles[gear.parent];
    angles.push(parent && parentAngle !== undefined ? meshAngle(parent, parentAngle, gear) : driveAngle);
  }
  return angles;
}

/** Speed of each cog relative to the motor: negative turns the other way. */
export function speedRatio(i: number): number {
  const gear = GEARS[i];
  if (!gear || gear.parent === undefined) return 1;
  const parent = GEARS[gear.parent];
  return parent ? (-parent.teeth / gear.teeth) * speedRatio(gear.parent) : 1;
}

/**
 * An SVG path for a cog with `teeth` teeth centred on 0,0, tooth 0 pointing
 * along +x: trapezoid teeth on a root circle, so neighbours visibly interlock.
 */
export function gearPath(teeth: number): string {
  const rp = pitchRadius(teeth);
  const ra = rp + MODULE * 0.95;
  const rr = rp - MODULE * 1.1;
  const step = (Math.PI * 2) / teeth;
  // Half-widths of a tooth (as angles) at the root and at the tip.
  const root = step * 0.3;
  const tip = step * 0.15;
  const p = (r: number, a: number): string => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let k = 0; k < teeth; k++) {
    const c = k * step;
    d += `${k === 0 ? 'M' : 'L'} ${p(rr, c - step / 2)} `;
    d += `A ${rr.toFixed(2)} ${rr.toFixed(2)} 0 0 1 ${p(rr, c - root)} `;
    d += `L ${p(ra, c - tip)} A ${ra.toFixed(2)} ${ra.toFixed(2)} 0 0 1 ${p(ra, c + tip)} L ${p(rr, c + root)} `;
    d += `A ${rr.toFixed(2)} ${rr.toFixed(2)} 0 0 1 ${p(rr, c + step / 2)} `;
  }
  return `${d}Z`;
}
