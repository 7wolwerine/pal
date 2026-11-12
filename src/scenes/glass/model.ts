/**
 * How the glass moves once it starts to fall, as a pure function of time, so
 * it can be tested. Everything up to the floor is honest physics; then the
 * glass bounces like rubber and rights itself, which no glass ever does.
 */

/** Gravity in picture pixels per ms². */
export const GRAVITY = 0.0004;
export const GLASS_W = 8;
export const GLASS_H = 12;
export const FLOOR_Y = 88;
/** The glass's top-left while it stands on the table. */
export const TABLE_SPOT: readonly [number, number] = [86, 48];
/** The table's right edge. */
export const TABLE_EDGE = 100;

const TIP_MS = 250;
const REST_Y = FLOOR_Y - GLASS_H;
const FALL_MS = Math.sqrt((2 * (REST_Y - TABLE_SPOT[1])) / GRAVITY);
/** When the glass first hits the floor. */
export const IMPACT_MS = TIP_MS + FALL_MS;
/** How high each rubbery bounce goes. */
const BOUNCES = [18, 8, 3];
const SQUASH_MS = 90;

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

const bounceMs = (height: number): number => 2 * Math.sqrt((2 * height) / GRAVITY);
/** When the glass comes to rest for good. */
export const SETTLE_MS = IMPACT_MS + BOUNCES.reduce((sum, b) => sum + bounceMs(b), 0);
/** Every moment the glass touches the floor (and goes boing). */
export const BOUNCE_AT: readonly number[] = BOUNCES.map(
  (_, i) => IMPACT_MS + BOUNCES.slice(0, i).reduce((sum, b) => sum + bounceMs(b), 0),
);

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

export function glassPose(ms: number): GlassPose {
  const startX = TABLE_SPOT[0] + GLASS_W / 2;
  const [, startY] = TABLE_SPOT;
  if (ms <= 0) return { x: startX, y: startY, rot: 0, sx: 1, sy: 1 };
  // Tipping and sliding off the edge.
  if (ms < TIP_MS) {
    const u = ms / TIP_MS;
    return { x: lerp(startX, TABLE_EDGE + 2, u * u), y: startY, rot: 0.5 * u, sx: 1, sy: 1 };
  }
  // Falling, honestly.
  if (ms < IMPACT_MS) {
    const t = ms - TIP_MS;
    const u = t / FALL_MS;
    return { x: lerp(TABLE_EDGE + 2, TABLE_EDGE + 9, u), y: startY + 0.5 * GRAVITY * t * t, rot: lerp(0.5, 1.6, u), sx: 1, sy: 1 };
  }
  // Rubber.
  let t = ms - IMPACT_MS;
  let x = TABLE_EDGE + 9;
  const rots = [1.6, 0.35, -0.12, 0];
  for (let i = 0; i < BOUNCES.length; i++) {
    const height = BOUNCES[i] ?? 0;
    const d = bounceMs(height);
    if (t < d) {
      const v = (GRAVITY * d) / 2;
      const y = REST_Y - (v * t - 0.5 * GRAVITY * t * t);
      const squash = t < SQUASH_MS ? 0.55 + 0.45 * (t / SQUASH_MS) : 1;
      return {
        x: x + (t / d) * 7,
        y: Math.min(REST_Y, y),
        rot: lerp(rots[i] ?? 0, rots[i + 1] ?? 0, t / d),
        sx: 1 / squash,
        sy: squash,
      };
    }
    t -= d;
    x += 7;
  }
  return { x, y: REST_Y, rot: 0, sx: 1, sy: 1 };
}
