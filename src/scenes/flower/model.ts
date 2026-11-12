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
