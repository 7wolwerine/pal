/**
 * How the glass moves once it starts to fall, as a pure function of time, so
 * it can be tested. Everything up to the floor is honest physics; then the
 * glass bounces like rubber and rights itself, which no glass ever does.
 */

/** Gravity in picture pixels per ms². */
export const GRAVITY = 0.0004;
export const GLASS_W = 8;
export const GLASS_H = 12;
/** Where the table's feet stand: a glass knocked off the table lands on this line. */
export const FLOOR_Y = 64;
/** The glass's top-left while it stands on the table. */
export const TABLE_SPOT: readonly [number, number] = [88, 32];
/** The table's right edge. */
export const TABLE_EDGE = 106;

/** Where a fall starts: the glass's centre and top, the line it lands on, and whether it first tips off an edge. */
export interface DropFrom {
  readonly x: number;
  readonly y: number;
  /** The line the glass's bottom lands on. */
  readonly floor: number;
  /** Tips over the table's edge first (true), or slips straight out of a hand (false). */
  readonly tip: boolean;
}

export const TABLE_DROP: DropFrom = { x: TABLE_SPOT[0] + GLASS_W / 2, y: TABLE_SPOT[1], floor: FLOOR_Y, tip: true };

const TIP_MS = 250;
/** How high each rubbery bounce goes. */
const BOUNCES = [18, 8, 3];
const SQUASH_MS = 90;
/** Sideways drift while falling, and on each bounce. */
const FALL_DRIFT = 7;
const BOUNCE_DRIFT = 7;

export interface GlassPose {
  /** Centre of the glass, in picture pixels. */
  readonly x: number;
  /** Top of the glass when upright. */
  readonly y: number;
  /** Radians, clockwise. */
  readonly rot: number;
  readonly sx: number;
  readonly sy: number;
}

export interface DropTimes {
  /** When the glass first hits the floor. */
  readonly impact: number;
  /** When it comes to rest for good. */
  readonly settle: number;
  /** Every moment it touches the floor (and goes boing). */
  readonly bounceAt: readonly number[];
}

const bounceMs = (height: number): number => 2 * Math.sqrt((2 * height) / GRAVITY);

export function dropTimes(from: DropFrom): DropTimes {
  const fall = Math.sqrt((2 * Math.max(0, from.floor - GLASS_H - from.y)) / GRAVITY);
  const impact = (from.tip ? TIP_MS : 0) + fall;
  const bounceAt = BOUNCES.map((_, i) => impact + BOUNCES.slice(0, i).reduce((sum, b) => sum + bounceMs(b), 0));
  return { impact, settle: impact + BOUNCES.reduce((sum, b) => sum + bounceMs(b), 0), bounceAt };
}

const TABLE_TIMES = dropTimes(TABLE_DROP);
/** When a glass knocked off the table first hits the floor. */
export const IMPACT_MS = TABLE_TIMES.impact;
export const SETTLE_MS = TABLE_TIMES.settle;
export const BOUNCE_AT = TABLE_TIMES.bounceAt;

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

export function glassPose(ms: number, from: DropFrom = TABLE_DROP): GlassPose {
  const rest = from.floor - GLASS_H;
  if (ms <= 0) return { x: from.x, y: from.y, rot: 0, sx: 1, sy: 1 };
  const tip = from.tip ? TIP_MS : 0;
  // Tipping and sliding off the edge.
  const edgeX = from.tip ? Math.max(from.x, TABLE_EDGE + 2) : from.x;
  if (ms < tip) {
    const u = ms / tip;
    return { x: lerp(from.x, edgeX, u * u), y: from.y, rot: 0.5 * u, sx: 1, sy: 1 };
  }
  const { impact } = dropTimes(from);
  const startRot = from.tip ? 0.5 : 0;
  // Falling, honestly.
  if (ms < impact) {
    const t = ms - tip;
    const u = t / Math.max(1, impact - tip);
    return { x: lerp(edgeX, edgeX + FALL_DRIFT, u), y: from.y + 0.5 * GRAVITY * t * t, rot: lerp(startRot, 1.6, u), sx: 1, sy: 1 };
  }
  // Rubber.
  let t = ms - impact;
  let x = edgeX + FALL_DRIFT;
  const rots = [1.6, 0.35, -0.12, 0];
  for (let i = 0; i < BOUNCES.length; i++) {
    const height = BOUNCES[i] ?? 0;
    const d = bounceMs(height);
    if (t < d) {
      const v = (GRAVITY * d) / 2;
      const y = rest - (v * t - 0.5 * GRAVITY * t * t);
      const squash = t < SQUASH_MS ? 0.55 + 0.45 * (t / SQUASH_MS) : 1;
      return {
        x: x + (t / d) * BOUNCE_DRIFT,
        y: Math.min(rest, y),
        rot: lerp(rots[i] ?? 0, rots[i + 1] ?? 0, t / d),
        sx: 1 / squash,
        sy: squash,
      };
    }
    t -= d;
    x += BOUNCE_DRIFT;
  }
  return { x, y: rest, rot: 0, sx: 1, sy: 1 };
}
