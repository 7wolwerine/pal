/**
 * The conversation around the surprise on the drive, as a state machine with
 * no DOM in it.
 *
 * A refusal is never simply accepted: it leads to a sad face and an
 * invitation to try again. Only after three refusals does a quiet way out
 * appear, so a player with good instincts is not stuck.
 *
 * On a computer agreeing means printing: the browser's own print dialog, then
 * the question whether the paper came out. "Nothing came out" is not taken for
 * an answer either: every time it is said the push gets a little harder, and
 * only from the second time on is there a quiet way round the printer (the
 * code shown on the screen instead). A phone or a tablet has neither a printer
 * nor a second screen, so there the surprise is just a picture.
 */

export type SurpriseState = 'ask' | 'sad' | 'printing' | 'check' | 'push' | 'screen' | 'picture' | 'done';

export type SurpriseAction =
  | 'ok'
  | 'cancel'
  | 'again'
  | 'later'
  /** The print dialog has closed (whatever was chosen in it: a page cannot tell). */
  | 'printed'
  | 'in-hand'
  | 'not-in-hand'
  | 'reprint'
  | 'on-screen'
  | 'seen';

export const REFUSALS_BEFORE_WAY_OUT = 3;
/** How many times "nothing came out" must be said before the screen is offered instead. */
export const MISSES_BEFORE_SCREEN = 2;

export class SurpriseFlow {
  readonly handheld: boolean;
  #state: SurpriseState = 'ask';
  #refusals = 0;
  #opened = false;
  #prints = 0;
  #notInHand = 0;
  #onPaper = false;

  constructor(options: { readonly handheld?: boolean } = {}) {
    this.handheld = options.handheld === true;
  }

  get state(): SurpriseState {
    return this.#state;
  }

  /** How many times the player said no to opening it. */
  get refusals(): number {
    return this.#refusals;
  }

  /** Whether the player opened what was on the drive. */
  get opened(): boolean {
    return this.#opened;
  }

  /** How many times the print dialog was opened. */
  get prints(): number {
    return this.#prints;
  }

  /** How many times the player said the paper is not in their hand. */
  get notInHand(): number {
    return this.#notInHand;
  }

  /** Whether the player says they hold the printed sheet. */
  get onPaper(): boolean {
    return this.#onPaper;
  }

  /** Whether "not now" is on offer yet. */
  get wayOut(): boolean {
    return this.#refusals >= REFUSALS_BEFORE_WAY_OUT;
  }

  /** Whether the quiet way round the printer is on offer yet. */
  get screenOffered(): boolean {
    return this.#notInHand >= MISSES_BEFORE_SCREEN;
  }

  /** Applies an action and returns the new state. Throws when the action is not possible now. */
  dispatch(action: SurpriseAction): SurpriseState {
    const next = this.#next(action);
    if (!next) throw new Error(`Cannot "${action}" while "${this.#state}".`);
    if (action === 'cancel') this.#refusals++;
    if (action === 'ok') this.#opened = true;
    if (action === 'not-in-hand') this.#notInHand++;
    if (action === 'in-hand') this.#onPaper = true;
    if (next === 'printing') this.#prints++;
    this.#state = next;
    return next;
  }

  #next(action: SurpriseAction): SurpriseState | undefined {
    switch (this.#state) {
      case 'ask':
        if (action === 'ok') return this.handheld ? 'picture' : 'printing';
        return action === 'cancel' ? 'sad' : undefined;
      case 'sad':
        if (action === 'again') return 'ask';
        return action === 'later' && this.wayOut ? 'done' : undefined;
      case 'printing':
        return action === 'printed' ? 'check' : undefined;
      case 'check':
        if (action === 'in-hand') return 'done';
        return action === 'not-in-hand' ? 'push' : undefined;
      case 'push':
        if (action === 'reprint') return 'printing';
        return action === 'on-screen' && this.screenOffered ? 'screen' : undefined;
      case 'screen':
      case 'picture':
        return action === 'seen' ? 'done' : undefined;
      case 'done':
        return undefined;
    }
  }
}

/** A tune as MIDI notes, played in a loop. */
export type Tune = readonly number[];

/** Steps through a tune one note per call, round and round. */
export class TunePlayer {
  readonly #tune: Tune;
  #at = 0;

  constructor(tune: Tune) {
    this.#tune = tune;
  }

  /** How many notes have been played so far. */
  get played(): number {
    return this.#at;
  }

  next(): number {
    const note = this.#tune[this.#at % this.#tune.length] ?? 72;
    this.#at++;
    return note;
  }
}

/**
 * BUG's attempt to haul the drive off: a little bookkeeping of how far it has
 * got. He pulls it in short tugs towards the edge and never gets it out: past
 * `limit` every tug only stretches and springs back.
 */
export class Heist {
  readonly from: number;
  readonly limit: number;
  readonly tug: number;
  #x: number;
  #tugs = 0;

  constructor(from: number, limit: number, tug: number) {
    this.from = from;
    this.limit = Math.max(from, limit);
    this.tug = tug;
    this.#x = from;
  }

  /** Where the drive's left edge rests now. */
  get x(): number {
    return this.#x;
  }

  get tugs(): number {
    return this.#tugs;
  }

  /** True once he cannot get it any further. */
  get stuck(): boolean {
    return this.#x >= this.limit;
  }

  /** One tug: returns where the drive ends up (the same place once he is stuck). */
  pull(): number {
    this.#tugs++;
    this.#x = Math.min(this.limit, this.#x + this.tug);
    return this.#x;
  }
}
