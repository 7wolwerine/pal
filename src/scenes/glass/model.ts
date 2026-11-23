/**
 * How the glass moves once it starts to fall, as a pure function of time, so
 * it can be tested. Everything up to the floor is honest physics; then the
 * glass bounces like rubber and rights itself, which no glass ever does.
 */

/** Gravity in picture pixels per ms². */
export const GRAVITY = 0.0004;
/** A glass the size of a glass next to the character (26 pixels tall), not of a vase. */
export const GLASS_W = 5;
export const GLASS_H = 8;
/** The glass's top-left while it stands on the table. */
export const TABLE_SPOT: readonly [number, number] = [82, 31];
/** Where a fall starts: the glass's centre and top, and the line it lands on. */
export interface DropFrom {
  readonly x: number;
  readonly y: number;
  /** The line the glass's bottom lands on. */
  readonly floor: number;
}

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
  const impact = fall;
  const bounceAt = BOUNCES.map((_, i) => impact + BOUNCES.slice(0, i).reduce((sum, b) => sum + bounceMs(b), 0));
  return { impact, settle: impact + BOUNCES.reduce((sum, b) => sum + bounceMs(b), 0), bounceAt };
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

export function glassPose(ms: number, from: DropFrom): GlassPose {
  const rest = from.floor - GLASS_H;
  if (ms <= 0) return { x: from.x, y: from.y, rot: 0, sx: 1, sy: 1 };
  const { impact } = dropTimes(from);
  // Falling, honestly.
  if (ms < impact) {
    const u = ms / Math.max(1, impact);
    return { x: lerp(from.x, from.x + FALL_DRIFT, u), y: from.y + 0.5 * GRAVITY * ms * ms, rot: lerp(0, 1.6, u), sx: 1, sy: 1 };
  }
  // Rubber.
  let t = ms - impact;
  let x = from.x + FALL_DRIFT;
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
