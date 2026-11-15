/** Knocks on the glass before it gives way. */
export const KNOCKS_TO_BREAK = 4;

export type FlowerState = 'domed' | 'broken' | 'blooming';
export type KnockResult = 'crack' | 'shatter' | 'none';

/** The flower under glass, as a tiny state machine. Pure, so it can be tested. */
export class FlowerModel {
  #knocks = 0;
  #state: FlowerState = 'domed';

  get state(): FlowerState {
    return this.#state;
  }

  /** Cracks drawn so far (0 until the first knock, then one per knock). */
  get cracks(): number {
    return Math.min(this.#knocks, KNOCKS_TO_BREAK - 1);
  }

  get knocks(): number {
    return this.#knocks;
  }

  knock(): KnockResult {
    if (this.#state !== 'domed') return 'none';
    this.#knocks++;
    if (this.#knocks < KNOCKS_TO_BREAK) return 'crack';
    this.#state = 'broken';
    return 'shatter';
  }

  /** Watering only works once the glass is gone, and only once. */
  water(): boolean {
    if (this.#state !== 'broken') return false;
    this.#state = 'blooming';
    return true;
  }
}

/*
 * Once the glass is gone, nothing keeps the little crawlers out. They come in
 * along the sill from the open window, climb the pot and the stem and settle
 * on the bloom, one after another. Pure functions of time, so they can be tested.
 */

/** How many crawlers come in. */
export const PEST_COUNT = 9;
/** Picture pixels per ms. */
const PEST_SPEED = 0.04;
/** Between one crawler and the next. */
const PEST_GAP_MS = 320;
/** The way in: along the sill, up the side of the pot, over the rim, up the stem. */
export const PEST_PATH: ReadonlyArray<readonly [number, number]> = [
  [-3, 78],
  [71, 78],
  [67, 68],
  [74, 66],
  [80, 66],
  [80, 52],
];
/** Where on the bloom each crawler settles: around the face, on the petals. */
const HEAD: readonly [number, number] = [80, 45];

const SEGMENTS = PEST_PATH.slice(1).map((p, i) => {
  const a = PEST_PATH[i] ?? p;
  return Math.hypot(p[0] - a[0], p[1] - a[1]);
});
const PATH_LEN = SEGMENTS.reduce((sum, d) => sum + d, 0);

function settleSpot(i: number): readonly [number, number] {
  const a = (i / PEST_COUNT) * Math.PI * 2 + 0.4;
  const r = 6 + (i % 3);
  return [HEAD[0] + Math.cos(a) * r, HEAD[1] + Math.sin(a) * r];
}

/** When crawler `i` reaches its spot on the bloom, in ms after they set out. */
export function pestArrives(i: number): number {
  const [sx, sy] = settleSpot(i);
  const last = PEST_PATH[PEST_PATH.length - 1] ?? [0, 0];
  return i * PEST_GAP_MS + (PATH_LEN + Math.hypot(sx - last[0], sy - last[1])) / PEST_SPEED;
}

/** When the last crawler has settled. */
export const PESTS_MS = pestArrives(PEST_COUNT - 1);

export interface PestPose {
  readonly x: number;
  readonly y: number;
  /** Still on its way in (walking), or already on the bloom (nibbling). */
  readonly settled: boolean;
  /** False before it has come in through the window. */
  readonly visible: boolean;
}

export function pestPose(i: number, ms: number): PestPose {
  let d = (ms - i * PEST_GAP_MS) * PEST_SPEED;
  const start = PEST_PATH[0] ?? [0, 0];
  if (d < 0) return { x: start[0], y: start[1], settled: false, visible: false };
  for (let s = 0; s < SEGMENTS.length; s++) {
    const len = SEGMENTS[s] ?? 0;
    const a = PEST_PATH[s] ?? start;
    const b = PEST_PATH[s + 1] ?? a;
    if (d <= len) {
      const u = len ? d / len : 1;
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, settled: false, visible: true };
    }
    d -= len;
  }
  const last = PEST_PATH[PEST_PATH.length - 1] ?? start;
  const [sx, sy] = settleSpot(i);
  const len = Math.hypot(sx - last[0], sy - last[1]);
  if (d < len) {
    const u = d / len;
    return { x: last[0] + (sx - last[0]) * u, y: last[1] + (sy - last[1]) * u, settled: false, visible: true };
  }
  return { x: sx, y: sy, settled: true, visible: true };
}

/** How much of the bloom has been eaten, 0..1: a bit more with every crawler that settles, then slowly on. */
export function chewAt(ms: number): number {
  if (ms <= 0) return 0;
  let settled = 0;
  for (let i = 0; i < PEST_COUNT; i++) if (ms >= pestArrives(i)) settled++;
  const after = Math.max(0, ms - PESTS_MS) / 6000;
  return Math.min(1, (settled / PEST_COUNT) * 0.75 + after * 0.25);
}
